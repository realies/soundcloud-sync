import webAgent from './webAgent.ts';
import { Client, UserLike } from '../types.ts';
import logger from '../helpers/logger.ts';

const PAGE_SIZE = 200;

/**
 * Fetches a user's liked tracks from SoundCloud.
 *
 * Walks SoundCloud's cursor-paginated `track_likes` endpoint via `next_href`
 * until either `limit` is reached or there are no more pages, then attaches
 * authentication to each track's media URLs for streaming.
 *
 * @param client - SoundCloud client details for authentication
 * @param limit - Maximum number of likes to fetch (default: 50)
 * @returns Array of liked tracks with authenticated media URLs
 * @throws Error if the API request fails or returns invalid data
 */
export default async function getUserLikes(client: Client, limit = 50): Promise<UserLike[]> {
  const auth = `client_id=${client.id}&app_version=${client.version}&app_locale=en`;
  const collection: UserLike[] = [];

  let nextHref: string | null =
    `https://api-v2.soundcloud.com/users/${client.urn}/track_likes?offset=0&limit=${Math.min(
      limit,
      PAGE_SIZE,
    )}`;

  while (nextHref && collection.length < limit) {
    logger.debug('Fetching user likes page', { fetched: collection.length, limit });

    // eslint-disable-next-line no-await-in-loop
    const response = await webAgent(`${nextHref}&${auth}`);
    const page = JSON.parse(response as string) as {
      collection: UserLike[];
      next_href?: string | null;
    };

    collection.push(...page.collection);
    nextHref = page.next_href ?? null;
  }

  return collection.slice(0, limit).map(({ track, created_at }) => ({
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
