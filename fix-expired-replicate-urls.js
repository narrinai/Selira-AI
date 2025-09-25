#!/usr/bin/env node

// Script to find and fix expired Replicate URLs in Airtable characters
// Generates new avatars and updates Airtable with local URLs

const https = require('https');
const fs = require('fs');

// Function to check if a URL returns 404
async function checkUrl(url) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: 'HEAD',
      timeout: 5000
    };

    const req = https.request(options, (res) => {
      resolve({
        url: url,
        status: res.statusCode,
        expired: res.statusCode === 404
      });
    });

    req.on('error', () => {
      resolve({
        url: url,
        status: 'ERROR',
        expired: true
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        url: url,
        status: 'TIMEOUT',
        expired: true
      });
    });

    req.end();
  });
}

// Function to get all characters from Airtable
async function getAllCharacters() {
  console.log('📊 Fetching all characters from Airtable...');

  try {
    const response = await fetch('https://selira.ai/.netlify/functions/characters', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const characters = await response.json();
      console.log(`✅ Found ${characters.length} characters in Airtable`);
      return characters;
    } else {
      console.error('❌ Failed to fetch characters from Airtable');
      return [];
    }
  } catch (error) {
    console.error('❌ Error fetching characters:', error.message);
    return [];
  }
}

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

// Main function to fix expired URLs
async function fixExpiredReplicateUrls() {
  console.log('🔍 Starting search for expired Replicate URLs...\n');

  // Step 1: Get all characters
  const characters = await getAllCharacters();
  if (characters.length === 0) {
    console.log('❌ No characters found, exiting');
    return;
  }

  // Step 2: Find characters with Replicate URLs
  console.log('\n🔗 Checking for Replicate URLs...');
  const replicateCharacters = characters.filter(char =>
    char.avatarUrl && char.avatarUrl.includes('replicate.delivery')
  );

  console.log(`📊 Found ${replicateCharacters.length} characters with Replicate URLs`);

  if (replicateCharacters.length === 0) {
    console.log('✅ No Replicate URLs found, all good!');
    return;
  }

  // Step 3: Check which URLs are expired (404)
  console.log('\n⏳ Checking URL status...');
  const expiredCharacters = [];

  for (let i = 0; i < Math.min(replicateCharacters.length, 20); i++) { // Limit to first 20 for testing
    const char = replicateCharacters[i];
    console.log(`[${i + 1}/${Math.min(replicateCharacters.length, 20)}] Checking ${char.name}...`);

    const status = await checkUrl(char.avatarUrl);

    if (status.expired) {
      expiredCharacters.push({
        ...char,
        urlStatus: status
      });
      console.log(`❌ EXPIRED: ${char.name} - ${status.status}`);
    } else {
      console.log(`✅ OK: ${char.name} - ${status.status}`);
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`\n📊 Summary: ${expiredCharacters.length} expired URLs found`);

  if (expiredCharacters.length === 0) {
    console.log('🎉 No expired URLs found!');
    return;
  }

  // Step 4: Fix expired URLs
  console.log('\n🔧 Fixing expired URLs...');

  const results = {
    fixed: [],
    failed: []
  };

  for (let i = 0; i < expiredCharacters.length; i++) {
    const char = expiredCharacters[i];
    console.log(`\n[${i + 1}/${expiredCharacters.length}] Fixing ${char.name}...`);

    try {
      // Generate new avatar
      const newReplicateUrl = await generateNewAvatar(char.name, char.category || 'romance');

      if (!newReplicateUrl) {
        console.log(`❌ Failed to generate avatar for ${char.name}`);
        results.failed.push(char.name);
        continue;
      }

      // Download to local folder
      const characterSlug = char.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
      const localUrl = await downloadAvatar(newReplicateUrl, characterSlug);

      // Update Airtable
      const updateSuccess = await updateCharacterAvatar(char.name, localUrl);

      if (updateSuccess) {
        results.fixed.push({
          name: char.name,
          oldUrl: char.avatarUrl,
          newUrl: localUrl
        });
        console.log(`🎉 Successfully fixed ${char.name}`);
      } else {
        results.failed.push(char.name);
        console.log(`❌ Failed to update ${char.name} in Airtable`);
      }

      // Delay between characters
      if (i < expiredCharacters.length - 1) {
        console.log('⏳ Waiting 3 seconds...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

    } catch (error) {
      console.error(`❌ Error fixing ${char.name}:`, error.message);
      results.failed.push(char.name);
    }
  }

  // Final summary
  console.log(`\n🎊 Repair Complete!`);
  console.log(`📊 Results:`);
  console.log(`   Fixed: ${results.fixed.length}/${expiredCharacters.length}`);
  console.log(`   Failed: ${results.failed.length}/${expiredCharacters.length}`);

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

  console.log(`\n🎯 All expired Replicate URLs have been replaced with permanent local avatars!`);
}

// Run the script
if (require.main === module) {
  fixExpiredReplicateUrls().catch(console.error);
}

module.exports = { fixExpiredReplicateUrls };