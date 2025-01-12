import fs from 'node:fs/promises';
import path from 'node:path';
import { Track, Callbacks, UserLike, VerifyTimestampResult } from '../types.ts';
import logger from '../helpers/logger.ts';
import sanitiseFilename from '../helpers/sanitise.ts';

const verifyAndUpdateTimestamp = async (
  filePath: string,
  created_at: string,
  track: Track,
  callbacks: Callbacks,
): Promise<VerifyTimestampResult> => {
  try {
    const stats = await fs.stat(filePath);
    const likeDate = new Date(created_at);
    const fileDate = stats.mtime;

    if (Math.abs(likeDate.getTime() - fileDate.getTime()) > 1000) {
      // 1 second tolerance
      logger.debug(
        `Verifying timestamp for "${path.basename(filePath)}" from ${fileDate.toISOString()} to ${likeDate.toISOString()}`,
      );
      await fs.utimes(filePath, likeDate, likeDate);
      callbacks.onTimestampUpdate?.(track, fileDate, likeDate);
      return {
        track: track.title,
        status: { success: true, updated: true },
      };
    }
    return {
      track: track.title,
      status: { success: true, updated: false },
    };
  } catch (error) {
    logger.error(
      `Failed to verify/update timestamp for "${path.basename(filePath)}": ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return {
      track: track.title,
      status: {
        success: false,
        updated: false,
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
};

export default async function verifyTimestamps(
  likes: UserLike[],
  folder: string,
  callbacks: Callbacks = {},
): Promise<VerifyTimestampResult[]> {
  const availableMusic = (await fs.readdir(folder)).map(filename => path.parse(filename).name);

  const existingTracks = likes.filter(({ track }) =>
    availableMusic.includes(sanitiseFilename(track.title)),
  );

  return Promise.all(
    existingTracks.map(async ({ track, created_at }) => {
      const filePath = path.join(folder, `${sanitiseFilename(track.title)}.mp3`);
      return verifyAndUpdateTimestamp(filePath, created_at, track, callbacks);
    }),
  );
}
