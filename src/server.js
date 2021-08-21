import { logger } from './helpers/logger';
import getClient from './services/getClient';
import getUserLikes from './services/getUserLikes';
import getMissingMusic from './services/getMissingMusic';

(async () => {
  const args = process.argv.slice(',');
  if (args.length !== 3 && args.length !== 4) {
    logger.error(`Usage: yarn start username [folder]`);
    process.exit(1);
  }
  const username = args[2];
  const folder = args[3];
  const client = await getClient(username);
  logger.info(`Getting latest likes for ${username}`);
  const userLikes = await getUserLikes(client, 0, 50);
  const newMusic = await getMissingMusic(userLikes, folder);
  newMusic.map(item => logger.info(`Added ${item.track}`));
})();
