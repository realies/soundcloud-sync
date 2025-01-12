import fs from 'node:fs/promises';
import path from 'node:path';
import { ID3Writer } from 'browser-id3-writer';
import sanitiseFilename from '../helpers/sanitise.ts';
import webAgent from './webAgent.ts';
import { UserLike, Callbacks, DownloadResult, Track } from '../types.ts';
import logger from '../helpers/logger.ts';

const getBestTranscoding = (track: Track) =>
  track.media.transcodings.find(
    t =>
      (t.format.protocol === 'progressive' && t.format.mime_type === 'audio/mpeg') ||
      t.format.mime_type === 'audio/mpeg',
  );

export const getTrackTitle = (track: Track) =>
  track?.publisher_metadata?.release_title || track.title;

export const getTrackArtist = (track: Track) => track?.publisher_metadata?.artist || track.artist;

const getArtworkUrl = (url?: string) => url?.replace('large', 't500x500');

// Download a single segment
const downloadSegment = async (url: string): Promise<Uint8Array> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download segment: ${url}`);
  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
};

// Download artwork if available
const downloadArtwork = async (url: string): Promise<ArrayBuffer | null> => {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return response.arrayBuffer();
  } catch {
    return null;
  }
};

const verifyAndUpdateTimestamp = async (
  filePath: string,
  created_at: string,
  track: Track,
  callbacks: Callbacks,
): Promise<boolean> => {
  try {
    const stats = await fs.stat(filePath);
    const likeDate = new Date(created_at);
    const fileDate = stats.mtime;

    if (Math.abs(likeDate.getTime() - fileDate.getTime()) > 1000) {
      // 1 second tolerance
      logger.debug('Updating timestamp', {
        file: path.basename(filePath),
        from: fileDate.toISOString(),
        to: likeDate.toISOString(),
      });
      await fs.utimes(filePath, likeDate, likeDate);
      callbacks.onTimestampUpdate?.(track, fileDate, likeDate);
      return true;
    }
    return false;
  } catch (error) {
    logger.error('Failed to verify/update timestamp', {
      file: path.basename(filePath),
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
};

export default async function getMissingMusic(
  likes: UserLike[],
  folder = './music',
  callbacks: Callbacks = {},
  verifyTimestamps = false,
): Promise<DownloadResult[]> {
  try {
    await fs.access(folder);
  } catch {
    await fs.mkdir(folder);
  }

  const availableMusic = (await fs.readdir(folder)).map(filename => path.parse(filename).name);

  // Handle timestamp verification for existing files first
  if (verifyTimestamps) {
    const existingTracks = likes.filter(({ track }) =>
      availableMusic.includes(sanitiseFilename(track.title)),
    );

    // Just verify timestamps, don't collect results since these aren't downloads
    await Promise.all(
      existingTracks.map(async ({ track, created_at }) => {
        const filePath = path.join(folder, `${sanitiseFilename(track.title)}.mp3`);
        await verifyAndUpdateTimestamp(filePath, created_at, track, callbacks);
      }),
    );
  }

  // Handle missing tracks in parallel
  const missingTracks = likes.filter(
    ({ track }) =>
      !availableMusic.includes(sanitiseFilename(track.title)) &&
      track.media.transcodings.length > 0,
  );

  // Only return download results
  return Promise.all(
    missingTracks.map(async ({ track, created_at }) => {
      callbacks.onDownloadStart?.(track);

      try {
        const transcoding = getBestTranscoding(track);
        if (!transcoding) {
          throw new Error('No suitable audio format found');
        }

        const transcodingResponse = await webAgent(transcoding.url);
        const { url: playlistUrl } = JSON.parse(transcodingResponse as string);

        // Get playlist
        const playlistResponse = await fetch(playlistUrl);
        if (!playlistResponse.ok) throw new Error('Failed to fetch playlist');
        const playlist = await playlistResponse.text();

        // Parse playlist for MP3 segments
        const segments = playlist
          .split('\n')
          .filter(line => line.trim() && !line.startsWith('#'))
          .map(line => new URL(line, playlistUrl).toString());

        if (segments.length === 0) {
          throw new Error('No audio segments found in playlist');
        }

        // Download and concatenate segments
        const chunks = await Promise.all(segments.map(downloadSegment));

        // Combine all chunks
        const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
        const audioBuffer = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
          audioBuffer.set(chunk, offset);
          offset += chunk.length;
        }

        // Add ID3 tags
        const writer = new ID3Writer(audioBuffer);
        writer.setFrame('TIT2', getTrackTitle(track)).setFrame('TPE1', [getTrackArtist(track)]);

        // Add artwork if available
        if (track.artwork_url) {
          const artworkBuffer = await downloadArtwork(getArtworkUrl(track.artwork_url)!);
          if (artworkBuffer) {
            writer.setFrame('APIC', {
              type: 3,
              data: artworkBuffer,
              description: '',
            });
          }
        }

        // Write file with tags
        const filePath = path.join(folder, `${sanitiseFilename(track.title)}.mp3`);
        const taggedBuffer = new Uint8Array(writer.addTag());
        await fs.writeFile(filePath, taggedBuffer);
        const timestamp = new Date(created_at);
        await fs.utimes(filePath, timestamp, timestamp);

        callbacks.onDownloadComplete?.(track);
        return { track: track.title, status: { success: true } };
      } catch (error) {
        callbacks.onDownloadError?.(track, error);
        return {
          track: track.title,
          status: {
            success: false,
            error: error instanceof Error ? error.message : String(error),
          },
        };
      }
    }),
  );
}
