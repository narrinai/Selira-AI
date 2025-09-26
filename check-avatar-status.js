#!/usr/bin/env node

// Script to check the current avatar status of all companions

const fetch = require('node-fetch');

// Configuration
const API_BASE = 'https://selira.ai/.netlify/functions';

async function checkAvatarStatus() {
  try {
    console.log('🔍 Analyzing avatar status across all companions...');

    const response = await fetch(`${API_BASE}/selira-characters-fetch`);
    const data = await response.json();

    if (!data.success || !data.characters) {
      console.error('❌ Failed to fetch characters');
      return;
    }

    const characters = data.characters;
    console.log(`📊 Total characters: ${characters.length}`);

    // Categorize by avatar type
    const stats = {
      replicateUrls: [],
      placeholders: [],
      defaultFemale: [],
      defaultMale: [],
      empty: [],
      other: []
    };

    characters.forEach(char => {
      const url = char.Avatar_URL || '';

      if (url.includes('replicate.delivery')) {
        stats.replicateUrls.push(char);
      } else if (url === '/avatars/placeholder.webp' || url === 'https://selira.ai/avatars/placeholder.webp') {
        stats.placeholders.push(char);
      } else if (url === '/avatars/default-female.webp' || url === 'https://selira.ai/avatars/default-female.webp') {
        stats.defaultFemale.push(char);
      } else if (url === '/avatars/default-male.webp' || url === 'https://selira.ai/avatars/default-male.webp') {
        stats.defaultMale.push(char);
      } else if (!url || url === '') {
        stats.empty.push(char);
      } else {
        stats.other.push(char);
      }
    });

    console.log('\n📈 Avatar Status Breakdown:');
    console.log('='.repeat(50));
    console.log(`🎨 AI Generated (Replicate): ${stats.replicateUrls.length}`);
    console.log(`📋 Generic Placeholder: ${stats.placeholders.length}`);
    console.log(`👩 Default Female: ${stats.defaultFemale.length}`);
    console.log(`👨 Default Male: ${stats.defaultMale.length}`);
    console.log(`❌ Empty/No URL: ${stats.empty.length}`);
    console.log(`❓ Other URLs: ${stats.other.length}`);

    // Show some examples of each category
    if (stats.replicateUrls.length > 0) {
      console.log(`\n🎨 AI Generated Avatars (first 5):`);
      stats.replicateUrls.slice(0, 5).forEach(char => {
        console.log(`   - ${char.Name} (${char.sex || 'unknown'}) - ${char.Avatar_URL.substring(0, 50)}...`);
      });
    }

    if (stats.defaultFemale.length > 0) {
      console.log(`\n👩 Female companions with default avatar (first 5):`);
      stats.defaultFemale.slice(0, 5).forEach(char => {
        console.log(`   - ${char.Name} (${char.ethnicity || 'unknown'}, ${char.companion_type || 'realistic'})`);
        console.log(`     Tags: ${(char.Tags || []).join(', ')}`);
      });
    }

    if (stats.placeholders.length > 0) {
      console.log(`\n📋 Companions with placeholder (first 5):`);
      stats.placeholders.slice(0, 5).forEach(char => {
        console.log(`   - ${char.Name} (${char.sex || 'unknown'})`);
      });
    }

    // Show female companions that could benefit from AI avatar generation
    const femaleNeedingAvatars = characters.filter(char =>
      char.sex === 'female' &&
      char.Created_by === 'Selira' &&
      (
        char.Avatar_URL === '/avatars/default-female.webp' ||
        char.Avatar_URL === 'https://selira.ai/avatars/default-female.webp' ||
        char.Avatar_URL === '/avatars/placeholder.webp' ||
        char.Avatar_URL === 'https://selira.ai/avatars/placeholder.webp' ||
        !char.Avatar_URL
      )
    );

    console.log(`\n🎯 Female companions that could use AI avatars: ${femaleNeedingAvatars.length}`);

    if (femaleNeedingAvatars.length > 0) {
      console.log(`\n📋 First 10 female companions needing AI avatars:`);
      femaleNeedingAvatars.slice(0, 10).forEach(char => {
        console.log(`   - ${char.Name} (${char.ethnicity || 'unknown'}, ${char.companion_type || 'realistic'})`);
        console.log(`     ID: ${char.id} | Current: ${char.Avatar_URL || 'empty'}`);
      });
    }

    return {
      total: characters.length,
      replicateCount: stats.replicateUrls.length,
      femaleNeedingAvatars: femaleNeedingAvatars.length,
      companionsNeedingAvatars: femaleNeedingAvatars
    };

  } catch (error) {
    console.error('❌ Error checking avatar status:', error.message);
    return null;
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting avatar status analysis\n');

  const result = await checkAvatarStatus();

  if (result && result.femaleNeedingAvatars > 0) {
    console.log(`\n💡 Recommendation: Generate AI avatars for ${result.femaleNeedingAvatars} female companions`);
    console.log(`   This will replace generic default avatars with personalized AI-generated ones`);
  }
}

// Run the script
main().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});