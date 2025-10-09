/**
 * Generate male hair color thumbnails for create flow
 * Run with: node generate-male-thumbnails.js
 */

const fs = require('fs');
const https = require('https');
const path = require('path');

const hairColors = [
  { name: 'black', prompt: 'handsome man, short black hair, dark hair, masculine features, confident expression, professional headshot portrait' },
  { name: 'brown', prompt: 'handsome man, short brown hair, brunette, masculine features, confident expression, professional headshot portrait' },
  { name: 'blonde', prompt: 'handsome man, short blonde hair, golden blonde hair, masculine features, confident expression, professional headshot portrait' },
  { name: 'auburn', prompt: 'handsome man, short auburn hair, reddish-brown hair, masculine features, confident expression, professional headshot portrait' },
  { name: 'red', prompt: 'handsome man, short red hair, ginger hair, masculine features, confident expression, professional headshot portrait' },
  { name: 'grey', prompt: 'handsome man, short grey hair, silver hair, masculine features, confident expression, professional headshot portrait' },
  { name: 'white', prompt: 'handsome man, short white hair, platinum hair, masculine features, confident expression, professional headshot portrait' },
  { name: 'purple', prompt: 'handsome man, short purple hair, violet hair, masculine features, confident expression, professional headshot portrait, anime style' }
];

async function generateImage(hairColor) {
  console.log(`🎨 Generating ${hairColor.name}-hair-male.png...`);

  const params = {
    customPrompt: hairColor.prompt,
    characterName: `Male ${hairColor.name} Hair`,
    sex: 'male',
    style: hairColor.name === 'purple' ? 'anime' : 'realistic',
    ethnicity: 'white',
    hairLength: 'short',
    hairColor: hairColor.name,
    shotType: 'portrait',
    category: hairColor.name === 'purple' ? 'anime-manga' : 'realistic',
    skipAutoDownload: true
  };

  try {
    const response = await fetch('https://selira.ai/.netlify/functions/selira-generate-custom-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });

    const result = await response.json();

    if (result.success && result.imageUrl) {
      console.log(`✅ Generated: ${result.imageUrl}`);

      // Download image
      const filename = `${hairColor.name}-hair-male.png`;
      const filepath = path.join(__dirname, 'images', filename);

      await downloadImage(result.imageUrl, filepath);
      console.log(`💾 Saved to: ${filepath}`);

      return true;
    } else {
      console.error(`❌ Failed to generate ${hairColor.name}:`, result.error);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error generating ${hairColor.name}:`, error.message);
    return false;
  }
}

function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        const fileStream = fs.createWriteStream(filepath);
        response.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close();
          resolve();
        });
      } else {
        reject(new Error(`Failed to download: ${response.statusCode}`));
      }
    }).on('error', reject);
  });
}

async function main() {
  console.log('🚀 Starting male hair thumbnail generation...\n');

  for (const hairColor of hairColors) {
    await generateImage(hairColor);
    // Wait 10 seconds between requests to avoid rate limiting
    if (hairColors.indexOf(hairColor) < hairColors.length - 1) {
      console.log('⏳ Waiting 10 seconds...\n');
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }

  console.log('\n✨ All thumbnails generated!');
}

main().catch(console.error);
