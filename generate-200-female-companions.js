#!/usr/bin/env node

// Script to generate 200 diverse female companions with varied traits and avatars

const fetch = require('node-fetch');

// Diverse trait distributions for 200 companions
const traits = {
  // 50/50 split between anime and realistic
  artStyles: [
    { name: 'anime', count: 100 },
    { name: 'realistic', count: 100 }
  ],

  // Diverse ethnicity distribution (using only confirmed valid options)
  ethnicities: [
    { name: 'white', count: 55 },
    { name: 'black', count: 45 },
    { name: 'hispanic', count: 40 },
    { name: 'korean', count: 25 },
    { name: 'japanese', count: 20 },
    { name: 'chinese', count: 15 }
  ],

  // Hair length distribution
  hairLengths: [
    { name: 'short', count: 60 },
    { name: 'medium', count: 80 },
    { name: 'long', count: 60 }
  ],

  // Hair color distribution (using only confirmed valid options)
  hairColors: [
    { name: 'brown', count: 70 },
    { name: 'black', count: 70 },
    { name: 'red', count: 40 },
    { name: 'white', count: 20 }
  ],

  // Tag distribution (using only known valid tags)
  tags: [
    'Girlfriend', 'Romance', 'Cute', 'Seductive', 'Flirty', 'Tsundere', 'Submissive',
    'Teacher', 'Student', 'Boss', 'Secretary', 'Fantasy', 'Angel', 'Monster',
    'Ex', 'Maid', 'Yandere', 'Lesbian'
  ],

  // Categories for companions
  categories: [
    'Romance', 'Fantasy', 'Anime-Manga', 'Professional', 'Student-Life', 'Arts', 'Sports',
    'Gaming', 'Adventure', 'Mystery', 'Supernatural', 'Modern', 'Historical', 'Sci-Fi'
  ]
};

// Helper function to get random weighted selection
function getWeightedRandom(options) {
  const totalWeight = options.reduce((sum, option) => sum + option.count, 0);
  let random = Math.random() * totalWeight;

  for (const option of options) {
    random -= option.count;
    if (random <= 0) {
      return option.name;
    }
  }
  return options[0].name;
}

// Helper function to get random tags (2-4 tags per companion)
function getRandomTags() {
  const numTags = Math.floor(Math.random() * 3) + 2; // 2-4 tags
  const selectedTags = [];
  const availableTags = [...traits.tags];

  for (let i = 0; i < numTags; i++) {
    const randomIndex = Math.floor(Math.random() * availableTags.length);
    selectedTags.push(availableTags.splice(randomIndex, 1)[0]);
  }

  return selectedTags;
}

// Female first names from various cultures
const femaleNames = [
  // Western names
  'Emma', 'Sophia', 'Isabella', 'Mia', 'Charlotte', 'Amelia', 'Harper', 'Evelyn', 'Abigail', 'Emily',
  'Elizabeth', 'Mila', 'Ella', 'Avery', 'Sofia', 'Camila', 'Aria', 'Scarlett', 'Victoria', 'Madison',
  'Luna', 'Grace', 'Chloe', 'Penelope', 'Layla', 'Riley', 'Zoey', 'Nora', 'Lily', 'Eleanor',
  'Hannah', 'Lillian', 'Addison', 'Aubrey', 'Ellie', 'Stella', 'Natalie', 'Zoe', 'Leah', 'Hazel',
  'Violet', 'Aurora', 'Savannah', 'Audrey', 'Brooklyn', 'Bella', 'Claire', 'Skylar', 'Lucy', 'Paisley',

  // Asian names
  'Yuki', 'Sakura', 'Hana', 'Akira', 'Rei', 'Mai', 'Rin', 'Sora', 'Yui', 'Kira',
  'Mei', 'Lin', 'Wei', 'Li', 'Xin', 'Jun', 'Ai', 'Miki', 'Nana', 'Aya',
  'Priya', 'Ananya', 'Kavya', 'Rhea', 'Isha', 'Diya', 'Arya', 'Meera', 'Siya', 'Tara',

  // Hispanic names
  'Sofia', 'Isabella', 'Camila', 'Valentina', 'Valeria', 'Mariana', 'Luciana', 'Daniela', 'Gabriela', 'Victoria',
  'Emilia', 'Maya', 'Elena', 'Natalia', 'Adriana', 'Alejandra', 'Catalina', 'Andrea', 'Carmen', 'Rosa',

  // Arabic/Middle Eastern names
  'Amira', 'Layla', 'Zara', 'Yasmin', 'Aaliyah', 'Fatima', 'Aisha', 'Noor', 'Lila', 'Dalia',
  'Iman', 'Nadia', 'Samira', 'Khadija', 'Maryam', 'Zahra', 'Leila', 'Salma', 'Rania', 'Hala',

  // African names
  'Nia', 'Zara', 'Kira', 'Lila', 'Maya', 'Anya', 'Tara', 'Kaia', 'Zora', 'Amara',
  'Keya', 'Nala', 'Imara', 'Zuri', 'Asha', 'Kesi', 'Jenni', 'Dalila', 'Sanaa', 'Thema'
];

// Last names from various cultures
const lastNames = [
  // Western
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
  'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',

  // Asian
  'Tanaka', 'Yamamoto', 'Watanabe', 'Sato', 'Suzuki', 'Takahashi', 'Nakamura', 'Ito', 'Kimura', 'Hayashi',
  'Chen', 'Wang', 'Li', 'Zhang', 'Liu', 'Yang', 'Huang', 'Wu', 'Zhou', 'Xu',
  'Patel', 'Singh', 'Kumar', 'Sharma', 'Gupta', 'Agarwal', 'Shah', 'Mehta', 'Jain', 'Bansal',

  // Middle Eastern
  'Al-Rashid', 'Hassan', 'Ahmed', 'Mohammed', 'Ali', 'Omar', 'Khan', 'Rahman', 'Malik', 'Shah',

  // Other
  'Andersson', 'Johansson', 'Karlsson', 'Nilsson', 'Eriksson', 'Larsson', 'Olsson', 'Persson', 'Svensson', 'Gustafsson'
];

// Generate companion data
function generateCompanionData() {
  const companions = [];

  for (let i = 0; i < 200; i++) {
    const firstName = femaleNames[Math.floor(Math.random() * femaleNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const name = `${firstName} ${lastName}`;

    const artStyle = getWeightedRandom(traits.artStyles);
    const ethnicity = getWeightedRandom(traits.ethnicities);
    const hairLength = getWeightedRandom(traits.hairLengths);
    const hairColor = getWeightedRandom(traits.hairColors);
    const tags = getRandomTags();
    const category = traits.categories[Math.floor(Math.random() * traits.categories.length)];

    // Generate personality-based description
    const personalityTraits = tags.slice(0, 2); // Use first 2 tags for personality
    const description = generateDescription(name, personalityTraits, category, artStyle);

    companions.push({
      name: name,
      tags: tags,
      artStyle: artStyle,
      sex: 'female',
      ethnicity: ethnicity,
      hairLength: hairLength,
      hairColor: hairColor,
      category: category,
      description: description
    });
  }

  return companions;
}

// Generate description based on traits
function generateDescription(name, traits, category, artStyle) {
  const styleDesc = artStyle === 'anime' ? 'anime-style' : 'realistic';
  const traitDesc = traits.join(' and ');

  const descriptions = [
    `Meet ${name}, a ${traitDesc} ${styleDesc} companion who brings warmth and excitement to every conversation.`,
    `${name} is a ${traitDesc} character with a captivating ${styleDesc} appearance and engaging personality.`,
    `Discover ${name}, your ${traitDesc} companion who combines beauty with intelligence in perfect harmony.`,
    `${name} welcomes you with her ${traitDesc} nature and stunning ${styleDesc} design.`,
    `Experience conversations with ${name}, a ${traitDesc} companion who makes every moment special.`
  ];

  return descriptions[Math.floor(Math.random() * descriptions.length)];
}

// Function to create companion via API
async function createCompanion(companionData) {
  try {
    console.log(`📝 Creating companion: ${companionData.name}`);
    console.log(`   Style: ${companionData.artStyle} | Ethnicity: ${companionData.ethnicity} | Hair: ${companionData.hairLength} ${companionData.hairColor}`);
    console.log(`   Tags: ${companionData.tags.join(', ')}`);

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
        createdBy: '200 Female Companions Generation Script',
        userEmail: 'admin@selira.ai'
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log(`   ✅ Created: ${result.character?.name || companionData.name}`);
      console.log(`   📄 Avatar URL: ${result.character?.avatarUrl || 'Generated'}`);
      return { success: true, data: result, companion: companionData };
    } else {
      const errorText = await response.text();
      console.error(`   ❌ Failed to create ${companionData.name}`);
      console.error(`   📄 Status: ${response.status} ${response.statusText}`);
      console.error(`   📄 Response: ${errorText}`);
      return { success: false, error: errorText, companion: companionData };
    }
  } catch (error) {
    console.error(`   ❌ Error creating ${companionData.name}:`, error.message);
    return { success: false, error: error.message, companion: companionData };
  }
}

async function generate200Companions() {
  console.log('🚀 Starting generation of 200 diverse female companions for Selira AI\n');
  console.log('📊 Distribution:');
  console.log('   Art Styles: 50% Realistic, 50% Anime');
  console.log('   Ethnicities: Diverse global representation');
  console.log('   Hair: Varied lengths and colors');
  console.log('   Tags: 2-4 tags per companion from 48 available');
  console.log('   Sex: 100% Female\n');

  const companions = generateCompanionData();

  console.log('📋 Generated companion data for 200 characters\n');
  console.log('🎯 Starting companion creation process...\n');

  const results = [];
  const failed = [];
  let batchCount = 0;
  const batchSize = 5; // Process in batches of 5

  for (let i = 0; i < companions.length; i += batchSize) {
    batchCount++;
    const batch = companions.slice(i, i + batchSize);
    const currentBatchSize = batch.length;

    console.log(`\n🔄 Processing batch ${batchCount} (${currentBatchSize} companions)`);
    console.log(`   Progress: ${i + currentBatchSize}/200 companions`);

    // Process batch sequentially to avoid overwhelming the API
    for (let j = 0; j < batch.length; j++) {
      const companion = batch[j];
      const absoluteIndex = i + j + 1;

      console.log(`\n[${absoluteIndex}/200] Processing: ${companion.name}`);

      const result = await createCompanion(companion);

      if (result.success) {
        results.push(result);
      } else {
        failed.push(result);
      }

      // Delay between companions to respect rate limits
      if (absoluteIndex < companions.length) {
        console.log('   ⏳ Waiting 5s before next companion...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    // Longer delay between batches
    if (i + batchSize < companions.length) {
      console.log(`\n🔄 Batch ${batchCount} completed. Waiting 15s before next batch...`);
      await new Promise(resolve => setTimeout(resolve, 15000));
    }
  }

  // Final summary
  console.log(`\n\n🎉 Companion generation completed!`);
  console.log(`✅ Successfully created: ${results.length} companions`);
  console.log(`❌ Failed to create: ${failed.length} companions`);
  console.log(`📊 Total processed: ${companions.length} companions`);
  console.log(`📈 Success rate: ${Math.round((results.length / companions.length) * 100)}%`);

  if (failed.length > 0) {
    console.log(`\n❌ Failed companions:`);
    failed.forEach(result => {
      console.log(`   - ${result.companion.name}: ${result.error}`);
    });
  }

  // Statistics
  console.log('\n📊 Final Statistics:');

  // Art style distribution
  const successfulCompanions = results.map(r => r.companion);
  const animeCount = successfulCompanions.filter(c => c.artStyle === 'anime').length;
  const realisticCount = successfulCompanions.filter(c => c.artStyle === 'realistic').length;
  console.log(`   Art Styles: ${animeCount} anime, ${realisticCount} realistic`);

  // Ethnicity distribution
  const ethnicities = {};
  successfulCompanions.forEach(c => {
    ethnicities[c.ethnicity] = (ethnicities[c.ethnicity] || 0) + 1;
  });
  console.log('   Ethnicities:', Object.entries(ethnicities).map(([k, v]) => `${k}: ${v}`).join(', '));

  console.log('\n🎊 All female companions created! Ready for avatar download step.');

  return { results, failed, total: companions.length };
}

// Run the script
if (require.main === module) {
  generate200Companions().catch(console.error);
}

module.exports = { generate200Companions };