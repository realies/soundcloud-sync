import getClient from './services/getClient';
import getUserLikes from './services/getUserLikes';
import getMissingMusic from './services/getMissingMusic';
import { logger } from './helpers/logger';
import { SoundCloudSyncOptions } from './types';

export { getClient, getUserLikes, getMissingMusic };

export async function soundCloudSync({ username, folder = './music', limit = 50 }: SoundCloudSyncOptions) {
  logger.info(`Getting latest likes for ${username}`);

  try {
    const client = await getClient(username);
    const userLikes = await getUserLikes(client, '0', limit);
    await getMissingMusic(userLikes, folder, {
      onDownloadStart: (title) => logger.info(`Downloading ${title}`),
      onDownloadComplete: (title) => logger.info(`Added ${title}`),
      onDownloadError: (title, error) => 
        logger.error(`Failed to download ${title}`, { error: error instanceof Error ? error.message : String(error) }),
    });
  } catch (error) {
    logger.error('An error occurred', { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}
