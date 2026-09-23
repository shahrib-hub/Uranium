const axios = require('axios');

async function resolveImageToDataUri(input) {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('data:')) return trimmed;

  try {
    const response = await axios.get(trimmed, {
      responseType: 'arraybuffer',
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) UraniumBot/1.0'
      }
    });

    const contentType = (response.headers['content-type'] || 'image/png').split(';')[0].trim();
    const base64 = Buffer.from(response.data).toString('base64');
    return `data:${contentType};base64,${base64}`;
  } catch (err) {
    throw new Error(`Failed to download image from URL: ${err.message}`);
  }
}

async function run() {
  console.log('Testing null input:', await resolveImageToDataUri(null));
  console.log('Testing empty input:', await resolveImageToDataUri('   '));
  console.log('Testing data uri:', await resolveImageToDataUri('data:image/png;base64,abc123'));
  
  // Test with a real public image
  const discordLogo = 'https://cdn.discordapp.com/embed/avatars/0.png';
  const dataUri = await resolveImageToDataUri(discordLogo);
  console.log('Fetched Discord logo, data URI length:', dataUri.length, 'starts with:', dataUri.slice(0, 30));
  console.log('ALL TESTS PASSED!');
}

run().catch(console.error);
