#!/usr/bin/env node

// Test script to generate avatar_url_2 for 10 censored Selira companions
const fetch = require('node-fetch');

async function generateAvatar2ForCompanion(slug) {
  console.log(`\n🎨 Generating avatar_url_2 for: ${slug}`);

  try {
    const response = await fetch(`https://selira.ai/.netlify/functions/generate-avatar-2-bulk?trigger=manual&slug=${slug}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const text = await response.text();
    console.log(`Response: ${text}`);

    if (response.ok) {
      console.log(`✅ Success for ${slug}`);
      return true;
    } else {
      console.error(`❌ Failed for ${slug}: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error for ${slug}:`, error.message);
    return false;
  }
}

async function main() {
  // First 10 companions without avatar_url_2
  const companions = [
    'raven-phoenix-1760273383129',
    'axel-blaze-1760203236274',
    'hwan-dragonheart-1760036093677',
    'amira-johansson',
    'khadija-wu',
    'kaito-kurosawa-1760034023071',
    'camila-gonzalez',
    'camila-xu',
    'ella-takahashi',
    'nadia-hayashi'
  ];

  console.log(`🚀 Starting avatar_url_2 generation for ${companions.length} companions\n`);

  let successCount = 0;
  let failCount = 0;

  for (const slug of companions) {
    const success = await generateAvatar2ForCompanion(slug);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }

    // Wait 60 seconds between generations to avoid rate limits
    if (companions.indexOf(slug) < companions.length - 1) {
      console.log('⏱️  Waiting 60 seconds before next generation...');
      await new Promise(resolve => setTimeout(resolve, 60000));
    }
  }

  console.log(`\n📊 Final Results:`);
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
}

main();
