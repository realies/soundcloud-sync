import getClient from './services/getClient.ts';
import getUserLikes from './services/getUserLikes.ts';
import getMissingMusic from './services/getMissingMusic.ts';
import logger from './helpers/logger.ts';
import { SoundCloudSyncOptions } from './types.ts';

export { getClient, getUserLikes, getMissingMusic };

export default async function soundCloudSync({
  username,
  folder = './music',
  limit = 50,
}: SoundCloudSyncOptions) {
  logger.info(`Getting latest likes for ${username}`);

  try {
    const client = await getClient(username);
    const userLikes = await getUserLikes(client, '0', limit);
    const results = await getMissingMusic(userLikes, folder, {
      onDownloadStart: track => logger.info('Downloading track', track.title),
      onDownloadComplete: track => logger.info('Added track', track.title),
      onDownloadError: (track, error) =>
        logger.error('Failed to download track', {
          title: track.title,
          error: error instanceof Error ? error.message : String(error),
        }),
    });
    logger.info(`Completed successfully, ${results.length} tracks processed`);
  } catch (error) {
    logger.error('An error occurred', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
