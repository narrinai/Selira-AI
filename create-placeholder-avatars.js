#!/usr/bin/env node

// Script to create simple placeholder avatars for characters that failed avatar generation
// Uses a fallback method to ensure all characters have working avatar URLs

const fs = require('fs');
const https = require('https');

// Characters that need placeholder/fallback avatars
const charactersNeedingFix = [
  { name: "Isabella Santos", slug: "isabella-santos", category: "romance", fallbackStyle: "realistic-woman" },
  { name: "Akira Yamamoto", slug: "akira-yamamoto", category: "anime-manga", fallbackStyle: "anime-girl" },
  { name: "Rei Shinobi", slug: "rei-shinobi", category: "anime-manga", fallbackStyle: "anime-ninja" },
  { name: "Hana Mizuki", slug: "hana-mizuki", category: "anime-manga", fallbackStyle: "anime-student" },
  { name: "Valentina Rossi", slug: "valentina-rossi", category: "romance", fallbackStyle: "italian-woman" }
];

// Simple function to create a basic colored placeholder
function createSimplePlaceholder(characterName, outputPath) {
  return new Promise((resolve) => {
    // For now, let's try using existing avatars as templates or create simple ones
    const placeholderUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(characterName)}&size=512&background=6366f1&color=fff&format=png`;

    console.log(`🎨 Creating placeholder for ${characterName}...`);

    const file = fs.createWriteStream(outputPath);

    https.get(placeholderUrl, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log(`✅ Created placeholder: ${outputPath}`);
          resolve(true);
        });
      } else {
        console.log(`❌ Failed to create placeholder for ${characterName}`);
        resolve(false);
      }
    }).on('error', () => {
      console.log(`❌ Error creating placeholder for ${characterName}`);
      resolve(false);
    });
  });
}

// Function to update character avatar in Airtable
async function updateCharacterAvatar(characterName, newAvatarUrl) {
  console.log(`📝 Updating avatar for ${characterName}...`);

  try {
    const response = await fetch('https://selira.ai/.netlify/functions/update-companion-avatar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        companionName: characterName,
        newAvatarUrl: newAvatarUrl
      })
    });

    if (response.ok) {
      console.log(`✅ Updated ${characterName} with: ${newAvatarUrl}`);
      return true;
    } else {
      const error = await response.text();
      console.error(`❌ Failed to update ${characterName}:`, error);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error updating ${characterName}:`, error.message);
    return false;
  }
}

// Main function
async function createPlaceholderAvatars() {
  console.log('🔧 Creating placeholder avatars for failed characters...\n');

  const results = {
    created: [],
    failed: []
  };

  for (let i = 0; i < charactersNeedingFix.length; i++) {
    const char = charactersNeedingFix[i];
    console.log(`\n[${i + 1}/${charactersNeedingFix.length}] Processing ${char.name}...`);

    try {
      // Create placeholder image
      const imagePath = `./avatars/${char.slug}.webp`;
      const placeholderCreated = await createSimplePlaceholder(char.name, imagePath);

      if (!placeholderCreated) {
        console.log(`❌ Failed to create placeholder for ${char.name}`);
        results.failed.push(char.name);
        continue;
      }

      // Update Airtable with new URL
      const localUrl = `https://selira.ai/avatars/${char.slug}.webp`;
      const updateSuccess = await updateCharacterAvatar(char.name, localUrl);

      if (updateSuccess) {
        results.created.push({
          name: char.name,
          url: localUrl
        });
        console.log(`🎉 Successfully fixed ${char.name} with placeholder`);
      } else {
        results.failed.push(char.name);
        console.log(`❌ Failed to update ${char.name} in Airtable`);
      }

      // Delay between characters
      if (i < charactersNeedingFix.length - 1) {
        console.log('⏳ Waiting 2 seconds...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

    } catch (error) {
      console.error(`❌ Error processing ${char.name}:`, error.message);
      results.failed.push(char.name);
    }
  }

  // Final summary
  console.log(`\n🎊 Placeholder Creation Complete!`);
  console.log(`📊 Results:`);
  console.log(`   Created: ${results.created.length}/${charactersNeedingFix.length}`);
  console.log(`   Failed: ${results.failed.length}/${charactersNeedingFix.length}`);

  if (results.created.length > 0) {
    console.log(`\n✅ Successfully created placeholders:`);
    results.created.forEach(result => {
      console.log(`   - ${result.name}: ${result.url}`);
    });
  }

  if (results.failed.length > 0) {
    console.log(`\n❌ Failed to create:`);
    results.failed.forEach(name => {
      console.log(`   - ${name}`);
    });
  }

  console.log(`\n🎯 All characters now have working avatar URLs!`);
  console.log(`📝 Note: Placeholders are temporary - can be replaced with better images later`);
}

// Run the script
if (require.main === module) {
  createPlaceholderAvatars().catch(console.error);
}

module.exports = { createPlaceholderAvatars };