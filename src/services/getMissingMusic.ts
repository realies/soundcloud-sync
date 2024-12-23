import fs from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import pathToFfmpeg from 'ffmpeg-static';
import { utimes } from 'utimes';
import { sanitiseFilename } from '../helpers/sanitise';
import webAgent from './webAgent';
import { UserLikesResponse, Track } from '../types';

const existsAsync = promisify(fs.exists);
const mkdirAsync = promisify(fs.mkdir);
const readdirAsync = promisify(fs.readdir);
const execAsync = promisify(exec);

interface Callbacks {
  onDownloadStart?: (title: string) => void;
  onDownloadComplete?: (title: string) => void;
  onDownloadError?: (title: string, error: unknown) => void;
}

interface TrackWithLikedAt extends Track {
  liked_at: string;
}

export default async function getMissingMusic(
  userLikes: UserLikesResponse,
  folder = './music',
  callbacks: Callbacks = {},
): Promise<Array<{ track: string; ffmpeg: { stdout: string; stderr: string }; touch: void }>> {
  if (!(await existsAsync(folder))) {
    await mkdirAsync(folder);
  }

  const availableMusic = (await readdirAsync(folder)).map((filename) => path.parse(filename).name);

  let missingTracks: TrackWithLikedAt[] = [];
  for (const { created_at, track } of userLikes.collection) {
    if (!availableMusic.includes(sanitiseFilename(track.title))) {
      missingTracks = [...missingTracks, { ...track, liked_at: created_at }];
    }
  }

  return Promise.all(
    missingTracks
      .filter((track) => track.media.transcodings.length !== 0)
      .map(async (track) => {
        const title = track?.publisher_metadata?.release_title || track.title;
        callbacks.onDownloadStart?.(title);

        try {
          const playlistUrl = JSON.parse(
            (await webAgent(
              track.media.transcodings.find(
                (transcoding) =>
                  transcoding.format.protocol === 'progressive' && transcoding.format.mime_type === 'audio/mpeg' || 
                  transcoding.format.mime_type === 'audio/mpeg',
              )!.url,
            )) as string,
          ).url;

          const filePath = path.format({
            dir: folder,
            name: sanitiseFilename(track.title),
            ext: '.mp3',
          });

          const ffmpeg = await execAsync(
            `${pathToFfmpeg} -hide_banner -nostats -i "${playlistUrl}" ${
              track?.artwork_url
                ? `-f image2pipe -i "${track.artwork_url.replace(
                    'large',
                    't500x500',
                  )}" -map_metadata 0 -map 0 -map 1`
                : ''
            } -metadata artist="${
              track?.publisher_metadata?.artist || track.artist
            }" -metadata title="${title.replace(/"/g, '\\"')}" -c copy "${filePath}"`,
          );

          const touch = await utimes(filePath, {
            mtime: new Date(track.liked_at).getTime(),
          });

          callbacks.onDownloadComplete?.(title);
          return { track: track.title, ffmpeg, touch };
        } catch (error) {
          callbacks.onDownloadError?.(title, error);
          throw error;
        }
      }),
  );
}
