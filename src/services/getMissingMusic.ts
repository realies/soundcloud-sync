import fs from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import pathToFfmpeg from 'ffmpeg-static';
import { utimes } from 'utimes';
import sanitiseFilename from '../helpers/sanitise';
import webAgent from './webAgent';
import { UserLike, Callbacks, DownloadResult, Track } from '../types';

const existsAsync = promisify(fs.exists);
const mkdirAsync = promisify(fs.mkdir);
const readdirAsync = promisify(fs.readdir);
const execAsync = promisify(exec);

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

/**
 * Escapes special characters in metadata values for ffmpeg.
 * Handles both quotes and backslashes to prevent command injection.
 * Returns a safe string even if the input is undefined.
 */
const escapeMetadata = (value: string | undefined): string => {
  if (!value) {
    return '';
  }
  return value.replace(/[\\'"]/g, '\\$&');
};

/**
 * Downloads tracks that aren't already in the specified folder.
 *
 * The function:
 * 1. Creates the output folder if it doesn't exist
 * 2. Identifies tracks that haven't been downloaded yet
 * 3. Downloads each missing track with metadata and artwork
 * 4. Sets the file modification time to match the like date
 *
 * For each track:
 * - Finds the best quality MP3 stream
 * - Downloads and embeds artwork if available
 * - Sets metadata (title, artist)
 * - Preserves like date as file mtime
 *
 * @param likes - Array of liked tracks to process
 * @param folder - Output folder for downloaded tracks (default: ./music)
 * @param callbacks - Optional callbacks for download progress events
 * @returns Array of results for each downloaded track
 * @throws Error if a track fails to download or if folder operations fail
 */
export default async function getMissingMusic(
  likes: UserLike[],
  folder = './music',
  callbacks: Callbacks = {},
): Promise<DownloadResult[]> {
  if (!(await existsAsync(folder))) {
    await mkdirAsync(folder);
  }

  const availableMusic = (await readdirAsync(folder)).map(filename => path.parse(filename).name);

  const downloadTrack = async ({ created_at, track }: UserLike): Promise<DownloadResult> => {
    callbacks.onDownloadStart?.(track);

    try {
      const transcoding = getBestTranscoding(track);
      if (!transcoding) {
        throw new Error('No suitable audio format found');
      }

      const { url: playlistUrl } = JSON.parse((await webAgent(transcoding.url)) as string);

      const filePath = path.format({
        dir: folder,
        name: sanitiseFilename(track.title),
        ext: '.mp3',
      });

      const artworkParam = track.artwork_url
        ? `-f image2pipe -i "${getArtworkUrl(track.artwork_url)}" -map_metadata 0 -map 0 -map 1`
        : '';

      const ffmpeg = await execAsync(
        `${pathToFfmpeg} -hide_banner -nostats -i "${playlistUrl}" ${artworkParam} ` +
          `-metadata artist="${escapeMetadata(getTrackArtist(track))}" ` +
          `-metadata title="${escapeMetadata(getTrackTitle(track))}" ` +
          `-c copy "${filePath}"`,
      );

      await utimes(filePath, {
        mtime: new Date(created_at).getTime(),
      });

      callbacks.onDownloadComplete?.(track);
      return { track: track.title, ffmpeg };
    } catch (error) {
      callbacks.onDownloadError?.(track, error);
      throw error;
    }
  };

  const missingTracks = likes.filter(
    ({ track }) =>
      !availableMusic.includes(sanitiseFilename(track.title)) &&
      track.media.transcodings.length > 0,
  );

  return Promise.all(missingTracks.map(downloadTrack));
}
