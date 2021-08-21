/* eslint-disable prettier/prettier */
/* eslint-disable camelcase */
/* eslint-disable no-restricted-syntax */
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import pathToFfmpeg from 'ffmpeg-static';
import moment from 'moment';
import sanitize from 'sanitize-filename';
import { utimes } from 'utimes';
import webAgent from './webAgent';
import { logger } from '../helpers/logger';

export default async (userLikes, folder = './music') => {
  const existsAsync = promisify(fs.exists);
  const mkdirAsync = promisify(fs.mkdir);
  if (!(await existsAsync(folder))) {
    await mkdirAsync(folder);
  }
  const readdirAsync = promisify(fs.readdir);
  const availableMusic = (await readdirAsync(folder)).map(filename => path.parse(filename).name);

  let missingTracks = [];
  for (const { created_at, track } of userLikes.collection) {
    if (!availableMusic.includes(sanitize(track.title))) {
      missingTracks = [...missingTracks, { ...track, liked_at: created_at }];
    }
  }

  const execAsync = promisify(exec);
  return Promise.all(
    missingTracks.map(async track => {
      const playlistUrl = JSON.parse(
        await webAgent(
          track.media.transcodings.find(
            transcoding => transcoding.format.protocol === 'progressive',
          ).url,
        ),
      ).url;
      const filePath = path.format({
        dir: folder,
        name: sanitize(track.title),
        ext: '.mp3',
      });
      const title =
        track?.publisher_metadata?.release_title || track.title;
      logger.info(`Downloading ${title}`);
      return {
        track: track.title,
        ffmpeg: await execAsync(
          `${pathToFfmpeg} -hide_banner -nostats -i "${playlistUrl}" ${
            track?.artwork_url
              ? `-f image2pipe -i "${track.artwork_url.replace(
                  'large',
                  't500x500',
                )}" -map_metadata 0 -map 0 -map 1`
              : ''
          } -metadata artist="${
            track?.publisher_metadata?.artist || track.artist
          }" -metadata title="${title}" -c copy "${filePath}"`,
        ),
        touch: await utimes(filePath, {
          mtime: Number(moment(track.liked_at).valueOf()),
        }),
      };
    }),
  );
};
