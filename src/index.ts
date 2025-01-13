import getClient from './services/getClient.ts';
import getUserLikes from './services/getUserLikes.ts';
import getMissingMusic from './services/getMissingMusic.ts';
import verifyTimestamps from './services/verifyTimestamps.ts';
import logger from './helpers/logger.ts';
import { SoundCloudSyncOptions, Track } from './types.ts';

export { getClient, getUserLikes, getMissingMusic, verifyTimestamps };

export default async function soundCloudSync({
  username,
  folder = './music',
  limit = 50,
  verifyTimestamps: shouldVerifyTimestamps = false,
  noDownload = false,
}: SoundCloudSyncOptions) {
  let message = `Getting latest ${limit} likes for ${username}`;
  if (shouldVerifyTimestamps && noDownload) {
    message = `Getting latest ${limit} likes for ${username} to verify timestamps`;
  } else if (shouldVerifyTimestamps) {
    message = `Getting latest ${limit} likes for ${username} to verify timestamps and download new tracks`;
  } else if (!noDownload) {
    message = `Getting latest ${limit} likes for ${username} to download new tracks`;
  }
  logger.info(message);

  try {
    const client = await getClient(username);
    const userLikes = await getUserLikes(client, '0', limit);

    const callbacks = {
      onDownloadStart: (track: Track) => logger.info(`Downloading "${track.title}"`),
      onDownloadComplete: (track: Track) => logger.info(`Added "${track.title}"`),
      onDownloadError: (track: Track, error: unknown) =>
        logger.error(
          `Failed to download "${track.title}": ${
            error instanceof Error ? error.message : String(error)
          }`,
        ),
      onTimestampUpdate: (track: Track, oldDate: Date, newDate: Date) =>
        logger.info(
          `Updated timestamp for "${track.title}" from ${oldDate.toISOString()} to ${newDate.toISOString()}`,
        ),
    };

    let verifyResultsLength = 0;
    if (shouldVerifyTimestamps) {
      ({ length: verifyResultsLength } = await verifyTimestamps(userLikes, folder, callbacks));
    }

    let downloadResultsLength = 0;
    if (!noDownload) {
      ({ length: downloadResultsLength } = await getMissingMusic(userLikes, folder, callbacks));
    }

    logger.info(
      `Completed successfully${downloadResultsLength ? `: ${downloadResultsLength} tracks downloaded` : ''}${
        shouldVerifyTimestamps ? `, ${verifyResultsLength} tracks verified` : ''
      }`,
    );
  } catch (error) {
    logger.error(`An error occurred: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}
