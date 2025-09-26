#!/usr/bin/env node

// Local script to download Replicate avatars to /avatars/ folder
// and update Avatar_URL fields in Airtable to point to local files

const fetch = require('node-fetch');
const fs = require('fs').promises;
const path = require('path');

const API_BASE = 'https://selira.ai/.netlify/functions';

// Find all characters with Replicate URLs
async function findReplicateAvatars() {
  try {
    console.log('🔍 Finding characters with Replicate URLs...');

    const response = await fetch(`${API_BASE}/selira-characters-fetch`);
    const data = await response.json();

    if (data.success && data.characters) {
      const replicateCharacters = data.characters.filter(char =>
        char.Avatar_URL && char.Avatar_URL.includes('replicate.delivery')
      );

      console.log(`📊 Found ${replicateCharacters.length} characters with Replicate URLs`);

      if (replicateCharacters.length > 0) {
        console.log('\n📋 First 10 characters with Replicate avatars:');
        replicateCharacters.slice(0, 10).forEach((char, index) => {
          console.log(`   ${index + 1}. ${char.Name} (${char.sex || 'unknown'})`);
          console.log(`      URL: ${char.Avatar_URL.substring(0, 60)}...`);
        });
      }

      return replicateCharacters;
    }

    return [];
  } catch (error) {
    console.error('❌ Error finding characters:', error.message);
    return [];
  }
}

// Download avatar and update Airtable
async function downloadAndUpdateAvatar(character, index, total) {
  try {
    const { Name, Avatar_URL, id } = character;
    console.log(`\n📥 [${index + 1}/${total}] Processing: ${Name}`);
    console.log(`   URL: ${Avatar_URL.substring(0, 60)}...`);

    // Generate local filename
    const timestamp = Date.now();
    const slug = Name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const filename = `${slug}-${timestamp}.webp`;
    const localPath = `/avatars/${filename}`;
    const fullLocalPath = path.join(process.cwd(), 'avatars', filename);

    // Ensure avatars directory exists
    const avatarsDir = path.join(process.cwd(), 'avatars');
    try {
      await fs.access(avatarsDir);
    } catch (error) {
      await fs.mkdir(avatarsDir, { recursive: true });
      console.log('📁 Created avatars directory');
    }

    // Download the image from Replicate
    console.log(`🌐 Downloading image...`);
    const imageResponse = await fetch(Avatar_URL);

    if (!imageResponse.ok) {
      throw new Error(`Failed to download: ${imageResponse.status} ${imageResponse.statusText}`);
    }

    const buffer = await imageResponse.buffer();

    // Save the image locally
    await fs.writeFile(fullLocalPath, buffer);
    console.log(`💾 Saved to: ${fullLocalPath}`);

    // Update Airtable record with local URL
    const updateResult = await updateCharacterAvatar(id, localPath);

    if (updateResult.success) {
      console.log(`✅ Updated ${Name} with local avatar URL`);
      return { success: true, localPath: localPath };
    } else {
      console.error(`❌ Failed to update ${Name}: ${updateResult.error}`);
      return { success: false, error: `Update failed: ${updateResult.error}` };
    }

  } catch (error) {
    console.error(`❌ Error processing ${character.Name}:`, error.message);
    return { success: false, error: error.message };
  }
}

// Update companion's Avatar_URL in Airtable
async function updateCharacterAvatar(recordId, avatarUrl) {
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
  console.log('🚀 Starting Replicate avatar download and localization');

  const replicateCharacters = await findReplicateAvatars();

  if (replicateCharacters.length === 0) {
    console.log('✅ No characters found with Replicate URLs!');
    return;
  }

  console.log(`\n🔧 Will download ${replicateCharacters.length} Replicate avatars...`);

  let processed = 0;
  let successful = 0;
  let failed = 0;

  for (const character of replicateCharacters) {
    const result = await downloadAndUpdateAvatar(character, processed, replicateCharacters.length);
    processed++;

    if (result.success) {
      successful++;
    } else {
      failed++;
    }

    // Small delay between downloads
    if (processed < replicateCharacters.length) {
      console.log(`⏳ Waiting 1s before next download...`);
      await sleep(1000);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 DOWNLOAD COMPLETE');
  console.log('='.repeat(60));
  console.log(`✅ Successfully downloaded: ${successful} avatars`);
  console.log(`❌ Failed to download: ${failed} avatars`);
  console.log(`📈 Success rate: ${processed > 0 ? ((successful / processed) * 100).toFixed(1) : 0}%`);

  console.log('\n🎉 Avatar localization process completed!');
  console.log('💡 All Replicate URLs have been downloaded to local /avatars/ folder.');
}

// Handle process termination gracefully
process.on('SIGINT', () => {
  console.log('\n🛑 Process interrupted by user');
  process.exit(0);
});

// Run the script
main().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
