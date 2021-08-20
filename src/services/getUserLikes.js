import webAgent from './webAgent';

export default async (client, offset = '', limit = 1) => {
  const authQuery = `client_id=${client.id}&app_version=${client.version}&app_locale=en`;
  const userLikes = JSON.parse(
    await webAgent(
      `https://api-v2.soundcloud.com/users/${client.targetUrn}/track_likes?offset=${offset}&limit=${limit}&${authQuery}`,
    ),
  );
  return {
    ...userLikes,
    collection: userLikes.collection.map(item => ({
      ...item,
      track: {
        ...item.track,
        media: {
          transcodings: item.track.media.transcodings.map(transcoding => ({
            ...transcoding,
            url: `${transcoding.url}?${authQuery}`,
          })),
        },
      },
    })),
  };
};
