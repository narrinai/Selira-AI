#!/usr/bin/env node

// Script to fix empty Avatar_URL fields for characters
// Finds characters with empty Avatar_URL and updates them with placeholder or available URLs

const fetch = require('node-fetch');

// Configuration
const API_BASE = 'https://selira.ai/.netlify/functions';

// Check for characters with empty Avatar_URL fields
async function findEmptyAvatarUrls() {
  try {
    console.log('🔍 Checking for characters with empty Avatar_URL fields...');

    const response = await fetch(`${API_BASE}/selira-characters-fetch`);
    const data = await response.json();

    if (data.success && data.characters) {
      const emptyAvatars = data.characters.filter(char =>
        !char.Avatar_URL ||
        char.Avatar_URL === '' ||
        char.Avatar_URL === '/avatars/placeholder.webp' ||
        char.Avatar_URL === 'https://selira.ai/avatars/placeholder.webp'
      );

      console.log(`📊 Found ${emptyAvatars.length} characters with empty/placeholder Avatar_URL`);

      if (emptyAvatars.length > 0) {
        console.log('\n📋 Characters needing avatar URLs:');
        emptyAvatars.slice(0, 10).forEach(char => {
          console.log(`   - ${char.Name} (${char.sex || 'unknown'}) - ID: ${char.id}`);
          console.log(`     Current: ${char.Avatar_URL || 'empty'}`);
        });

        if (emptyAvatars.length > 10) {
          console.log(`   ... and ${emptyAvatars.length - 10} more`);
        }
      }

      return emptyAvatars;
    }

    return [];
  } catch (error) {
    console.error('❌ Error checking characters:', error.message);
    return [];
  }
}

// Update a character's Avatar_URL
async function updateCharacterAvatar(recordId, newAvatarUrl) {
  try {
    const response = await fetch(`${API_BASE}/selira-update-avatar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        recordId: recordId,
        avatarUrl: newAvatarUrl
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

// Generate placeholder avatar URL based on character properties
function generatePlaceholderUrl(character) {
  // For now, use a better placeholder than the generic one
  if (character.sex === 'female') {
    return 'https://selira.ai/avatars/default-female.webp';
  } else if (character.sex === 'male') {
    return 'https://selira.ai/avatars/default-male.webp';
  } else {
    return 'https://selira.ai/avatars/default-avatar.webp';
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting empty Avatar_URL fix process');

  const emptyAvatarCharacters = await findEmptyAvatarUrls();

  if (emptyAvatarCharacters.length === 0) {
    console.log('✅ No characters found with empty Avatar_URL fields!');
    return;
  }

  console.log(`\n🔧 Will attempt to fix ${emptyAvatarCharacters.length} characters...`);

  let fixed = 0;
  let failed = 0;

  for (const character of emptyAvatarCharacters) { // Process all characters
    try {
      console.log(`\n📝 Processing: ${character.Name} (ID: ${character.id})`);

      // Generate appropriate placeholder
      const newUrl = generatePlaceholderUrl(character);
      console.log(`   New URL: ${newUrl}`);

      const result = await updateCharacterAvatar(character.id, newUrl);

      if (result.success) {
        console.log(`✅ Updated ${character.Name}`);
        fixed++;
      } else {
        console.log(`❌ Failed to update ${character.Name}: ${result.error}`);
        failed++;
      }

      // Small delay between updates
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.error(`❌ Error processing ${character.Name}:`, error.message);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 PROCESS COMPLETE');
  console.log('='.repeat(50));
  console.log(`✅ Successfully fixed: ${fixed} characters`);
  console.log(`❌ Failed to fix: ${failed} characters`);
  console.log(`📈 Success rate: ${fixed > 0 ? ((fixed / (fixed + failed)) * 100).toFixed(1) : 0}%`);
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