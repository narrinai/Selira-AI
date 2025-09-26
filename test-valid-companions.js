#!/usr/bin/env node

// Test script with only valid Airtable options

const fetch = require('node-fetch');

const testCompanions = [
  {
    name: 'Isabella Chen',
    tags: ['Girlfriend', 'Romance'],
    artStyle: 'realistic',
    sex: 'female',
    ethnicity: 'chinese',
    hairLength: 'long',
    hairColor: 'black',
    category: 'Romance',
    description: 'A loving girlfriend companion'
  },
  {
    name: 'Maria Rodriguez',
    tags: ['Cute', 'Flirty'],
    artStyle: 'anime',
    sex: 'female',
    ethnicity: 'hispanic',
    hairLength: 'medium',
    hairColor: 'brown',
    category: 'Romance',
    description: 'A cute and flirty anime companion'
  }
];

async function createCompanion(companionData) {
  try {
    console.log(`📝 Creating: ${companionData.name}`);
    console.log(`   Tags: ${companionData.tags.join(', ')}`);
    console.log(`   Traits: ${companionData.artStyle}, ${companionData.ethnicity}, ${companionData.hairLength} ${companionData.hairColor}`);

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
        createdBy: 'Valid Options Test',
        userEmail: 'admin@selira.ai'
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log(`   ✅ Success: ${result.character?.name}`);
      console.log(`   🎨 Avatar: ${result.character?.avatarUrl}`);
      return true;
    } else {
      const errorText = await response.text();
      console.error(`   ❌ Failed: ${response.status}`);
      console.error(`   📄 Error: ${errorText}`);
      return false;
    }
  } catch (error) {
    console.error(`   ❌ Network error:`, error.message);
    return false;
  }
}

async function testValidOptions() {
  console.log('🧪 Testing companions with valid options only...\n');

  let success = 0;
  let failed = 0;

  for (let i = 0; i < testCompanions.length; i++) {
    const companion = testCompanions[i];
    console.log(`[${i + 1}/${testCompanions.length}] Testing: ${companion.name}`);

    const result = await createCompanion(companion);

    if (result) {
      success++;
    } else {
      failed++;
    }

    if (i < testCompanions.length - 1) {
      console.log('   ⏳ Waiting 3s...\n');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  console.log(`\n🎉 Test completed!`);
  console.log(`✅ Successful: ${success}`);
  console.log(`❌ Failed: ${failed}`);
}

testValidOptions().catch(console.error);