#!/usr/bin/env node

// Script to resume generating 200 diverse female companions
// This script checks existing companions and only creates missing ones

const fetch = require('node-fetch');

// Configuration
const API_BASE = 'https://selira.ai/.netlify/functions';
const TARGET_COUNT = 200;
const BATCH_SIZE = 10; // Process in smaller batches
const DELAY_BETWEEN_REQUESTS = 2000; // 2 seconds between requests

// Diverse trait distributions for 200 companions
const traits = {
  artStyles: [
    { name: 'anime', count: 100 },
    { name: 'realistic', count: 100 }
  ],

  ethnicities: [
    { name: 'white', count: 55 },
    { name: 'black', count: 45 },
    { name: 'hispanic', count: 40 },
    { name: 'korean', count: 25 },
    { name: 'japanese', count: 20 },
    { name: 'chinese', count: 15 }
  ],

  hairLengths: [
    { name: 'short', count: 60 },
    { name: 'medium', count: 80 },
    { name: 'long', count: 60 }
  ],

  hairColors: [
    { name: 'brown', count: 70 },
    { name: 'black', count: 70 },
    { name: 'red', count: 40 },
    { name: 'white', count: 20 }
  ],

  tags: [
    'Girlfriend', 'Romance', 'Cute', 'Seductive', 'Flirty', 'Tsundere', 'Submissive',
    'Teacher', 'Student', 'Boss', 'Secretary', 'Fantasy', 'Angel', 'Monster',
    'Ex', 'Maid', 'Yandere', 'Lesbian'
  ],

  categories: [
    'Romance', 'Fantasy', 'Anime-Manga', 'Professional', 'Student-Life', 'Arts', 'Sports',
    'Gaming', 'Adventure', 'Mystery', 'Supernatural', 'Modern', 'Historical', 'Sci-Fi'
  ]
};

// Names pool for female companions (150+ names)
const femaleNames = [
  'Sophia', 'Emma', 'Olivia', 'Ava', 'Isabella', 'Mia', 'Charlotte', 'Amelia', 'Harper', 'Evelyn',
  'Abigail', 'Emily', 'Elizabeth', 'Mila', 'Ella', 'Avery', 'Sofia', 'Camila', 'Aria', 'Scarlett',
  'Victoria', 'Madison', 'Luna', 'Grace', 'Chloe', 'Penelope', 'Layla', 'Riley', 'Zoey', 'Nora',
  'Lily', 'Eleanor', 'Hannah', 'Lillian', 'Addison', 'Aubrey', 'Ellie', 'Stella', 'Natalie', 'Zoe',
  'Leah', 'Hazel', 'Violet', 'Aurora', 'Savannah', 'Audrey', 'Brooklyn', 'Bella', 'Claire', 'Skylar',
  'Lucy', 'Paisley', 'Everly', 'Anna', 'Caroline', 'Nova', 'Genesis', 'Emilia', 'Kennedy', 'Samantha',
  'Maya', 'Willow', 'Kinsley', 'Naomi', 'Aaliyah', 'Elena', 'Sarah', 'Ariana', 'Allison', 'Gabriella',
  'Alice', 'Madelyn', 'Cora', 'Ruby', 'Eva', 'Serenity', 'Autumn', 'Adeline', 'Hailey', 'Gianna',
  'Valentina', 'Isla', 'Eliana', 'Quinn', 'Nevaeh', 'Ivy', 'Sadie', 'Piper', 'Lydia', 'Alexa',
  'Josephine', 'Emery', 'Julia', 'Delilah', 'Arianna', 'Vivian', 'Kaylee', 'Sophie', 'Brielle', 'Madeline',
  // Japanese names
  'Yuki', 'Sakura', 'Hana', 'Rei', 'Miku', 'Ami', 'Yui', 'Riko', 'Nana', 'Kira',
  'Mei', 'Rin', 'Saki', 'Yua', 'Mio', 'Rio', 'Ema', 'Hina', 'Yuno', 'Akira',
  // Korean names
  'Min-jun', 'So-young', 'Hye-jin', 'Ji-hye', 'Soo-jin', 'Eun-jung', 'Mi-young', 'Jung-hwa', 'Kyung-sook', 'Soon-ja',
  // Hispanic names
  'Isabella', 'Camila', 'Sofia', 'Valentina', 'Natalia', 'Valeria', 'Mariana', 'Luciana', 'Daniela', 'Victoria',
  // Additional diverse names
  'Aaliyah', 'Zara', 'Laila', 'Amara', 'Kira', 'Nyla', 'Zuri', 'Nia', 'Kiara', 'Amina',
  'Fatima', 'Aisha', 'Leila', 'Zaina', 'Samira', 'Nadia', 'Yasmin', 'Iman', 'Safiya', 'Amira'
];

// Check how many female companions already exist
async function checkExistingCompanions() {
  try {
    console.log('📊 Checking existing female companions...');

    const response = await fetch(`${API_BASE}/selira-characters-fetch`);
    const data = await response.json();

    if (data.success && data.characters) {
      const femaleCompanions = data.characters.filter(char =>
        char.sex === 'female' &&
        char.Created_by === 'Selira' &&
        char.Name &&
        femaleNames.includes(char.Name)
      );

      console.log(`✅ Found ${femaleCompanions.length} existing female companions`);
      console.log(`🎯 Need to create ${TARGET_COUNT - femaleCompanions.length} more companions`);

      return {
        existing: femaleCompanions,
        needed: Math.max(0, TARGET_COUNT - femaleCompanions.length),
        existingNames: femaleCompanions.map(c => c.Name)
      };
    }

    return { existing: [], needed: TARGET_COUNT, existingNames: [] };
  } catch (error) {
    console.error('❌ Error checking existing companions:', error.message);
    return { existing: [], needed: TARGET_COUNT, existingNames: [] };
  }
}

// Create weighted array for trait selection
function createWeightedArray(traitList) {
  const weighted = [];
  traitList.forEach(trait => {
    for (let i = 0; i < trait.count; i++) {
      weighted.push(trait.name);
    }
  });
  return weighted;
}

// Shuffle array
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Generate a random female companion
function generateFemaleCompanion(availableNames, usedNames) {
  // Get available name
  const availableNamesList = availableNames.filter(name => !usedNames.has(name));
  if (availableNamesList.length === 0) {
    console.warn('⚠️ No more available names!');
    return null;
  }

  const name = availableNamesList[Math.floor(Math.random() * availableNamesList.length)];
  usedNames.add(name);

  // Create weighted arrays
  const styleArray = createWeightedArray(traits.artStyles);
  const ethnicityArray = createWeightedArray(traits.ethnicities);
  const hairLengthArray = createWeightedArray(traits.hairLengths);
  const hairColorArray = createWeightedArray(traits.hairColors);

  // Random selections
  const artStyle = styleArray[Math.floor(Math.random() * styleArray.length)];
  const ethnicity = ethnicityArray[Math.floor(Math.random() * ethnicityArray.length)];
  const hairLength = hairLengthArray[Math.floor(Math.random() * hairLengthArray.length)];
  const hairColor = hairColorArray[Math.floor(Math.random() * hairColorArray.length)];
  const category = traits.categories[Math.floor(Math.random() * traits.categories.length)];

  // Random 2-4 tags
  const numTags = Math.floor(Math.random() * 3) + 2;
  const shuffledTags = shuffleArray(traits.tags);
  const selectedTags = shuffledTags.slice(0, numTags);

  // Generate personality traits
  const personalities = [
    'playful', 'caring', 'mysterious', 'confident', 'shy', 'adventurous',
    'intellectual', 'artistic', 'athletic', 'nurturing', 'independent', 'romantic'
  ];
  const personality = personalities[Math.floor(Math.random() * personalities.length)];

  // Create title based on tags and personality
  const titles = {
    'Girlfriend': ['Your Sweet Girlfriend', 'Loving Partner', 'Your Romantic Love'],
    'Teacher': ['Caring Teacher', 'Wise Educator', 'Patient Mentor'],
    'Student': ['Bright Student', 'Curious Learner', 'Academic Star'],
    'Boss': ['Confident Leader', 'Executive Boss', 'Corporate Chief'],
    'Secretary': ['Professional Assistant', 'Office Secretary', 'Administrative Expert'],
    'Maid': ['Devoted Maid', 'House Keeper', 'Service Professional'],
    'Angel': ['Guardian Angel', 'Heavenly Being', 'Divine Protector'],
    'Fantasy': ['Fantasy Princess', 'Magical Being', 'Enchanted Soul']
  };

  let title = `${personality.charAt(0).toUpperCase() + personality.slice(1)} Companion`;
  for (const tag of selectedTags) {
    if (titles[tag]) {
      title = titles[tag][Math.floor(Math.random() * titles[tag].length)];
      break;
    }
  }

  return {
    name,
    title,
    description: `Meet ${name}, a ${personality} ${artStyle === 'anime' ? 'anime-style' : 'realistic'} companion. She's ${selectedTags.join(', ').toLowerCase()} and ready to chat with you about anything!`,
    sex: 'female',
    artStyle: artStyle,  // Correct parameter name
    ethnicity,
    hairLength,
    hairColor,
    category,
    tags: selectedTags,
    generateAvatar: true
  };
}

// Sleep function
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Create a single companion
async function createCompanion(companionData, index, total) {
  try {
    console.log(`🎨 Creating companion ${index + 1}/${total}: ${companionData.name} (${companionData.artStyle}, ${companionData.ethnicity})`);

    const response = await fetch(`${API_BASE}/selira-create-companion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(companionData)
    });

    if (response.ok) {
      const result = await response.json();
      if (result.success) {
        console.log(`✅ Created: ${companionData.name} - ${result.character.slug}`);
        console.log(`   Avatar: ${result.character.avatar_url}`);
        return { success: true, companion: result.character };
      } else {
        console.error(`❌ Failed to create ${companionData.name}:`, result.error || 'Unknown error');
        return { success: false, error: result.error };
      }
    } else {
      const errorText = await response.text();
      console.error(`❌ HTTP ${response.status} creating ${companionData.name}:`, errorText);
      return { success: false, error: `HTTP ${response.status}` };
    }
  } catch (error) {
    console.error(`❌ Error creating ${companionData.name}:`, error.message);
    return { success: false, error: error.message };
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting resumed generation of female companions for Selira AI');
  console.log(`🎯 Target: ${TARGET_COUNT} total female companions`);

  // Check existing companions
  const { existing, needed, existingNames } = await checkExistingCompanions();

  if (needed === 0) {
    console.log('🎉 All 200 female companions already exist! No work needed.');
    return;
  }

  console.log(`📝 Starting generation of ${needed} missing companions...`);

  const usedNames = new Set(existingNames);
  const results = {
    success: 0,
    failed: 0,
    errors: []
  };

  // Process in batches
  for (let batch = 0; batch * BATCH_SIZE < needed; batch++) {
    const batchStart = batch * BATCH_SIZE;
    const batchEnd = Math.min(batchStart + BATCH_SIZE, needed);
    const batchSize = batchEnd - batchStart;

    console.log(`\n📦 Processing batch ${batch + 1} (${batchStart + 1}-${batchEnd}/${needed})`);

    for (let i = batchStart; i < batchEnd; i++) {
      const companionData = generateFemaleCompanion(femaleNames, usedNames);

      if (!companionData) {
        console.error('❌ Could not generate companion data - no available names');
        break;
      }

      const result = await createCompanion(companionData, i, needed);

      if (result.success) {
        results.success++;
      } else {
        results.failed++;
        results.errors.push({
          name: companionData.name,
          error: result.error
        });
      }

      // Delay between requests to avoid overwhelming the API
      if (i < batchEnd - 1) {
        console.log(`⏳ Waiting ${DELAY_BETWEEN_REQUESTS/1000}s before next request...`);
        await sleep(DELAY_BETWEEN_REQUESTS);
      }
    }

    // Longer delay between batches
    if (batch * BATCH_SIZE + BATCH_SIZE < needed) {
      console.log(`\n🛌 Batch ${batch + 1} complete. Waiting 10 seconds before next batch...`);
      await sleep(10000);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 GENERATION COMPLETE');
  console.log('='.repeat(60));
  console.log(`✅ Successfully created: ${results.success} companions`);
  console.log(`❌ Failed to create: ${results.failed} companions`);
  console.log(`📈 Success rate: ${((results.success / (results.success + results.failed)) * 100).toFixed(1)}%`);

  if (results.errors.length > 0) {
    console.log('\n❌ Errors encountered:');
    results.errors.slice(0, 10).forEach(error => {
      console.log(`   - ${error.name}: ${error.error}`);
    });
    if (results.errors.length > 10) {
      console.log(`   ... and ${results.errors.length - 10} more errors`);
    }
  }

  console.log('\n🎉 Female companion generation process completed!');
  console.log('💡 The async avatar generation will continue in the background.');
  console.log('   Check back in a few minutes to see the generated avatars.');
}

// Handle process termination gracefully
process.on('SIGINT', () => {
  console.log('\n🛑 Process interrupted by user');
  console.log('💡 You can resume by running this script again - it will only create missing companions');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Process terminated');
  process.exit(0);
});

// Run the script
main().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});