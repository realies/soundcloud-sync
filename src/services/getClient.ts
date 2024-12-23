import webAgent from './webAgent';
import { Client } from '../types';
import logger from '../helpers/logger';

const patterns = {
  version: /__sc_version="([^"]+)/,
  scripts: /(?<=<script crossorigin src=")[^"]+\.js(?=")/g,
  urn: /soundcloud:users:(\d+)/,
  clientId: /,client_id:"([^"]+)"/,
} as const;

/**
 * Retrieves SoundCloud client credentials by scraping a user's profile page.
 *
 * The function:
 * 1. Fetches the user's profile page
 * 2. Extracts the API version and client URN
 * 3. Finds and fetches the script containing the client ID
 *
 * @param profileName - SoundCloud username (e.g., 'realies')
 * @returns Client object with ID, version, and URN for API requests
 * @throws Error if any required data cannot be found
 */
export default async function getClient(profileName: string): Promise<Client> {
  logger.debug('Starting getClient function');

  const [version, scriptUrls, urn] = (await webAgent(
    `https://soundcloud.com/${profileName}/likes`,
    [patterns.version, patterns.scripts, patterns.urn],
  )) as string[][];

  if (!version?.[0] || !scriptUrls?.length || !urn?.[0]) {
    throw new Error('Failed to extract required data from profile page');
  }

  // Search scripts from last to first as client ID is usually in the last script
  const scriptUrlsReversed = scriptUrls.slice().reverse();
  for await (const url of scriptUrlsReversed) {
    const [clientId] = (await webAgent(url, [patterns.clientId])) as string[][];
    if (clientId?.[0]) {
      const client = { id: clientId[0], version: version[0], urn: urn[0] };
      logger.debug('Client found', { client });
      return client;
    }
  }

  throw new Error('Failed to find client ID in any script');
}
