#!/usr/bin/env node

// Script to generate AI avatars for companions with placeholder/empty Avatar_URLs
// Only generates for female companions to avoid male images

const fetch = require('node-fetch');

// Configuration
const API_BASE = 'https://selira.ai/.netlify/functions';
const BATCH_SIZE = 5; // Process in small batches to avoid API limits
const DELAY_BETWEEN_REQUESTS = 3000; // 3 seconds between avatar generations

// Find companions needing real avatars
async function findCompanionsNeedingAvatars() {
  try {
    console.log('🔍 Searching for companions with placeholder Avatar_URLs...');

    const response = await fetch(`${API_BASE}/selira-characters-fetch`);
    const data = await response.json();

    if (data.success && data.characters) {
      const companionsNeedingAvatars = data.characters.filter(char =>
        char.sex === 'female' && // Only female companions
        char.Created_by === 'Selira' && // Only Selira-created companions
        (
          !char.Avatar_URL ||
          char.Avatar_URL === '' ||
          char.Avatar_URL === '/avatars/placeholder.webp' ||
          char.Avatar_URL === 'https://selira.ai/avatars/placeholder.webp' ||
          char.Avatar_URL === 'https://selira.ai/avatars/default-female.webp' ||
          char.Avatar_URL === '/avatars/default-female.webp'
        )
      );

      console.log(`📊 Found ${companionsNeedingAvatars.length} female companions needing real avatars`);

      if (companionsNeedingAvatars.length > 0) {
        console.log('\n📋 First 10 companions needing avatars:');
        companionsNeedingAvatars.slice(0, 10).forEach(char => {
          console.log(`   - ${char.Name} (${char.ethnicity || 'unknown'}, ${char.companion_type || 'realistic'})`);
          console.log(`     ID: ${char.id} | Tags: ${(char.Tags || []).join(', ')}`);
        });

        if (companionsNeedingAvatars.length > 10) {
          console.log(`   ... and ${companionsNeedingAvatars.length - 10} more`);
        }
      }

      return companionsNeedingAvatars;
    }

    return [];
  } catch (error) {
    console.error('❌ Error finding companions:', error.message);
    return [];
  }
}

// Generate avatar for a specific companion
async function generateAvatarForCompanion(companion) {
  try {
    console.log(`\n🎨 Generating avatar for: ${companion.Name}`);
    console.log(`   Style: ${companion.companion_type || 'realistic'}`);
    console.log(`   Ethnicity: ${companion.ethnicity || 'unknown'}`);
    console.log(`   Tags: ${(companion.Tags || []).join(', ')}`);

    // Create avatar generation payload
    const avatarPayload = {
      name: companion.Name,
      sex: 'female', // Explicitly set to female
      description: companion.Character_Description || `A ${companion.companion_type || 'realistic'} female character`,
      artStyle: companion.companion_type || 'realistic',
      ethnicity: companion.ethnicity,
      hairLength: companion.hair_length,
      hairColor: companion.hair_color,
      tags: companion.Tags || []
    };

    console.log(`🚀 Calling avatar generation API...`);

    const response = await fetch(`${API_BASE}/selira-generate-companion-avatar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(avatarPayload)
    });

    if (response.ok) {
      const result = await response.json();

      if (result.success && result.avatarUrl) {
        console.log(`✅ Avatar generated: ${result.avatarUrl}`);

        // Update the companion's Avatar_URL in Airtable
        const updateResult = await updateCompanionAvatar(companion.id, result.avatarUrl);

        if (updateResult.success) {
          console.log(`✅ Updated ${companion.Name} with new avatar URL`);
          return { success: true, avatarUrl: result.avatarUrl };
        } else {
          console.error(`❌ Failed to update ${companion.Name}: ${updateResult.error}`);
          return { success: false, error: `Update failed: ${updateResult.error}` };
        }
      } else {
        console.error(`❌ Avatar generation failed for ${companion.Name}:`, result.error || 'Unknown error');
        return { success: false, error: result.error || 'Avatar generation failed' };
      }
    } else {
      const errorText = await response.text();
      console.error(`❌ HTTP ${response.status} generating avatar for ${companion.Name}:`, errorText);
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }
  } catch (error) {
    console.error(`❌ Error generating avatar for ${companion.Name}:`, error.message);
    return { success: false, error: error.message };
  }
}

// Update companion's Avatar_URL in Airtable
async function updateCompanionAvatar(recordId, avatarUrl) {
  try {
    const response = await fetch(`${API_BASE}/selira-update-avatar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        recordId: recordId,
        avatarUrl: avatarUrl
      })
    });

    if (response.ok) {
      const result = await response.json();
      return { success: true, data: result };
    } else {
      const errorText = await response.text();
      return { success: false, error: errorText };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Sleep function
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Main execution
async function main() {
  console.log('🚀 Starting AI avatar generation for female companions');
  console.log('⚠️  ONLY generating for female companions to avoid male images\n');

  const companionsNeedingAvatars = await findCompanionsNeedingAvatars();

  if (companionsNeedingAvatars.length === 0) {
    console.log('✅ No female companions found needing avatar generation!');
    return;
  }

  console.log(`\n🔧 Will generate avatars for ${companionsNeedingAvatars.length} companions...`);

  let processed = 0;
  let successful = 0;
  let failed = 0;
  const results = [];

  // Process in batches
  for (let i = 0; i < companionsNeedingAvatars.length; i += BATCH_SIZE) {
    const batch = companionsNeedingAvatars.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(companionsNeedingAvatars.length / BATCH_SIZE);

    console.log(`\n📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} companions)`);

    for (const companion of batch) {
      const result = await generateAvatarForCompanion(companion);
      processed++;

      if (result.success) {
        successful++;
        results.push({
          name: companion.Name,
          status: 'success',
          avatarUrl: result.avatarUrl
        });
      } else {
        failed++;
        results.push({
          name: companion.Name,
          status: 'failed',
          error: result.error
        });
      }

      // Delay between requests
      if (processed < companionsNeedingAvatars.length) {
        console.log(`⏳ Waiting ${DELAY_BETWEEN_REQUESTS/1000}s before next generation...`);
        await sleep(DELAY_BETWEEN_REQUESTS);
      }
    }

    // Longer delay between batches
    if (i + BATCH_SIZE < companionsNeedingAvatars.length) {
      console.log(`\n🛌 Batch ${batchNum} complete. Waiting 10 seconds before next batch...`);
      await sleep(10000);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 AVATAR GENERATION COMPLETE');
  console.log('='.repeat(60));
  console.log(`✅ Successfully generated: ${successful} avatars`);
  console.log(`❌ Failed to generate: ${failed} avatars`);
  console.log(`📈 Success rate: ${processed > 0 ? ((successful / processed) * 100).toFixed(1) : 0}%`);

  if (results.filter(r => r.status === 'failed').length > 0) {
    console.log('\n❌ Failed generations:');
    results.filter(r => r.status === 'failed').slice(0, 10).forEach(result => {
      console.log(`   - ${result.name}: ${result.error}`);
    });
  }

  console.log('\n🎉 Avatar generation process completed!');
  console.log('💡 Generated avatars should now appear in the companion profiles.');
}

// Handle process termination gracefully
process.on('SIGINT', () => {
  console.log('\n🛑 Process interrupted by user');
  console.log('💡 You can resume by running this script again');
  process.exit(0);
});

// Run the script
main().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});