import webAgent from './webAgent';

export default async profileName => {
  const [apiVersion, scriptUrls, urn] = await webAgent(
    `https://soundcloud.com/${profileName}/likes`,
    [
      /__sc_version\s*=\s*"([^"]+)/,
      /<script crossorigin src="([^"]+)">/g,
      /soundcloud:users:(\d+)/,
    ],
  );
  const clientId = (
    await Promise.all(scriptUrls.value.map(url => webAgent(url, [/,client_id:"([^"]+)"/])))
  ).find(result => result[0].status === 'fulfilled')[0];

  return {
    id: clientId.value[0],
    version: apiVersion.value[0],
    targetUrn: urn.value[0],
  };
};
