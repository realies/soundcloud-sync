import { logger } from '../helpers/logger';
import webAgent from './webAgent';
import { Client } from '../types';

export default async function getClient(profileName: string): Promise<Client> {
  logger.debug('Starting getClient function');
  try {
    const [apiVersionArr, scriptUrlsArr, urnArr] = await webAgent(`https://soundcloud.com/${profileName}/likes`, [
      /__sc_version="([^"]+)/,
      /<script crossorigin src="([^"]+)">/g,
      /soundcloud:users:(\d+)/,
    ]);

    if (!Array.isArray(scriptUrlsArr) || !apiVersionArr?.[0] || !urnArr?.[0]) {
      throw new Error('Missing required client information');
    }

    const apiVersion = apiVersionArr[0];
    const scriptUrls = scriptUrlsArr
      .reverse()
      .map(script => {
        const match = script.match(/src="([^"]+)"/);
        return match?.[1];
      })
      .filter((url): url is string => url !== undefined);
    const urn = urnArr[0];

    if (scriptUrls.length === 0) {
      throw new Error('No script URLs found');
    }

    // Try each script in order until we find the client_id
    for (const url of scriptUrls) {
      const result = await webAgent(url, [/,client_id:"([^"]+)"/]);
      if (Array.isArray(result) && result[0]?.length > 0) {
        const client: Client = {
          id: result[0][0],
          version: apiVersion,
          targetUrn: urn,
        };
        logger.debug('Client found', { client });
        return client;
      } else {
        logger.debug('No client found', { url });
      }
    }

    throw new Error('Failed to extract client ID from any bundle');
  } catch (error) {
    logger.error('Error in getClient', { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}
