/**
 * Generate ALL male thumbnails for create flow
 * Including: hair length, ethnicity, companion type (realistic/anime)
 * Run with: node generate-all-male-thumbnails.js
 */

const fs = require('fs');
const https = require('https');
const path = require('path');

// Hair length thumbnails
const hairLengths = [
  { name: 'bald-male', prompt: 'handsome man, bald head, shaved head, NO hair, masculine features, confident expression, professional headshot portrait', hairLength: 'bald' },
  { name: 'short-hair-male', prompt: 'handsome man, short hair, well-groomed, masculine features, confident expression, professional headshot portrait', hairLength: 'short' },
  { name: 'medium-hair-male', prompt: 'handsome man, medium length hair, styled hair, masculine features, confident expression, professional headshot portrait', hairLength: 'medium' },
  { name: 'long-hair-male', prompt: 'handsome man, long hair, flowing hair, masculine features, confident expression, professional headshot portrait', hairLength: 'long' }
];

// Ethnicity thumbnails
const ethnicities = [
  { name: 'white-male', prompt: 'handsome white man, Caucasian features, pale skin, masculine features, confident expression, professional headshot portrait', ethnicity: 'white' },
  { name: 'black-male', prompt: 'handsome black man, African American features, dark brown skin, BLACK skin tone, masculine features, confident expression, professional headshot portrait', ethnicity: 'black' },
  { name: 'asian-male', prompt: 'handsome asian man, Korean features, light skin, masculine features, confident expression, professional headshot portrait', ethnicity: 'korean' },
  { name: 'hispanic-male', prompt: 'handsome hispanic man, Latino features, tan skin, masculine features, confident expression, professional headshot portrait', ethnicity: 'hispanic' },
  { name: 'indian-male', prompt: 'handsome Indian man, South Asian features, brown skin, masculine features, confident expression, professional headshot portrait', ethnicity: 'indian' },
  { name: 'middle-eastern-male', prompt: 'handsome Middle Eastern man, olive skin, masculine features, confident expression, professional headshot portrait', ethnicity: 'middle-east' }
];

// Companion type (realistic vs anime)
const companionTypes = [
  { name: 'realistic-male', prompt: 'handsome man, masculine features, confident expression, professional headshot portrait, photorealistic, ultra realistic', style: 'realistic' },
  { name: 'anime-male', prompt: 'handsome young man, masculine features, confident expression, anime style portrait, detailed anime art, sharp features', style: 'anime' }
];

async function generateImage(config) {
  console.log(`🎨 Generating ${config.name}.png...`);

  const params = {
    customPrompt: config.prompt,
    characterName: config.name,
    sex: 'male',
    style: config.style || 'realistic',
    ethnicity: config.ethnicity || 'white',
    hairLength: config.hairLength || 'short',
    hairColor: config.hairLength === 'bald' ? 'none' : 'brown',
    shotType: 'portrait',
    category: config.style === 'anime' ? 'anime-manga' : 'realistic',
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
      const filename = `${config.name}.png`;
      const filepath = path.join(__dirname, 'images', filename);

      await downloadImage(result.imageUrl, filepath);
      console.log(`💾 Saved to: ${filepath}`);

      return true;
    } else {
      console.error(`❌ Failed to generate ${config.name}:`, result.error);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error generating ${config.name}:`, error.message);
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
  console.log('🚀 Starting complete male thumbnail generation...\n');

  const allImages = [
    ...hairLengths,
    ...ethnicities,
    ...companionTypes
  ];

  for (let i = 0; i < allImages.length; i++) {
    await generateImage(allImages[i]);

    // Wait 10 seconds between requests
    if (i < allImages.length - 1) {
      console.log('⏳ Waiting 10 seconds...\n');
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }

  console.log('\n✨ All male thumbnails generated!');
  console.log(`📊 Total: ${allImages.length} images`);
}

main().catch(console.error);
