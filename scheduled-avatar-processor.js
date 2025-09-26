#!/usr/bin/env node

// Scheduled Avatar Processor - Runs every X minutes to process companions without avatars
// Designed for production scalability without manual intervention

const fetch = require('node-fetch');

// Configuration
const API_BASE = 'https://selira.ai/.netlify/functions';
const MAX_BATCH_SIZE = 5; // Process max 5 avatars per run to avoid overwhelming API
const RETRY_FAILED_AFTER_HOURS = 2; // Retry failed generations after 2 hours

// Find companions that need avatar generation
async function findCompanionsNeedingAvatars() {
  try {
    console.log(`🔍 [${new Date().toISOString()}] Scanning for companions needing avatars...`);

    const response = await fetch(`${API_BASE}/selira-characters-fetch`);
    const data = await response.json();

    if (!data.success || !data.characters) {
      throw new Error('Failed to fetch characters');
    }

    // Filter for companions without avatars (empty or null Avatar_URL)
    const needingAvatars = data.characters.filter(char =>
      char.sex === 'female' && // Only female companions
      char.Created_by === 'Selira' && // Only Selira-created companions
      (!char.Avatar_URL || char.Avatar_URL === '' || char.Avatar_URL === null)
    );

    console.log(`📊 Found ${needingAvatars.length} companions needing avatars`);

    // Sort by creation date (newest first) for priority processing
    needingAvatars.sort((a, b) => new Date(b.Created_Time || 0) - new Date(a.Created_Time || 0));

    return needingAvatars.slice(0, MAX_BATCH_SIZE); // Limit batch size

  } catch (error) {
    console.error('❌ Error finding companions:', error.message);
    return [];
  }
}

// Generate avatar for a companion
async function generateAvatarForCompanion(companion) {
  try {
    console.log(`🎨 Generating avatar for: ${companion.Name} (${companion.ethnicity || 'unknown'}, ${companion.companion_type || 'realistic'})`);

    const avatarPayload = {
      characterName: companion.Name,
      characterTitle: companion.Character_Title || `${companion.ethnicity || 'Beautiful'} ${companion.companion_type || 'Realistic'} Companion`,
      category: companion.Category || 'Romance'
    };

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
          console.log(`✅ Updated ${companion.Name} in database`);
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

// Main scheduled processing function
async function runScheduledAvatarProcessing() {
  const startTime = Date.now();
  console.log(`\n🚀 [${new Date().toISOString()}] Starting scheduled avatar processing`);
  console.log(`📦 Max batch size: ${MAX_BATCH_SIZE} companions per run`);

  try {
    const companionsNeedingAvatars = await findCompanionsNeedingAvatars();

    if (companionsNeedingAvatars.length === 0) {
      console.log('✅ No companions found needing avatar generation');
      return { processed: 0, successful: 0, failed: 0 };
    }

    console.log(`🔧 Processing ${companionsNeedingAvatars.length} companions...`);

    let successful = 0;
    let failed = 0;

    // Process companions sequentially to avoid API rate limits
    for (const companion of companionsNeedingAvatars) {
      const result = await generateAvatarForCompanion(companion);

      if (result.success) {
        successful++;
      } else {
        failed++;
      }

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n📊 Batch processing complete in ${duration}s:`);
    console.log(`   ✅ Successful: ${successful}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   📈 Success rate: ${((successful / (successful + failed)) * 100).toFixed(1)}%`);

    return { processed: companionsNeedingAvatars.length, successful, failed };

  } catch (error) {
    console.error('💥 Fatal error in scheduled processing:', error.message);
    return { processed: 0, successful: 0, failed: 0, error: error.message };
  }
}

// Self-monitoring and alerting
async function logProcessingStats(stats) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    processed: stats.processed,
    successful: stats.successful,
    failed: stats.failed,
    successRate: stats.successful > 0 ? ((stats.successful / (stats.successful + stats.failed)) * 100).toFixed(1) : 0
  };

  console.log(`📝 Processing stats: ${JSON.stringify(logEntry)}`);

  // In production, you could send this to monitoring service
  // await sendToMonitoring(logEntry);
}

// Main execution
async function main() {
  try {
    const stats = await runScheduledAvatarProcessing();
    await logProcessingStats(stats);

    if (stats.failed > 0 && stats.successful === 0) {
      console.log('⚠️ WARNING: All avatar generations failed - system may need attention');
      process.exit(1);
    }

  } catch (error) {
    console.error('💥 Fatal error in main:', error.message);
    process.exit(1);
  }
}

// Run if called directly (not imported)
if (require.main === module) {
  main();
}

module.exports = { runScheduledAvatarProcessing };
