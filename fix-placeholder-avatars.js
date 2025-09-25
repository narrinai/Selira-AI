#!/usr/bin/env node

// Script to fix placeholder avatar URLs for companions
// Generates new images for companions that still have placeholder.webp

const companionsWithPlaceholders = [
  { name: "Valentina Rossi", category: "Romance" },
  { name: "Rei Shinobi", category: "Anime-Manga" },
  { name: "Dr. Sarah Mitchell", category: "Healthcare" },
  { name: "Yuki Sakura", category: "Anime-Manga" },
  { name: "Mia Rodriguez", category: "Arts" },
  { name: "Isabella Santos", category: "Romance" },
  { name: "Akira Yamamoto", category: "Anime-Manga" }
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
      return null;
    }
  } catch (error) {
    console.error(`❌ Error generating avatar for ${characterName}:`, error.message);
    return null;
  }
}

// Function to update companion avatar in Airtable
async function updateCompanionAvatar(companionName, newAvatarUrl) {
  console.log(`📝 Updating avatar for ${companionName}...`);

  try {
    // First, find the companion by name
    const findResponse = await fetch(`https://selira.ai/.netlify/functions/characters?search=${encodeURIComponent(companionName)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!findResponse.ok) {
      console.error(`❌ Failed to find companion ${companionName}`);
      return false;
    }

    const companions = await findResponse.json();
    const companion = companions.find(c => c.name === companionName);

    if (!companion) {
      console.error(`❌ Companion ${companionName} not found in results`);
      return false;
    }

    console.log(`🔍 Found companion ${companionName} with ID: ${companion.id}`);

    // Update the avatar URL using a direct Airtable update
    const updateResponse = await fetch(`https://selira.ai/.netlify/functions/update-companion-avatar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        companionId: companion.id,
        newAvatarUrl: newAvatarUrl
      })
    });

    if (updateResponse.ok) {
      console.log(`✅ Updated avatar for ${companionName}`);
      return true;
    } else {
      const error = await updateResponse.text();
      console.error(`❌ Failed to update avatar for ${companionName}:`, error);
      return false;
    }

  } catch (error) {
    console.error(`❌ Error updating avatar for ${companionName}:`, error.message);
    return false;
  }
}

async function fixPlaceholderAvatars() {
  console.log('🔧 Starting to fix placeholder avatars for companions\n');

  const results = {
    successful: [],
    failed: []
  };

  for (let i = 0; i < companionsWithPlaceholders.length; i++) {
    const companion = companionsWithPlaceholders[i];
    console.log(`\n[${i + 1}/${companionsWithPlaceholders.length}] Processing ${companion.name}...`);

    try {
      // Step 1: Generate new avatar image
      const avatarUrl = await generateAvatar(companion.name, companion.category);

      if (!avatarUrl) {
        console.log(`❌ Failed to generate avatar for ${companion.name}`);
        results.failed.push(companion.name);
        continue;
      }

      // Small delay before updating
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 2: Update companion with new avatar
      const updateSuccess = await updateCompanionAvatar(companion.name, avatarUrl);

      if (updateSuccess) {
        results.successful.push({
          name: companion.name,
          avatarUrl: avatarUrl
        });
        console.log(`🎉 Successfully fixed ${companion.name}`);
      } else {
        results.failed.push(companion.name);
        console.log(`❌ Failed to update ${companion.name}`);
      }

      // Delay between companions to avoid rate limiting
      if (i < companionsWithPlaceholders.length - 1) {
        console.log('⏳ Waiting 3 seconds before next companion...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

    } catch (error) {
      console.error(`❌ Error processing ${companion.name}:`, error.message);
      results.failed.push(companion.name);
    }
  }

  console.log(`\n🎉 Completed! Fixed ${results.successful.length}/${companionsWithPlaceholders.length} placeholder avatars`);

  if (results.successful.length > 0) {
    console.log('\n✅ Successfully fixed:');
    results.successful.forEach(result => {
      console.log(`   - ${result.name}: ${result.avatarUrl}`);
    });
  }

  if (results.failed.length > 0) {
    console.log('\n❌ Failed to fix:');
    results.failed.forEach(name => {
      console.log(`   - ${name}`);
    });
  }

  console.log(`\n📊 Success rate: ${Math.round((results.successful.length / companionsWithPlaceholders.length) * 100)}%`);
  console.log('🎊 All placeholder avatars processing completed!');
}

// Check if we're running this script directly
if (require.main === module) {
  fixPlaceholderAvatars().catch(console.error);
}

module.exports = { fixPlaceholderAvatars };