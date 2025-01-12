import getClient from './services/getClient.ts';
import getUserLikes from './services/getUserLikes.ts';
import getMissingMusic from './services/getMissingMusic.ts';
import verifyTimestamps from './services/verifyTimestamps.ts';
import logger from './helpers/logger.ts';
import { SoundCloudSyncOptions } from './types.ts';

export { getClient, getUserLikes, getMissingMusic, verifyTimestamps };

export default async function soundCloudSync({
  username,
  folder = './music',
  limit = 50,
  verifyTimestamps: shouldVerifyTimestamps = false,
}: SoundCloudSyncOptions) {
  logger.info(`Getting latest likes for ${username}`);

  try {
    const client = await getClient(username);
    const userLikes = await getUserLikes(client, '0', limit);

    const callbacks = {
      onDownloadStart: track => logger.info(`Downloading "${track.title}"`),
      onDownloadComplete: track => logger.info(`Added "${track.title}"`),
      onDownloadError: (track, error) =>
        logger.error(
          `Failed to download "${track.title}": ${
            error instanceof Error ? error.message : String(error)
          }`,
        ),
      onTimestampUpdate: (track, oldDate, newDate) =>
        logger.info(
          `Updated timestamp for ${track.title}" from ${oldDate.toISOString()} to ${newDate.toISOString()}`,
        ),
    };

    let verifyResultsLength = 0;
    if (shouldVerifyTimestamps) {
      ({ length: verifyResultsLength } = await verifyTimestamps(userLikes, folder, callbacks));
    }

    const downloadResults = await getMissingMusic(userLikes, folder, callbacks);
    logger.info(
      `Completed successfully: ${downloadResults.length} tracks downloaded${
        shouldVerifyTimestamps ? `, ${verifyResultsLength} tracks verified` : ''
      }`,
    );
  } catch (error) {
    logger.error(`An error occurred: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}
