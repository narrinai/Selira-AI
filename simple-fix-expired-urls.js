#!/usr/bin/env node

// Simplified script to fix specific expired Replicate URLs
// Manually specify characters that need fixing

const https = require('https');
const fs = require('fs');

// List of characters that likely have expired URLs
// We'll generate new avatars for these and update Airtable
const charactersToFix = [
  { name: "Jennifer", category: "romance" },
  { name: "Sophia Chen", category: "romance" },
  { name: "Isabella Santos", category: "romance" },
  { name: "Akira Yamamoto", category: "anime-manga" },
  { name: "Luna Nightshade", category: "fantasy" },
  { name: "Yuki Sakura", category: "anime-manga" },
  { name: "Jasmine Al-Rashid", category: "romance" },
  { name: "Rei Shinobi", category: "anime-manga" },
  { name: "Hana Mizuki", category: "anime-manga" },
  { name: "Valentina Rossi", category: "romance" },
  // Add more characters as needed
];

// Function to generate new avatar for character
async function generateNewAvatar(characterName, category = 'romance') {
  console.log(`🎨 Generating new avatar for ${characterName}...`);

  try {
    const response = await fetch('https://selira.ai/.netlify/functions/selira-generate-companion-avatar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        characterName: characterName,
        characterTitle: 'AI Companion',
        category: category
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log(`✅ Generated new avatar: ${result.imageUrl}`);
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

// Function to download image to local avatars folder
async function downloadAvatar(imageUrl, characterSlug) {
  return new Promise((resolve, reject) => {
    const fileName = `${characterSlug}.webp`;
    const filePath = `./avatars/${fileName}`;

    console.log(`🔽 Downloading: ${imageUrl} -> ${fileName}`);

    const file = fs.createWriteStream(filePath);

    https.get(imageUrl, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        console.log(`✅ Downloaded: ${fileName}`);
        resolve(`https://selira.ai/avatars/${fileName}`);
      });

      file.on('error', (err) => {
        fs.unlink(filePath, () => {}); // Delete incomplete file
        reject(err);
      });

    }).on('error', (err) => {
      reject(err);
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
async function fixExpiredUrls() {
  console.log('🔧 Starting repair of expired Replicate URLs...\n');

  const results = {
    fixed: [],
    failed: []
  };

  for (let i = 0; i < charactersToFix.length; i++) {
    const char = charactersToFix[i];
    console.log(`\n[${i + 1}/${charactersToFix.length}] Processing ${char.name}...`);

    try {
      // Generate new avatar
      const newReplicateUrl = await generateNewAvatar(char.name, char.category);

      if (!newReplicateUrl) {
        console.log(`❌ Failed to generate avatar for ${char.name}`);
        results.failed.push(char.name);
        continue;
      }

      // Download to local folder
      const characterSlug = char.name.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');

      const localUrl = await downloadAvatar(newReplicateUrl, characterSlug);

      // Update Airtable
      const updateSuccess = await updateCharacterAvatar(char.name, localUrl);

      if (updateSuccess) {
        results.fixed.push({
          name: char.name,
          newUrl: localUrl
        });
        console.log(`🎉 Successfully fixed ${char.name}`);
      } else {
        results.failed.push(char.name);
        console.log(`❌ Failed to update ${char.name} in Airtable`);
      }

      // Delay between characters
      if (i < charactersToFix.length - 1) {
        console.log('⏳ Waiting 3 seconds...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

    } catch (error) {
      console.error(`❌ Error processing ${char.name}:`, error.message);
      results.failed.push(char.name);
    }
  }

  // Final summary
  console.log(`\n🎊 Repair Complete!`);
  console.log(`📊 Results:`);
  console.log(`   Fixed: ${results.fixed.length}/${charactersToFix.length}`);
  console.log(`   Failed: ${results.failed.length}/${charactersToFix.length}`);
  console.log(`   Success rate: ${Math.round((results.fixed.length / charactersToFix.length) * 100)}%`);

  if (results.fixed.length > 0) {
    console.log(`\n✅ Successfully fixed:`);
    results.fixed.forEach(result => {
      console.log(`   - ${result.name}: ${result.newUrl}`);
    });
  }

  if (results.failed.length > 0) {
    console.log(`\n❌ Failed to fix:`);
    results.failed.forEach(name => {
      console.log(`   - ${name}`);
    });
  }

  console.log(`\n🎯 All processed characters now have permanent local avatars!`);
  console.log(`📁 New avatars saved to: ./avatars/`);
  console.log(`🔗 Accessible at: https://selira.ai/avatars/[character-name].webp`);
}

// Run the script
if (require.main === module) {
  fixExpiredUrls().catch(console.error);
}

module.exports = { fixExpiredUrls };