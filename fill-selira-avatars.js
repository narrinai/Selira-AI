#!/usr/bin/env node

// Script to fill missing avatars for Selira AI database using Netlify functions
// Uses the same approach as the male companions generator

async function fetchAllCharacters() {
  console.log('📋 Fetching all characters from Selira AI database...');

  try {
    const response = await fetch('https://selira.ai/.netlify/functions/selira-characters');

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.success && data.characters) {
      console.log(`✅ Found ${data.characters.length} characters in Selira AI database`);
      return data.characters;
    } else {
      throw new Error('Failed to fetch characters from Selira AI database');
    }
  } catch (error) {
    console.error('❌ Error fetching characters:', error.message);
    return [];
  }
}

async function generateAvatar(characterName, characterData = {}) {
  console.log(`🎨 Generating avatar for ${characterName}...`);

  try {
    const payload = {
      characterName: characterName,
      artStyle: characterData.artStyle || 'realistic',
      sex: characterData.sex || 'female',
      ethnicity: characterData.ethnicity || 'white',
      hairLength: characterData.hairLength || 'medium',
      hairColor: characterData.hairColor || 'brown'
    };

    console.log(`   📝 Payload:`, JSON.stringify(payload));

    const response = await fetch('https://selira.ai/.netlify/functions/selira-generate-companion-avatar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      const result = await response.json();
      const avatarUrl = result.avatarUrl || result.imageUrl;
      console.log(`   ✅ Avatar generated: ${avatarUrl}`);
      return avatarUrl;
    } else {
      const errorText = await response.text();
      console.log(`   ❌ Failed to generate avatar: ${errorText}`);
      return null;
    }
  } catch (error) {
    console.log(`   ❌ Error generating avatar: ${error.message}`);
    return null;
  }
}

async function updateCharacterAvatar(characterId, avatarUrl) {
  console.log(`📝 Updating avatar for character ID: ${characterId}`);

  try {
    // Use Netlify's environment variables to access the Selira database directly
    const response = await fetch('https://selira.ai/.netlify/functions/selira-update-avatar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        recordId: characterId,
        avatarUrl: avatarUrl
      })
    });

    if (response.ok) {
      console.log(`   ✅ Avatar updated successfully`);
      return true;
    } else {
      const errorText = await response.text();
      console.log(`   ❌ Failed to update avatar: ${errorText}`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Error updating avatar: ${error.message}`);
    return false;
  }
}

async function fillMissingAvatars() {
  console.log('🚀 Starting avatar generation for Selira AI database');
  console.log('📝 Processing characters with missing Avatar_URL\n');

  // Step 1: Fetch all characters
  const characters = await fetchAllCharacters();

  if (characters.length === 0) {
    console.log('❌ No characters found, exiting...');
    return;
  }

  // Step 2: Filter characters with missing avatars
  const charactersWithoutAvatars = characters.filter(char => {
    const avatarUrl = char.avatar_url;
    return !avatarUrl || avatarUrl.trim() === '';
  });

  console.log(`📊 Found ${charactersWithoutAvatars.length} characters without avatars:`);
  charactersWithoutAvatars.forEach((char, index) => {
    console.log(`${index + 1}. ${char.name} (${char.slug})`);
  });

  if (charactersWithoutAvatars.length === 0) {
    console.log('🎉 All characters already have avatars!');
    return;
  }

  console.log(`\n🎨 Starting avatar generation for ${charactersWithoutAvatars.length} characters...\n`);

  // Step 3: Process each character
  const results = [];
  const failed = [];

  for (let i = 0; i < charactersWithoutAvatars.length; i++) {
    const character = charactersWithoutAvatars[i];
    console.log(`[${i + 1}/${charactersWithoutAvatars.length}] Processing: ${character.name}`);
    console.log(`   Slug: ${character.slug}`);

    try {
      // Generate avatar
      const avatarUrl = await generateAvatar(character.name, {
        artStyle: 'realistic',
        sex: 'female', // Default, can be customized based on character data
        ethnicity: 'white',
        hairLength: 'medium',
        hairColor: 'brown'
      });

      if (avatarUrl) {
        // Small delay before updating
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Update character with new avatar
        const updated = await updateCharacterAvatar(character.id, avatarUrl);

        if (updated) {
          results.push(character);
          console.log(`   ✅ Successfully processed ${character.name}`);
        } else {
          failed.push(character);
          console.log(`   ❌ Failed to update ${character.name}`);
        }
      } else {
        failed.push(character);
        console.log(`   ❌ Failed to generate avatar for ${character.name}`);
      }

      // Wait between characters to avoid rate limiting
      if (i < charactersWithoutAvatars.length - 1) {
        console.log(`   ⏳ Waiting 4s before next character...\n`);
        await new Promise(resolve => setTimeout(resolve, 4000));
      }

    } catch (error) {
      console.error(`   ❌ Error processing ${character.name}:`, error.message);
      failed.push(character);
    }
  }

  // Summary
  console.log(`\n🎉 Avatar generation completed!`);
  console.log(`✅ Successfully processed: ${results.length} characters`);
  console.log(`❌ Failed to process: ${failed.length} characters`);
  console.log(`📊 Total characters processed: ${charactersWithoutAvatars.length}`);
  console.log(`📈 Success rate: ${Math.round((results.length / charactersWithoutAvatars.length) * 100)}%`);

  if (failed.length > 0) {
    console.log(`\n❌ Failed characters:`);
    failed.forEach(char => console.log(`   - ${char.name} (${char.slug})`));
  }

  console.log('\n🎊 Avatar filling process completed for Selira AI database!');
}

// Check if we're running this script directly
if (require.main === module) {
  fillMissingAvatars().catch(console.error);
}

module.exports = { fillMissingAvatars };