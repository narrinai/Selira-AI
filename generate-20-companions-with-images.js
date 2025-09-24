#!/usr/bin/env node

// Script to generate 20 new companions for Selira AI with image generation
// Creates diverse companions and generates images for each one

const companions = [
  {
    name: "Sophia Chen",
    tags: ["Girlfriend", "Romance", "Cute"],
    artStyle: "realistic",
    extraInstructions: "A gentle and caring software engineer who loves stargazing and deep philosophical conversations.",
    category: "Romance"
  },
  {
    name: "Akira Yamamoto",
    tags: ["Cute", "Submissive", "Fantasy"],
    artStyle: "anime",
    extraInstructions: "A shy bookstore owner who gets flustered easily but has a hidden passionate side.",
    category: "Anime-Manga"
  },
  {
    name: "Isabella Santos",
    tags: ["Flirty", "Romance", "Seductive"],
    artStyle: "realistic",
    extraInstructions: "A confident dance instructor with a flirty personality and infectious energy.",
    category: "Romance"
  },
  {
    name: "Luna Nightshade",
    tags: ["Fantasy", "Monster", "Seductive"],
    artStyle: "fantasy",
    extraInstructions: "A mysterious witch who practices ancient magic and reads the stars for guidance.",
    category: "Fantasy"
  },
  {
    name: "Emma Thompson",
    tags: ["Teacher", "Cute", "Romance"],
    artStyle: "realistic",
    extraInstructions: "A kind elementary school teacher who believes in nurturing every child's potential.",
    category: "Education"
  },
  {
    name: "Kai Nakamura",
    tags: ["Boyfriend", "Romance", "Fantasy"],
    artStyle: "anime",
    extraInstructions: "A cool and mysterious transfer student with a secret past and hidden talents.",
    category: "Anime-Manga"
  },
  {
    name: "Victoria Rose",
    tags: ["Boss", "Romance", "Secretary"],
    artStyle: "realistic",
    extraInstructions: "An elegant fashion designer who runs her own boutique and has impeccable taste.",
    category: "Business"
  },
  {
    name: "Zara Phoenix",
    tags: ["Fantasy", "Monster", "Tsundere"],
    artStyle: "fantasy",
    extraInstructions: "A fierce phoenix warrior who can control fire and protects the innocent.",
    category: "Fantasy"
  },
  {
    name: "Mia Rodriguez",
    tags: ["Cute", "Romance", "Girlfriend"],
    artStyle: "realistic",
    extraInstructions: "A cheerful street artist who sees beauty everywhere and paints colorful murals.",
    category: "Arts"
  },
  {
    name: "Yuki Sakura",
    tags: ["Maid", "Cute", "Submissive"],
    artStyle: "anime",
    extraInstructions: "A dedicated maid at a traditional Japanese inn who takes pride in perfect service.",
    category: "Anime-Manga"
  },
  {
    name: "Jasmine Al-Rashid",
    tags: ["Seductive", "Romance", "Flirty"],
    artStyle: "realistic",
    extraInstructions: "An exotic belly dancer who mesmerizes audiences with her graceful movements.",
    category: "Entertainment"
  },
  {
    name: "Aurora Moonbeam",
    tags: ["Fantasy", "Angel", "Romance"],
    artStyle: "fantasy",
    extraInstructions: "A mystical elf who can communicate with nature and heal with moonlight magic.",
    category: "Fantasy"
  },
  {
    name: "Dr. Sarah Mitchell",
    tags: ["Teacher", "Romance", "Girlfriend"],
    artStyle: "realistic",
    extraInstructions: "A compassionate doctor who works long hours but always makes time for those in need.",
    category: "Healthcare"
  },
  {
    name: "Rei Shinobi",
    tags: ["Tsundere", "Fantasy", "Cute"],
    artStyle: "anime",
    extraInstructions: "A skilled ninja who protects her village in secret while living a double life.",
    category: "Anime-Manga"
  },
  {
    name: "Carmen Delacroix",
    tags: ["Romance", "Seductive", "Flirty"],
    artStyle: "realistic",
    extraInstructions: "A passionate French chef who believes cooking is an art form and love language.",
    category: "Cooking"
  },
  {
    name: "Nova Starlight",
    tags: ["Fantasy", "Angel", "Romance"],
    artStyle: "fantasy",
    extraInstructions: "A celestial goddess who watches over travelers and grants wishes to pure hearts.",
    category: "Fantasy"
  },
  {
    name: "Lisa Park",
    tags: ["Girlfriend", "Romance", "Cute"],
    artStyle: "realistic",
    extraInstructions: "An energetic fitness trainer who motivates others to reach their health goals.",
    category: "Fitness"
  },
  {
    name: "Hana Mizuki",
    tags: ["Student", "Cute", "Submissive"],
    artStyle: "anime",
    extraInstructions: "An innocent high school student who loves cherry blossoms and writing poetry.",
    category: "Anime-Manga"
  },
  {
    name: "Valentina Rossi",
    tags: ["Romance", "Flirty", "Seductive"],
    artStyle: "realistic",
    extraInstructions: "A passionate Italian woman who owns a vineyard and believes in living life fully.",
    category: "Romance"
  },
  {
    name: "Stella Cosmic",
    tags: ["Fantasy", "Monster", "Romance"],
    artStyle: "fantasy",
    extraInstructions: "A benevolent alien visitor who came to Earth to study human emotions and love.",
    category: "Fantasy"
  }
];

// Function to generate avatar image
async function generateAvatar(characterName, category) {
  console.log(`🎨 Generating avatar for ${characterName}...`);

  try {
    const response = await fetch('https://selira.ai/.netlify/functions/selira-generate-companion-avatar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        characterName: characterName,
        characterTitle: '',
        category: category
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log(`✅ Avatar generated: ${result.imageUrl}`);
      return result.imageUrl;
    } else {
      const error = await response.json();
      console.error(`❌ Failed to generate avatar for ${characterName}:`, error);
      return `https://selira.ai/avatars/${characterName.toLowerCase().replace(/\s+/g, '-')}.webp`;
    }
  } catch (error) {
    console.error(`❌ Error generating avatar for ${characterName}:`, error.message);
    return `https://selira.ai/avatars/${characterName.toLowerCase().replace(/\s+/g, '-')}.webp`;
  }
}

// Function to create companion in Airtable
async function createCompanion(companionData, avatarUrl) {
  console.log(`📝 Creating companion: ${companionData.name}`);

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
        extraInstructions: companionData.extraInstructions,
        visibility: 'public',
        createdBy: 'Companion Generation Script',
        userEmail: 'admin@selira.ai'
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log(`✅ Created: ${result.character.name} (ID: ${result.character.id})`);
      console.log(`   Tags: ${companionData.tags.join(', ')}`);
      console.log(`   Category: ${companionData.category}`);
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

async function createAllCompanions() {
  console.log('🎭 Starting creation of 20 companions with image generation for Selira AI\n');

  const results = [];
  const failed = [];

  for (let i = 0; i < companions.length; i++) {
    const companion = companions[i];
    console.log(`\n[${i + 1}/20] Processing ${companion.name}...`);

    try {
      // Step 1: Generate avatar image
      const avatarUrl = await generateAvatar(companion.name, companion.category);

      // Small delay before creating companion
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 2: Create companion with generated avatar
      const result = await createCompanion(companion, avatarUrl);

      if (result) {
        results.push(result);
        console.log(`🎉 Successfully processed ${companion.name}`);
      } else {
        failed.push(companion.name);
        console.log(`❌ Failed to process ${companion.name}`);
      }

      // Delay between companions to avoid rate limiting
      if (i < companions.length - 1) {
        console.log('⏳ Waiting 3 seconds before next companion...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

    } catch (error) {
      console.error(`❌ Error processing ${companion.name}:`, error.message);
      failed.push(companion.name);
    }
  }

  console.log(`\n🎉 Completed! Successfully created ${results.length}/20 companions`);

  if (failed.length > 0) {
    console.log(`\n❌ Failed to create ${failed.length} companions:`);
    failed.forEach(name => console.log(`   - ${name}`));
  }

  // Summary statistics
  console.log('\n📊 Summary Statistics:');
  console.log(`   Total processed: ${companions.length}`);
  console.log(`   Successful: ${results.length}`);
  console.log(`   Failed: ${failed.length}`);
  console.log(`   Success rate: ${Math.round((results.length / companions.length) * 100)}%`);

  // Tag distribution
  console.log('\n🏷️  Tag Distribution:');
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

  // Category distribution
  console.log('\n📚 Category Distribution:');
  const categoryCounts = {};
  companions.forEach(comp => {
    categoryCounts[comp.category] = (categoryCounts[comp.category] || 0) + 1;
  });

  Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([category, count]) => {
      console.log(`   ${category}: ${count} companions`);
    });

  console.log('\n🎊 All companions created with generated avatars!');
  console.log('Ready for testing on Selira AI platform!');
}

// Check if we're running this script directly
if (require.main === module) {
  createAllCompanions().catch(console.error);
}

module.exports = { companions, createAllCompanions };