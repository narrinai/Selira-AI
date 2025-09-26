#!/usr/bin/env node

// Script to generate AI avatars for the 63 companions with empty Avatar_URL fields
// Only generates for female companions to avoid male images

const fetch = require('node-fetch');

// Configuration
const API_BASE = 'https://selira.ai/.netlify/functions';
const BATCH_SIZE = 3; // Small batches to avoid timeouts
const DELAY_BETWEEN_REQUESTS = 5000; // 5 seconds between avatar generations

// Find companions with empty Avatar_URLs
async function findEmptyAvatarCompanions() {
  try {
    console.log('🔍 Finding companions with empty Avatar_URLs...');

    const response = await fetch(`${API_BASE}/selira-characters-fetch`);
    const data = await response.json();

    if (data.success && data.characters) {
      const emptyAvatarCompanions = data.characters.filter(char =>
        char.sex === 'female' && // Only female companions to avoid male images
        (!char.Avatar_URL || char.Avatar_URL === '')
      );

      console.log(`📊 Found ${emptyAvatarCompanions.length} female companions with empty Avatar_URL`);

      if (emptyAvatarCompanions.length > 0) {
        console.log('\n📋 First 10 companions needing avatars:');
        emptyAvatarCompanions.slice(0, 10).forEach((char, index) => {
          console.log(`   ${index + 1}. ${char.Name} (${char.ethnicity || 'unknown'}, ${char.companion_type || 'realistic'})`);
          console.log(`      ID: ${char.id} | Tags: ${(char.Tags || []).join(', ')}`);
          console.log(`      Description: ${(char.Character_Description || '').substring(0, 80)}...`);
        });

        if (emptyAvatarCompanions.length > 10) {
          console.log(`   ... and ${emptyAvatarCompanions.length - 10} more`);
        }
      }

      return emptyAvatarCompanions;
    }

    return [];
  } catch (error) {
    console.error('❌ Error finding companions:', error.message);
    return [];
  }
}

// Generate avatar for a specific companion
async function generateAvatarForCompanion(companion, index, total) {
  try {
    console.log(`\n🎨 [${index + 1}/${total}] Generating avatar for: ${companion.Name}`);
    console.log(`   Style: ${companion.companion_type || 'realistic'}`);
    console.log(`   Ethnicity: ${companion.ethnicity || 'unknown'}`);
    console.log(`   Hair: ${companion.hair_color || 'brown'} ${companion.hair_length || 'medium'}`);
    console.log(`   Tags: ${(companion.Tags || []).join(', ')}`);

    // Create detailed prompt for avatar generation
    const description = companion.Character_Description || '';
    const tags = companion.Tags || [];

    // Build avatar generation payload with correct parameter names
    const avatarPayload = {
      characterName: companion.Name,
      characterTitle: companion.Character_Title || `${companion.ethnicity || 'Beautiful'} ${companion.companion_type || 'Realistic'} Companion`,
      category: companion.Category || 'Romance'
    };

    console.log(`🚀 Calling Replicate avatar generation...`);

    const response = await fetch(`${API_BASE}/selira-generate-companion-avatar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(avatarPayload),
      timeout: 60000 // 60 second timeout
    });

    if (response.ok) {
      const result = await response.json();

      if (result.success && (result.avatarUrl || result.imageUrl)) {
        const avatarUrl = result.avatarUrl || result.imageUrl;
        console.log(`✅ Avatar generated: ${avatarUrl.substring(0, 60)}...`);

        // Update the companion's Avatar_URL in Airtable
        const updateResult = await updateCompanionAvatar(companion.id, avatarUrl);

        if (updateResult.success) {
          console.log(`✅ Updated ${companion.Name} with new avatar URL`);
          return { success: true, avatarUrl: avatarUrl };
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
  console.log('🚀 Starting AI avatar generation for companions with empty Avatar_URLs');
  console.log('⚠️  ONLY generating for female companions\n');

  const emptyAvatarCompanions = await findEmptyAvatarCompanions();

  if (emptyAvatarCompanions.length === 0) {
    console.log('✅ No female companions found with empty Avatar_URLs!');
    return;
  }

  console.log(`\n🔧 Will generate ${emptyAvatarCompanions.length} AI avatars...`);
  console.log(`📦 Processing in batches of ${BATCH_SIZE} with ${DELAY_BETWEEN_REQUESTS/1000}s delays`);

  let processed = 0;
  let successful = 0;
  let failed = 0;
  const results = [];

  // Process in batches
  for (let i = 0; i < emptyAvatarCompanions.length; i += BATCH_SIZE) {
    const batch = emptyAvatarCompanions.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(emptyAvatarCompanions.length / BATCH_SIZE);

    console.log(`\n${'='.repeat(50)}`);
    console.log(`📦 BATCH ${batchNum}/${totalBatches} (${batch.length} companions)`);
    console.log(`${'='.repeat(50)}`);

    for (const companion of batch) {
      const result = await generateAvatarForCompanion(companion, processed, emptyAvatarCompanions.length);
      processed++;

      if (result.success) {
        successful++;
        results.push({
          name: companion.Name,
          id: companion.id,
          status: 'success',
          avatarUrl: avatarUrl
        });
      } else {
        failed++;
        results.push({
          name: companion.Name,
          id: companion.id,
          status: 'failed',
          error: result.error
        });
      }

      // Delay between requests
      if (processed < emptyAvatarCompanions.length) {
        console.log(`⏳ Waiting ${DELAY_BETWEEN_REQUESTS/1000}s before next generation...`);
        await sleep(DELAY_BETWEEN_REQUESTS);
      }
    }

    // Longer delay between batches
    if (i + BATCH_SIZE < emptyAvatarCompanions.length) {
      console.log(`\n🛌 Batch ${batchNum} complete. Waiting 15 seconds before next batch...`);
      await sleep(15000);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 AVATAR GENERATION COMPLETE');
  console.log('='.repeat(60));
  console.log(`✅ Successfully generated: ${successful} avatars`);
  console.log(`❌ Failed to generate: ${failed} avatars`);
  console.log(`📈 Success rate: ${processed > 0 ? ((successful / processed) * 100).toFixed(1) : 0}%`);

  if (successful > 0) {
    console.log(`\n✅ Successfully generated avatars for:`);
    results.filter(r => r.status === 'success').slice(0, 10).forEach(result => {
      console.log(`   - ${result.name}`);
    });
    if (successful > 10) {
      console.log(`   ... and ${successful - 10} more`);
    }
  }

  if (failed > 0) {
    console.log('\n❌ Failed generations:');
    results.filter(r => r.status === 'failed').slice(0, 10).forEach(result => {
      console.log(`   - ${result.name}: ${result.error}`);
    });
    if (failed > 10) {
      console.log(`   ... and ${failed - 10} more failures`);
    }
  }

  console.log('\n🎉 Avatar generation process completed!');
  console.log('💡 Generated avatars will now appear in companion profiles.');
  console.log('🔄 Run this script again to continue with any failed generations.');
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