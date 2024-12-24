import webAgent from './webAgent.ts';
import { Client, UserLike } from '../types.ts';
import logger from '../helpers/logger.ts';

/**
 * Fetches a user's liked tracks from SoundCloud.
 *
 * The function:
 * 1. Constructs an authenticated API request URL
 * 2. Fetches the liked tracks data
 * 3. Adds authentication to media URLs for streaming
 *
 * @param client - SoundCloud client details for authentication
 * @param offset - Pagination offset for fetching likes (default: '')
 * @param limit - Number of likes to fetch (default: 50)
 * @returns Array of liked tracks with authenticated media URLs
 * @throws Error if the API request fails or returns invalid data
 */
export default async function getUserLikes(
  client: Client,
  offset = '',
  limit = 50,
): Promise<UserLike[]> {
  const auth = `client_id=${client.id}&app_version=${client.version}&app_locale=en`;
  logger.debug('Fetching user likes', { offset, limit });

  const response = await webAgent(
    `https://api-v2.soundcloud.com/users/${client.urn}/track_likes?offset=${offset}&limit=${limit}&${auth}`,
  );

  const { collection } = JSON.parse(response as string) as { collection: UserLike[] };
  logger.debug('User likes fetched', { count: collection.length });

  return collection.map(({ track, created_at }) => ({
    created_at,
    track: {
      ...track,
      media: {
        transcodings: track.media.transcodings.map(t => ({
          ...t,
          url: `${t.url}?${auth}`,
        })),
      },
    },
  }));
}
