import webAgent from './webAgent';
import { Client, UserLikesResponse } from '../types';
import { logger } from '../helpers/logger';

export default async function getUserLikes(
  client: Client,
  offset = '',
  limit = 50,
): Promise<UserLikesResponse> {
  const authQuery = `client_id=${client.id}&app_version=${client.version}&app_locale=en`;
  logger.debug('Fetching user likes', { offset, limit });
  
  const userLikes = JSON.parse(
    (await webAgent(
      `https://api-v2.soundcloud.com/users/${client.targetUrn}/track_likes?offset=${offset}&limit=${limit}&${authQuery}`,
    )) as string,
  ) as UserLikesResponse;

  logger.debug('User likes response', { count: userLikes.collection.length });

  return {
    ...userLikes,
    collection: userLikes.collection.map((item) => ({
      ...item,
      track: {
        ...item.track,
        media: {
          transcodings: item.track.media.transcodings.map((transcoding) => ({
            ...transcoding,
            url: `${transcoding.url}?${authQuery}`,
          })),
        },
      },
    })),
  };
}
