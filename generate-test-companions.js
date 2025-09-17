#!/usr/bin/env node

// Script to generate 10 test companions for Selira AI
// Distributes tags across companions for category/filtering testing
// Uses realistic data and proper avatar URLs

const companions = [
  {
    name: "Isabella Rodriguez",
    tags: ["Girlfriend", "Romance", "Flirty"],
    artStyle: "realistic",
    sex: "female",
    ethnicity: "hispanic",
    hairLength: "long",
    hairColor: "black",
    extraInstructions: "A warm and caring companion who loves deep conversations and romantic evenings.",
    avatarUrl: "https://selira.ai/avatars/isabella-rodriguez.webp"
  },
  {
    name: "Yuki Tanaka",
    tags: ["Cute", "Submissive", "Anime"],
    artStyle: "realistic",
    sex: "female",
    ethnicity: "japanese",
    hairLength: "medium",
    hairColor: "brown",
    extraInstructions: "A shy and sweet anime-style companion who loves manga and cute things.",
    avatarUrl: "https://selira.ai/avatars/yuki-tanaka.webp"
  },
  {
    name: "Marcus Thompson",
    tags: ["Boyfriend", "Romance", "Fantasy"],
    artStyle: "realistic",
    sex: "male",
    ethnicity: "black",
    hairLength: "short",
    hairColor: "black",
    extraInstructions: "A charming and adventurous boyfriend who loves fantasy stories and outdoor activities.",
    avatarUrl: "https://selira.ai/avatars/marcus-thompson.webp"
  },
  {
    name: "Elena Volkov",
    tags: ["Ex", "Tsundere", "Seductive"],
    artStyle: "realistic",
    sex: "female",
    ethnicity: "white",
    hairLength: "medium",
    hairColor: "brown",
    extraInstructions: "A complex ex-girlfriend with a tsundere personality - tough exterior but caring inside.",
    avatarUrl: "https://selira.ai/avatars/elena-volkov.webp"
  },
  {
    name: "Aria Moonwhisper",
    tags: ["Fantasy", "Angel", "Companion"],
    artStyle: "anime",
    sex: "female",
    ethnicity: "white",
    hairLength: "long",
    hairColor: "white",
    extraInstructions: "A mystical angel companion from the realm of dreams, wise and ethereal.",
    avatarUrl: "https://selira.ai/avatars/aria-moonwhisper.webp"
  },
  {
    name: "Sakura Maid",
    tags: ["Maid", "Cute", "Submissive"],
    artStyle: "anime",
    sex: "female",
    ethnicity: "japanese",
    hairLength: "short",
    hairColor: "brown",
    extraInstructions: "A dedicated maid who takes pride in her work and caring for others.",
    avatarUrl: "https://selira.ai/avatars/sakura-maid.webp"
  },
  {
    name: "Victoria Sterling",
    tags: ["Boss", "Secretary", "Romance"],
    artStyle: "realistic",
    sex: "female",
    ethnicity: "white",
    hairLength: "medium",
    hairColor: "red",
    extraInstructions: "A powerful CEO who's both your boss and secret romantic interest.",
    avatarUrl: "https://selira.ai/avatars/victoria-sterling.webp"
  },
  {
    name: "Zara Al-Rashid",
    tags: ["Teacher", "Student", "Romance"],
    artStyle: "realistic",
    sex: "female",
    ethnicity: "middle-east",
    hairLength: "long",
    hairColor: "black",
    extraInstructions: "A brilliant university professor who becomes both mentor and romantic interest.",
    avatarUrl: "https://selira.ai/avatars/zara-al-rashid.webp"
  },
  {
    name: "Luna Shadowheart",
    tags: ["Monster", "Yandere", "Fantasy"],
    artStyle: "anime",
    sex: "female",
    ethnicity: "white",
    hairLength: "long",
    hairColor: "purple",
    extraInstructions: "A mysterious monster girl with yandere tendencies - obsessively protective and loving.",
    avatarUrl: "https://selira.ai/avatars/luna-shadowheart.webp"
  },
  {
    name: "Priya Sharma",
    tags: ["Lesbian", "Girlfriend", "Cute"],
    artStyle: "realistic",
    sex: "female",
    ethnicity: "indian",
    hairLength: "medium",
    hairColor: "black",
    extraInstructions: "A loving girlfriend who enjoys poetry, dancing, and quiet moments together.",
    avatarUrl: "https://selira.ai/avatars/priya-sharma.webp"
  }
];

async function createCompanion(companionData) {
  console.log(`Creating companion: ${companionData.name}`);

  try {
    const response = await fetch('https://selira.ai/.netlify/functions/create-character', {
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
        extraInstructions: companionData.extraInstructions,
        visibility: 'public',
        createdBy: 'Test Script',
        userEmail: 'test@selira.ai'
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log(`✅ Created: ${result.character.name} (ID: ${result.character.id})`);
      console.log(`   Tags: ${companionData.tags.join(', ')}`);
      console.log(`   Style: ${companionData.artStyle}, ${companionData.ethnicity}, ${companionData.hairLength} ${companionData.hairColor} hair`);
      return result;
    } else {
      const error = await response.json();
      console.error(`❌ Failed to create ${companionData.name}:`, error);
      return null;
    }
  } catch (error) {
    console.error(`❌ Error creating ${companionData.name}:`, error.message);
    return null;
  }
}

async function createAllCompanions() {
  console.log('🎭 Starting creation of 10 test companions for Selira AI\n');

  const results = [];

  for (let i = 0; i < companions.length; i++) {
    const companion = companions[i];
    console.log(`\n[${i + 1}/10] Creating ${companion.name}...`);

    const result = await createCompanion(companion);
    if (result) {
      results.push(result);
    }

    // Small delay between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\n🎉 Completed! Successfully created ${results.length}/10 companions`);

  // Summary of created companions by tag
  console.log('\n📊 Tag Distribution Summary:');
  const tagCounts = {};
  companions.forEach(comp => {
    comp.tags.forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });

  Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([tag, count]) => {
      console.log(`   ${tag}: ${count} companions`);
    });

  console.log('\n🧪 Ready for category/filtering testing!');
  console.log('You can now test filtering by:');
  console.log('- Tags: Girlfriend, Romance, Cute, Fantasy, etc.');
  console.log('- Art styles: realistic, anime');
  console.log('- Ethnicities: hispanic, japanese, black, white, middle-east, indian');
  console.log('- Hair colors: black, brown, blonde, white, red, purple');
}

// Check if we're running this script directly
if (require.main === module) {
  createAllCompanions().catch(console.error);
}

module.exports = { companions, createAllCompanions };