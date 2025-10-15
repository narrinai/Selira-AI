#!/usr/bin/env node
// scripts/trigger-premium-avatars.js
// Trigger script to generate 3 premium avatars for 20 uncensored companions
// Run locally: node scripts/trigger-premium-avatars.js

const fetch = require('node-fetch');

// Configuration
const FUNCTION_URL = 'https://selira.ai/.netlify/functions/generate-premium-avatars';
const DELAY_BETWEEN_COMPANIONS = 5000; // 5 seconds between companions to avoid rate limits

// Sleep function
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Companion slugs to process (you will provide these)
const COMPANION_SLUGS = [
  // ADD YOUR 20 COMPANION SLUGS HERE
  // Example: 'alpha-boss-star',
  // Example: 'asher-black',
  // etc.
];

// Process single companion
async function processCompanion(slug, index, total) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`[${index}/${total}] Processing: ${slug}`);
  console.log('='.repeat(60));

  try {
    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ slug })
    });

    const result = await response.json();

    if (response.ok && result.success) {
      console.log(`✅ SUCCESS: ${result.companion.name}`);
      console.log(`   Variations generated: ${result.successCount}/3`);
      console.log(`   Gems used: ${result.totalGems}`);

      if (result.variations && result.variations.length > 0) {
        console.log(`   Image URLs:`);
        result.variations.forEach(v => {
          console.log(`      ${v.variation}. ${v.imgbbUrl}`);
        });
      }

      if (result.errors && result.errors.length > 0) {
        console.log(`   ⚠️ Errors:`);
        result.errors.forEach(err => console.log(`      - ${err}`));
      }

      return {
        success: true,
        slug,
        result
      };
    } else {
      console.log(`❌ FAILED: ${slug}`);
      console.log(`   Error: ${result.error || 'Unknown error'}`);
      return {
        success: false,
        slug,
        error: result.error
      };
    }

  } catch (error) {
    console.log(`❌ NETWORK ERROR: ${slug}`);
    console.log(`   ${error.message}`);
    return {
      success: false,
      slug,
      error: error.message
    };
  }
}

// Main function
async function main() {
  console.log('🚀 Starting Premium Avatar Generation');
  console.log(`📊 Total companions: ${COMPANION_SLUGS.length}`);
  console.log(`⏱️ Estimated time: ${Math.ceil(COMPANION_SLUGS.length * 45 / 60)} minutes\n`);

  if (COMPANION_SLUGS.length === 0) {
    console.log('❌ ERROR: No companion slugs provided!');
    console.log('Please add companion slugs to the COMPANION_SLUGS array in this script.');
    process.exit(1);
  }

  const results = [];
  const startTime = Date.now();

  for (let i = 0; i < COMPANION_SLUGS.length; i++) {
    const slug = COMPANION_SLUGS[i];
    const result = await processCompanion(slug, i + 1, COMPANION_SLUGS.length);
    results.push(result);

    // Delay before next companion (except for last one)
    if (i < COMPANION_SLUGS.length - 1) {
      console.log(`\n⏱️ Waiting ${DELAY_BETWEEN_COMPANIONS / 1000} seconds before next companion...`);
      await sleep(DELAY_BETWEEN_COMPANIONS);
    }
  }

  const endTime = Date.now();
  const totalTime = Math.ceil((endTime - startTime) / 1000);

  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 FINAL SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total companions processed: ${results.length}`);
  console.log(`✅ Successful: ${results.filter(r => r.success).length}`);
  console.log(`❌ Failed: ${results.filter(r => !r.success).length}`);
  console.log(`⏱️ Total time: ${Math.floor(totalTime / 60)}m ${totalTime % 60}s`);

  // List failures
  const failures = results.filter(r => !r.success);
  if (failures.length > 0) {
    console.log(`\n❌ Failed companions:`);
    failures.forEach(f => {
      console.log(`   - ${f.slug}: ${f.error}`);
    });
  }

  // List successes with URLs
  const successes = results.filter(r => r.success);
  if (successes.length > 0) {
    console.log(`\n✅ Successful companions:`);
    successes.forEach(s => {
      const companion = s.result.companion;
      const variations = s.result.variations || [];
      console.log(`\n   ${companion.name} (${companion.sex}):`);
      variations.forEach(v => {
        console.log(`      ${v.variation}. ${v.imgbbUrl}`);
      });
    });
  }

  console.log('\n✨ Premium avatar generation completed!');
}

// Run
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
