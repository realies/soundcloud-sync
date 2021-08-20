import { logger } from './helpers/logger';
import getClient from './services/getClient';
import getUserLikes from './services/getUserLikes';
import getMissingMusic from './services/getMissingMusic';

(async () => {
  const username = process.argv.slice(',').pop();
  const client = await getClient(username);
  logger.info(`Getting latest likes for ${username}`);
  const userLikes = await getUserLikes(client, 0, 50);
  const newMusic = await getMissingMusic(userLikes);
  newMusic.map(item => logger.info(`Added ${item.track}`));
})();
