const fetch = require('node-fetch');

let token = null;
let tokenExpiry = 0;

async function getToken() {
  if (token && Date.now() < tokenExpiry) return token;

  const res = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${process.env.TWITCH_CLIENT_ID}&client_secret=${process.env.TWITCH_CLIENT_SECRET}&grant_type=client_credentials`,
    { method: 'POST' }
  );

  const data = await res.json();
  token = data.access_token;
  tokenExpiry = Date.now() + data.expires_in * 1000;
  return token;
}

module.exports = async function checkTwitch(username) {
  const auth = await getToken();

  const userRes = await fetch(
    `https://api.twitch.tv/helix/users?login=${username}`,
    {
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        Authorization: `Bearer ${auth}`
      }
    }
  );

  const userData = await userRes.json();
  if (!userData.data?.length) return null;

  const userId = userData.data[0].id;

  const streamRes = await fetch(
    `https://api.twitch.tv/helix/streams?user_id=${userId}`,
    {
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        Authorization: `Bearer ${auth}`
      }
    }
  );

  const streamData = await streamRes.json();
  if (!streamData.data?.length) return null;

  const stream = streamData.data[0];

  return {
    id: stream.id,
    title: stream.title,
    url: `https://twitch.tv/${username}`,
    game: stream.game_name,
    viewers: stream.viewer_count,
    thumbnail: stream.thumbnail_url
      .replace('{width}', '1280')
      .replace('{height}', '720')
  };
};
