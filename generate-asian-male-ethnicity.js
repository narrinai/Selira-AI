const Replicate = require('replicate');
const fs = require('fs');
const https = require('https');
const path = require('path');

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

const ethnicities = [
  {
    name: 'korean-male',
    prompt: 'professional portrait photo of handsome Korean man, short black hair, warm smile, wearing casual shirt, studio lighting, clean background, photorealistic, high quality, 8k'
  },
  {
    name: 'chinese-male',
    prompt: 'professional portrait photo of handsome Chinese man, short black hair, friendly expression, wearing casual shirt, studio lighting, clean background, photorealistic, high quality, 8k'
  },
  {
    name: 'japanese-male',
    prompt: 'professional portrait photo of handsome Japanese man, short black hair, gentle smile, wearing casual shirt, studio lighting, clean background, photorealistic, high quality, 8k'
  },
  {
    name: 'vietnamese-male',
    prompt: 'professional portrait photo of handsome Vietnamese man, short black hair, warm expression, wearing casual shirt, studio lighting, clean background, photorealistic, high quality, 8k'
  }
];

async function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      const fileStream = fs.createWriteStream(filepath);
      response.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close();
        resolve();
      });
      fileStream.on('error', reject);
    }).on('error', reject);
  });
}

async function generateImage(ethnicity) {
  console.log(`\n🎨 Generating ${ethnicity.name}.png...`);

  try {
    const output = await replicate.run(
      "black-forest-labs/flux-dev",
      {
        input: {
          prompt: ethnicity.prompt,
          guidance: 3.5,
          num_outputs: 1,
          aspect_ratio: "3:4",
          output_format: "webp",
          output_quality: 90,
          num_inference_steps: 28
        }
      }
    );

    const imageUrl = Array.isArray(output) ? output[0] : output;
    console.log(`✅ Generated: ${imageUrl}`);

    const outputPath = path.join(__dirname, 'images', `${ethnicity.name}.png`);
    await downloadImage(imageUrl, outputPath);
    console.log(`💾 Saved to: ${outputPath}`);

    return true;
  } catch (error) {
    console.error(`❌ Error generating ${ethnicity.name}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting Asian male ethnicity thumbnail generation...\n');

  for (const ethnicity of ethnicities) {
    await generateImage(ethnicity);

    // Wait 10 seconds between generations to avoid rate limits
    if (ethnicities.indexOf(ethnicity) < ethnicities.length - 1) {
      console.log('⏳ Waiting 10 seconds...\n');
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }

  console.log('\n✨ All Asian male ethnicity thumbnails generated!');
  console.log(`📊 Total: ${ethnicities.length} images`);
}

main().catch(console.error);
