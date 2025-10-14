#!/usr/bin/env node

// Trigger avatar_url_2 generation for 10 UNCENSORED companions
const fetch = require('node-fetch');

async function triggerGeneration(index) {
  console.log(`\n[${index + 1}/10] Triggering UNCENSORED avatar_url_2 generation...`);

  try {
    const response = await fetch('https://selira.ai/.netlify/functions/generate-avatar-2-uncensored?trigger=manual', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 120000 // 2 minute timeout
    });

    const text = await response.text();

    try {
      const data = JSON.parse(text);
      console.log(`Response:`, JSON.stringify(data, null, 2));
      return data.success;
    } catch (e) {
      console.log(`Raw response: ${text}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting 10 UNCENSORED avatar_url_2 generation triggers\n');
  console.log('Each trigger will generate 1 uncensored companion avatar');
  console.log('Total time estimate: ~20 minutes (2min per companion)\n');

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < 10; i++) {
    const success = await triggerGeneration(i);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }

    // Wait 10 seconds between triggers
    if (i < 9) {
      console.log('⏱️  Waiting 10 seconds before next trigger...');
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }

  console.log(`\n\n📊 Final Results:`);
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`\n✨ Done!`);
}

main();
