import fs from 'node:fs/promises';
import path from 'node:path';
import { ID3Writer } from 'browser-id3-writer';
import sanitiseFilename from '../helpers/sanitise.ts';
import webAgent from './webAgent.ts';
import { UserLike, Callbacks, DownloadResult, Track } from '../types.ts';

const MAX_CONCURRENT_DOWNLOADS = 128;

const getBestTranscoding = (track: Track) =>
  track.media.transcodings.find(
    t => t.format.mime_type === 'audio/mpeg' && !t.url.includes('/preview/'),
  ) ?? track.media.transcodings.find(t => t.format.mime_type === 'audio/mpeg');

export const getTrackTitle = (track: Track) =>
  track?.publisher_metadata?.release_title || track.title;

export const getTrackArtist = (track: Track) =>
  track?.publisher_metadata?.artist || track.user.username;

const getArtworkUrl = (url?: string) => url?.replace('large', 't500x500');

const downloadSegment = async (url: string): Promise<Uint8Array> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download segment: ${url}`);
  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
};

const downloadArtwork = async (url: string): Promise<ArrayBuffer | null> => {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return response.arrayBuffer();
  } catch {
    return null;
  }
};

export default async function getMissingMusic(
  likes: UserLike[],
  folder = './music',
  callbacks: Callbacks = {},
): Promise<DownloadResult[]> {
  try {
    await fs.access(folder);
  } catch {
    await fs.mkdir(folder);
  }

  const availableMusic = (await fs.readdir(folder)).map(filename =>
    path.parse(filename).name.toLowerCase(),
  );

  const missingTracks = likes.filter(
    ({ track }) => !availableMusic.includes(sanitiseFilename(track.title).toLowerCase()),
  );

  const downloadOne = async ({ track, created_at }: UserLike): Promise<DownloadResult> => {
    callbacks.onDownloadStart?.(track);

    try {
      const transcoding = getBestTranscoding(track);
      if (!transcoding) throw new Error('No suitable audio format found');
      if (transcoding.url.includes('/preview/')) throw new Error('No full-length audio available');

      const transcodingResponse = await webAgent(transcoding.url);
      const { url: playlistUrl } = JSON.parse(transcodingResponse as string);

      const playlistResponse = await fetch(playlistUrl);
      if (!playlistResponse.ok) throw new Error('Failed to fetch playlist');
      const playlist = await playlistResponse.text();

      const segments = playlist
        .split('\n')
        .filter(line => line.trim() && !line.startsWith('#'))
        .map(line => new URL(line, playlistUrl).toString());

      if (segments.length === 0) {
        throw new Error('No audio segments found in playlist');
      }

      const chunks = await Promise.all(segments.map(downloadSegment));

      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      const audioBuffer = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        audioBuffer.set(chunk, offset);
        offset += chunk.length;
      }

      const writer = new ID3Writer(audioBuffer.buffer);
      writer.setFrame('TIT2', getTrackTitle(track)).setFrame('TPE1', [getTrackArtist(track)]);

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
  };

  const results: DownloadResult[] = new Array(missingTracks.length);
  let nextIndex = 0;
  const worker = async (): Promise<void> => {
    while (nextIndex < missingTracks.length) {
      const i = nextIndex;
      nextIndex += 1;
      // eslint-disable-next-line no-await-in-loop
      results[i] = await downloadOne(missingTracks[i]);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(MAX_CONCURRENT_DOWNLOADS, missingTracks.length) }, worker),
  );
  return results;
}
