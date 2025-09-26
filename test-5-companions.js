#!/usr/bin/env node

// Test script to generate 5 diverse female companions

const fetch = require('node-fetch');

const testCompanions = [
  {
    name: 'Aria Chen',
    tags: ['Romance', 'Cute'],
    artStyle: 'anime',
    sex: 'female',
    ethnicity: 'asian',
    hairLength: 'long',
    hairColor: 'black',
    category: 'Romance',
    description: 'A lovely anime-style companion with long black hair'
  },
  {
    name: 'Sofia Martinez',
    tags: ['Flirty', 'Confident'],
    artStyle: 'realistic',
    sex: 'female',
    ethnicity: 'hispanic',
    hairLength: 'medium',
    hairColor: 'brown',
    category: 'Romance',
    description: 'A confident and flirty realistic companion'
  },
  {
    name: 'Luna Williams',
    tags: ['Fantasy', 'Mysterious'],
    artStyle: 'anime',
    sex: 'female',
    ethnicity: 'white',
    hairLength: 'long',
    hairColor: 'silver',
    category: 'Fantasy',
    description: 'A mysterious anime fantasy companion'
  },
  {
    name: 'Zara Ahmed',
    tags: ['Seductive', 'Elegant'],
    artStyle: 'realistic',
    sex: 'female',
    ethnicity: 'middle-eastern',
    hairLength: 'medium',
    hairColor: 'black',
    category: 'Romance',
    description: 'An elegant and seductive companion'
  },
  {
    name: 'Priya Patel',
    tags: ['Kind', 'Teacher'],
    artStyle: 'realistic',
    sex: 'female',
    ethnicity: 'indian',
    hairLength: 'short',
    hairColor: 'brown',
    category: 'Professional',
    description: 'A kind teacher companion'
  }
];

async function createCompanion(companionData) {
  try {
    console.log(`📝 Creating companion: ${companionData.name}`);
    console.log(`   Style: ${companionData.artStyle} | Ethnicity: ${companionData.ethnicity} | Hair: ${companionData.hairLength} ${companionData.hairColor}`);

    const response = await fetch('https://selira.ai/.netlify/functions/selira-create-companion', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: companionData.name,
        tags: companionData.tags,
        artStyle: companionData.artStyle,
        sex: companionData.sex,
        ethnicity: companionData.ethnicity,
        hairLength: companionData.hairLength,
        hairColor: companionData.hairColor,
        category: companionData.category,
        extraInstructions: companionData.description,
        visibility: 'public',
        createdBy: 'Test 5 Companions Script',
        userEmail: 'admin@selira.ai'
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log(`   ✅ Created: ${result.character?.name}`);
      console.log(`   📄 Avatar: ${result.character?.avatarUrl}`);
      return { success: true, data: result };
    } else {
      const errorText = await response.text();
      console.error(`   ❌ Failed: ${response.status} ${response.statusText}`);
      console.error(`   📄 Response: ${errorText}`);
      return { success: false, error: errorText };
    }
  } catch (error) {
    console.error(`   ❌ Network error:`, error.message);
    return { success: false, error: error.message };
  }
}

async function test5Companions() {
  console.log('🚀 Testing 5 diverse female companions...\n');

  const results = [];
  const failed = [];

  for (let i = 0; i < testCompanions.length; i++) {
    const companion = testCompanions[i];
    console.log(`[${i + 1}/5] Processing: ${companion.name}`);

    const result = await createCompanion(companion);

    if (result.success) {
      results.push(result);
    } else {
      failed.push({ companion, error: result.error });
    }

    // Wait between companions
    if (i < testCompanions.length - 1) {
      console.log('   ⏳ Waiting 5s before next companion...\n');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  console.log(`\n🎉 Test completed!`);
  console.log(`✅ Successful: ${results.length}`);
  console.log(`❌ Failed: ${failed.length}`);

  if (failed.length > 0) {
    console.log('\n❌ Failed companions:');
    failed.forEach(f => console.log(`   - ${f.companion.name}: ${f.error}`));
  }
}

test5Companions().catch(console.error);