#!/usr/bin/env node
import { soundCloudSync } from './index';
import { logger } from './helpers/logger';

(async () => {
  try {
    const [,, username, folder, ...args] = process.argv;
    if (!username) {
      logger.error('soundcloud-sync <username> [folder] [--limit <number>]');
      process.exit(1);
    }

    const limit = args.includes('--limit') ? Number(args[args.indexOf('--limit') + 1]) : undefined;

    await soundCloudSync({ username, folder, limit });
  } catch (error) {
    logger.error('CLI error', { error: error instanceof Error ? error.message : String(error) });
    process.exit(1);
  }
})();
