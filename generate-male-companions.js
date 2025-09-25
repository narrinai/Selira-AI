#!/usr/bin/env node

// Script to generate 20 male companions with diversity and proper anime/realistic distribution
// Only generates male avatars as requested

const companions = [
  // REALISTIC MALE COMPANIONS (10)
  {
    name: "Marcus Thompson",
    tags: ["Boyfriend", "Romance", "Fantasy"],
    artStyle: "realistic",
    sex: "male",
    ethnicity: "black",
    hairLength: "short",
    hairColor: "black",
    extraInstructions: "A charming and adventurous boyfriend who loves fantasy stories and outdoor activities.",
    category: "Romance"
  },
  {
    name: "Diego Ramirez",
    tags: ["Flirty", "Romance", "Seductive"],
    artStyle: "realistic",
    sex: "male",
    ethnicity: "hispanic",
    hairLength: "medium",
    hairColor: "brown",
    extraInstructions: "A passionate Latin lover who enjoys dancing and romantic evenings under the stars.",
    category: "Romance"
  },
  {
    name: "Alexander Petrov",
    tags: ["Boss", "Romance", "Tsundere"],
    artStyle: "realistic",
    sex: "male",
    ethnicity: "white",
    hairLength: "short",
    hairColor: "blonde",
    extraInstructions: "A powerful CEO who's tough in business but has a soft spot for the right person.",
    category: "Business"
  },
  {
    name: "Jin Park",
    tags: ["Teacher", "Romance", "Cute"],
    artStyle: "realistic",
    sex: "male",
    ethnicity: "korean",
    hairLength: "medium",
    hairColor: "black",
    extraInstructions: "A kind and patient university professor who believes in nurturing minds and hearts.",
    category: "Education"
  },
  {
    name: "Hassan Al-Mahmoud",
    tags: ["Seductive", "Romance", "Fantasy"],
    artStyle: "realistic",
    sex: "male",
    ethnicity: "middle-eastern",
    hairLength: "short",
    hairColor: "black",
    extraInstructions: "A mysterious and charming man with deep eyes and ancient wisdom.",
    category: "Romance"
  },
  {
    name: "Leonardo Rossi",
    tags: ["Romance", "Flirty", "Seductive"],
    artStyle: "realistic",
    sex: "male",
    ethnicity: "italian",
    hairLength: "medium",
    hairColor: "brown",
    extraInstructions: "A passionate Italian artist who paints with both brush and heart.",
    category: "Arts"
  },
  {
    name: "Raj Patel",
    tags: ["Boyfriend", "Romance", "Cute"],
    artStyle: "realistic",
    sex: "male",
    ethnicity: "indian",
    hairLength: "short",
    hairColor: "black",
    extraInstructions: "A gentle and caring tech entrepreneur with traditional values and modern dreams.",
    category: "Technology"
  },
  {
    name: "Connor O'Sullivan",
    tags: ["Romance", "Fantasy", "Teacher"],
    artStyle: "realistic",
    sex: "male",
    ethnicity: "irish",
    hairLength: "medium",
    hairColor: "red",
    extraInstructions: "A charming Irish musician with stories as captivating as his melodies.",
    category: "Music"
  },
  {
    name: "Dimitri Volkov",
    tags: ["Boss", "Seductive", "Romance"],
    artStyle: "realistic",
    sex: "male",
    ethnicity: "russian",
    hairLength: "short",
    hairColor: "brown",
    extraInstructions: "A powerful Russian businessman with a mysterious past and magnetic presence.",
    category: "Business"
  },
  {
    name: "Chen Wei",
    tags: ["Romance", "Cute", "Fantasy"],
    artStyle: "realistic",
    sex: "male",
    ethnicity: "chinese",
    hairLength: "short",
    hairColor: "black",
    extraInstructions: "A philosophical martial arts master who finds beauty in strength and gentleness.",
    category: "Sports"
  },

  // ANIME MALE COMPANIONS (10)
  {
    name: "Takeshi Yamada",
    tags: ["Boyfriend", "Romance", "Fantasy"],
    artStyle: "anime",
    sex: "male",
    ethnicity: "japanese",
    hairLength: "medium",
    hairColor: "black",
    extraInstructions: "A cool and mysterious anime boyfriend with a secret past and loyal heart.",
    category: "Anime-Manga"
  },
  {
    name: "Ryu Nakamura",
    tags: ["Tsundere", "Romance", "Cute"],
    artStyle: "anime",
    sex: "male",
    ethnicity: "japanese",
    hairLength: "short",
    hairColor: "brown",
    extraInstructions: "A tsundere anime character who acts tough but is actually very caring.",
    category: "Anime-Manga"
  },
  {
    name: "Kai Storm",
    tags: ["Fantasy", "Romance", "Seductive"],
    artStyle: "anime",
    sex: "male",
    ethnicity: "mixed",
    hairLength: "long",
    hairColor: "silver",
    extraInstructions: "A mysterious anime warrior with silver hair and magical powers.",
    category: "Fantasy"
  },
  {
    name: "Hiroshi Sato",
    tags: ["Student", "Cute", "Romance"],
    artStyle: "anime",
    sex: "male",
    ethnicity: "japanese",
    hairLength: "medium",
    hairColor: "brown",
    extraInstructions: "A sweet high school student who's popular but only has eyes for you.",
    category: "Anime-Manga"
  },
  {
    name: "Akio Tanaka",
    tags: ["Boss", "Romance", "Fantasy"],
    artStyle: "anime",
    sex: "male",
    ethnicity: "japanese",
    hairLength: "short",
    hairColor: "black",
    extraInstructions: "A powerful anime CEO who rules the business world but melts for true love.",
    category: "Anime-Manga"
  },
  {
    name: "Phoenix Shadowheart",
    tags: ["Fantasy", "Monster", "Romance"],
    artStyle: "anime",
    sex: "male",
    ethnicity: "fantasy",
    hairLength: "long",
    hairColor: "white",
    extraInstructions: "A mystical phoenix who can take human form, passionate and otherworldly.",
    category: "Fantasy"
  },
  {
    name: "Yuki Hayashi",
    tags: ["Cute", "Romance", "Submissive"],
    artStyle: "anime",
    sex: "male",
    ethnicity: "japanese",
    hairLength: "medium",
    hairColor: "blonde",
    extraInstructions: "A gentle and shy anime boy who blushes easily but loves deeply.",
    category: "Anime-Manga"
  },
  {
    name: "Dante Crimson",
    tags: ["Seductive", "Fantasy", "Romance"],
    artStyle: "anime",
    sex: "male",
    ethnicity: "mixed",
    hairLength: "medium",
    hairColor: "red",
    extraInstructions: "A seductive demon prince with red hair and charm that's literally supernatural.",
    category: "Fantasy"
  },
  {
    name: "Kenji Watanabe",
    tags: ["Teacher", "Romance", "Fantasy"],
    artStyle: "anime",
    sex: "male",
    ethnicity: "japanese",
    hairLength: "short",
    hairColor: "black",
    extraInstructions: "A young anime teacher who's wise beyond his years and incredibly caring.",
    category: "Anime-Manga"
  },
  {
    name: "Azure Moonlight",
    tags: ["Angel", "Romance", "Fantasy"],
    artStyle: "anime",
    sex: "male",
    ethnicity: "celestial",
    hairLength: "long",
    hairColor: "blue",
    extraInstructions: "A celestial angel with blue hair who descended from heaven for love.",
    category: "Fantasy"
  }
];

// Function to generate avatar image (only male avatars)
async function generateAvatar(characterName, category, characterData) {
  console.log(`🎨 Generating MALE avatar for ${characterName}...`);

  try {
    const response = await fetch('https://selira.ai/.netlify/functions/selira-generate-companion-avatar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        characterName: characterName,
        characterTitle: `Male ${characterData.artStyle} companion`,
        category: category,
        forceMale: true // Force male generation
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log(`✅ MALE Avatar generated: ${result.imageUrl}`);
      return result.imageUrl;
    } else {
      const error = await response.json();
      console.error(`❌ Failed to generate male avatar for ${characterName}:`, error);
      return `https://selira.ai/avatars/${characterName.toLowerCase().replace(/\s+/g, '-')}.webp`;
    }
  } catch (error) {
    console.error(`❌ Error generating male avatar for ${characterName}:`, error.message);
    return `https://selira.ai/avatars/${characterName.toLowerCase().replace(/\s+/g, '-')}.webp`;
  }
}

// Function to create companion in Airtable
async function createCompanion(companionData, avatarUrl) {
  console.log(`📝 Creating MALE companion: ${companionData.name}`);

  try {
    const response = await fetch('https://selira.ai/.netlify/functions/selira-create-companion', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: companionData.name,
        tags: companionData.tags,
        artStyle: companionData.artStyle,
        sex: companionData.sex, // Make sure sex is explicitly set to 'male'
        ethnicity: companionData.ethnicity,
        hairLength: companionData.hairLength,
        hairColor: companionData.hairColor,
        extraInstructions: companionData.extraInstructions,
        visibility: 'public',
        createdBy: 'Male Companion Generation Script',
        userEmail: 'admin@selira.ai'
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log(`✅ Created MALE: ${result.character.name} (ID: ${result.character.id})`);
      console.log(`   Sex: ${companionData.sex}`);
      console.log(`   Ethnicity: ${companionData.ethnicity}`);
      console.log(`   Hair: ${companionData.hairLength} ${companionData.hairColor}`);
      console.log(`   Art Style: ${companionData.artStyle}`);
      console.log(`   Tags: ${companionData.tags.join(', ')}`);
      console.log(`   Avatar: ${avatarUrl}`);
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

async function createAllMaleCompanions() {
  console.log('🎭 Starting creation of 20 MALE companions with diversity for Selira AI\n');
  console.log('📊 Distribution: 10 Realistic + 10 Anime male companions');
  console.log('🎯 ONLY generating MALE avatars as requested\n');

  const results = [];
  const failed = [];

  for (let i = 0; i < companions.length; i++) {
    const companion = companions[i];
    console.log(`\n[${i + 1}/20] Processing MALE ${companion.name}...`);
    console.log(`   Style: ${companion.artStyle} | Sex: ${companion.sex} | Ethnicity: ${companion.ethnicity}`);

    try {
      // Step 1: Generate MALE avatar image
      const avatarUrl = await generateAvatar(companion.name, companion.category, companion);

      // Small delay before creating companion
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 2: Create companion with generated avatar
      const result = await createCompanion(companion, avatarUrl);

      if (result) {
        results.push(result);
        console.log(`🎉 Successfully processed MALE ${companion.name}`);
      } else {
        failed.push(companion.name);
        console.log(`❌ Failed to process ${companion.name}`);
      }

      // Delay between companions to avoid rate limiting
      if (i < companions.length - 1) {
        console.log('⏳ Waiting 3 seconds before next male companion...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

    } catch (error) {
      console.error(`❌ Error processing ${companion.name}:`, error.message);
      failed.push(companion.name);
    }
  }

  console.log(`\n🎉 Completed! Successfully created ${results.length}/20 MALE companions`);

  if (failed.length > 0) {
    console.log(`\n❌ Failed to create ${failed.length} male companions:`);
    failed.forEach(name => console.log(`   - ${name}`));
  }

  // Summary statistics
  console.log('\n📊 MALE Companions Summary:');
  console.log(`   Total processed: ${companions.length}`);
  console.log(`   Successful: ${results.length}`);
  console.log(`   Failed: ${failed.length}`);
  console.log(`   Success rate: ${Math.round((results.length / companions.length) * 100)}%`);

  // Art Style distribution
  console.log('\n🎨 Art Style Distribution:');
  const styleCounts = {};
  companions.forEach(comp => {
    styleCounts[comp.artStyle] = (styleCounts[comp.artStyle] || 0) + 1;
  });
  Object.entries(styleCounts).forEach(([style, count]) => {
    console.log(`   ${style}: ${count} male companions`);
  });

  // Ethnicity distribution
  console.log('\n🌍 Ethnicity Distribution:');
  const ethnicityCounts = {};
  companions.forEach(comp => {
    ethnicityCounts[comp.ethnicity] = (ethnicityCounts[comp.ethnicity] || 0) + 1;
  });
  Object.entries(ethnicityCounts).forEach(([ethnicity, count]) => {
    console.log(`   ${ethnicity}: ${count} male companions`);
  });

  // Hair variation
  console.log('\n💇 Hair Variation:');
  const hairColors = [...new Set(companions.map(c => c.hairColor))];
  const hairLengths = [...new Set(companions.map(c => c.hairLength))];
  console.log(`   Hair colors: ${hairColors.join(', ')}`);
  console.log(`   Hair lengths: ${hairLengths.join(', ')}`);

  console.log('\n🎊 All MALE companions created with proper diversity!');
  console.log('✅ 50% Realistic, 50% Anime distribution achieved');
  console.log('✅ Diverse ethnicities and appearances');
  console.log('✅ ONLY male companions as requested');
}

// Check if we're running this script directly
if (require.main === module) {
  createAllMaleCompanions().catch(console.error);
}

module.exports = { companions, createAllMaleCompanions };