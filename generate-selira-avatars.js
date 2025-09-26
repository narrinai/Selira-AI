const fetch = require('node-fetch');

async function getAllSeliraCompanions() {
  console.log('🔍 Fetching Selira companions via API...');

  const response = await fetch('https://selira.ai/.netlify/functions/selira-characters?limit=1000');

  if (!response.ok) {
    throw new Error(`Failed to fetch Selira companions: ${response.status}`);
  }

  const data = await response.json();
  console.log(`📦 Fetched ${data.characters.length} Selira companions`);

  return data.characters;
}

function findCompanionsWithoutAvatars(companions) {
  console.log('🔎 Analyzing Selira companions for missing avatars...');

  const withoutAvatars = companions.filter(companion => {
    // Check if avatar_url is missing or empty
    return !companion.avatar_url || companion.avatar_url === '';
  });

  console.log(`📊 Found ${withoutAvatars.length} Selira companions without avatars`);

  // Show some statistics
  const totalWithAvatar = companions.filter(c => c.avatar_url && c.avatar_url !== '').length;

  console.log(`📊 Statistics:`);
  console.log(`   - Total companions: ${companions.length}`);
  console.log(`   - With avatars: ${totalWithAvatar}`);
  console.log(`   - Without avatars: ${withoutAvatars.length}`);

  // Show companions without avatars
  if (withoutAvatars.length > 0) {
    console.log(`\n🔍 Companions without avatars:`);
    withoutAvatars.forEach((companion, i) => {
      console.log(`   ${i + 1}. ${companion.name} (${companion.id})`);
      console.log(`      Description: ${companion.description.substring(0, 100)}...`);
      console.log(`      Tags: ${companion.tags?.join(', ') || 'none'}`);
    });
  }

  return withoutAvatars;
}

function extractTraitsFromDescription(description) {
  // Parse traits from description like "A realistic companion with korean features, short brown hair"
  const match = description.match(/A\s+(\w+)\s+companion\s+with\s+(\w+)\s+features,\s+(\w+)\s+(\w+)\s+hair/);

  if (match) {
    const [, style, ethnicity, hairLength, hairColor] = match;
    return {
      style: style, // realistic or anime
      ethnicity: ethnicity,
      hairLength: hairLength,
      hairColor: hairColor,
      sex: 'female' // Default assumption for most companions
    };
  }

  // Fallback defaults
  return {
    style: 'realistic',
    ethnicity: 'white',
    hairLength: 'long',
    hairColor: 'brown',
    sex: 'female'
  };
}

async function generateAvatarForCompanion(companion, retryCount = 0) {
  const name = companion.name;
  const maxRetries = 3;

  console.log(`🖼️ Generating avatar for: ${name}${retryCount > 0 ? ` (retry ${retryCount}/${maxRetries})` : ''}`);

  try {
    // Extract traits from the companion's description
    const traits = extractTraitsFromDescription(companion.description);

    console.log(`   Traits: ${traits.style}, ${traits.sex}, ${traits.ethnicity}, ${traits.hairLength} ${traits.hairColor} hair`);

    const avatarResponse = await fetch('https://selira.ai/.netlify/functions/selira-generate-custom-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customPrompt: 'professional headshot portrait, looking at camera, neutral expression',
        characterName: name,
        category: traits.style === 'anime' ? 'anime-manga' : 'realistic',
        style: traits.style,
        shotType: 'portrait',
        sex: traits.sex,
        ethnicity: traits.ethnicity,
        hairLength: traits.hairLength,
        hairColor: traits.hairColor
      })
    });

    if (avatarResponse.ok) {
      const avatarResult = await avatarResponse.json();
      if (avatarResult.imageUrl) {
        console.log(`✅ Generated avatar for ${name}: ${avatarResult.imageUrl}`);
        return avatarResult.imageUrl;
      } else {
        console.log(`⚠️ No image URL returned for ${name}`);
      }
    } else {
      const errorText = await avatarResponse.text();
      const errorData = JSON.parse(errorText);

      console.log(`⚠️ Avatar generation failed for ${name}: ${avatarResponse.status} - ${errorText}`);

      // Retry logic for 503 errors
      if (avatarResponse.status === 503 && retryCount < maxRetries) {
        const retryAfter = errorData.retryAfter || 10;
        console.log(`   ⏳ Retrying in ${retryAfter} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        return generateAvatarForCompanion(companion, retryCount + 1);
      }

      // For NSFW errors, try with a more conservative prompt
      if (errorText.includes('NSFW content detected') && retryCount < maxRetries) {
        console.log(`   🔄 Trying with conservative prompt...`);
        await new Promise(resolve => setTimeout(resolve, 5000));

        const conservativeResponse = await fetch('https://selira.ai/.netlify/functions/selira-generate-custom-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customPrompt: 'clean portrait headshot, professional photo, neutral facial expression, appropriate clothing',
            characterName: name,
            category: traits.style === 'anime' ? 'anime-manga' : 'realistic',
            style: traits.style,
            shotType: 'portrait',
            sex: traits.sex,
            ethnicity: traits.ethnicity,
            hairLength: traits.hairLength,
            hairColor: traits.hairColor
          })
        });

        if (conservativeResponse.ok) {
          const conservativeResult = await conservativeResponse.json();
          if (conservativeResult.imageUrl) {
            console.log(`✅ Generated conservative avatar for ${name}: ${conservativeResult.imageUrl}`);
            return conservativeResult.imageUrl;
          }
        }
      }
    }
  } catch (error) {
    console.log(`❌ Error generating avatar for ${name}:`, error.message);
  }

  return null;
}

async function updateCompanionAvatar(companionId, avatarUrl) {
  console.log(`💾 Updating Selira companion ${companionId} with avatar: ${avatarUrl}`);

  try {
    const updateResponse = await fetch('https://selira.ai/.netlify/functions/selira-update-avatar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companionId: companionId,
        avatarUrl: avatarUrl
      })
    });

    if (updateResponse.ok) {
      const result = await updateResponse.json();
      console.log(`✅ Successfully updated Airtable: ${result.message}`);
      return true;
    } else {
      const errorText = await updateResponse.text();
      console.log(`❌ Failed to update Airtable: ${updateResponse.status} - ${errorText}`);
      return false;
    }

  } catch (error) {
    console.log(`❌ Error updating Airtable:`, error.message);
    return false;
  }
}

async function main() {
  try {
    console.log('🚀 Starting Selira companion avatar generation process...\n');

    // Get all Selira companions
    const allCompanions = await getAllSeliraCompanions();

    // Find companions without avatars
    const companionsWithoutAvatars = findCompanionsWithoutAvatars(allCompanions);

    if (companionsWithoutAvatars.length === 0) {
      console.log('🎉 All Selira companions already have avatars!');
      return;
    }

    // Option to test with just a few companions first
    const testMode = process.argv.includes('--test');
    const testLimit = testMode ? 3 : companionsWithoutAvatars.length;
    const companionsToProcess = companionsWithoutAvatars.slice(0, testLimit);

    console.log(`\n🎨 Starting avatar generation for ${companionsToProcess.length} companions${testMode ? ' (TEST MODE)' : ''}...\n`);

    let successCount = 0;
    let failCount = 0;
    const results = [];

    // Process companions one by one to avoid rate limits
    for (let i = 0; i < companionsToProcess.length; i++) {
      const companion = companionsWithoutAvatars[i];

      console.log(`\n[${i + 1}/${companionsWithoutAvatars.length}] Processing: ${companion.name}`);

      // Generate avatar
      const avatarUrl = await generateAvatarForCompanion(companion);

      if (avatarUrl) {
        results.push({
          id: companion.id,
          name: companion.name,
          avatarUrl: avatarUrl
        });
        successCount++;

        // For now we'll just collect the results
        await updateCompanionAvatar(companion.id, avatarUrl);
      } else {
        failCount++;
      }

      // Add longer delay between requests to avoid rate limits
      if (i < companionsWithoutAvatars.length - 1) {
        console.log('⏳ Waiting 10 seconds before next companion...');
        await new Promise(resolve => setTimeout(resolve, 10000));
      }

      // Take a longer break every 5 companions to avoid overwhelming the service
      if ((i + 1) % 5 === 0 && i < companionsWithoutAvatars.length - 1) {
        console.log('☕ Taking a 30 second break after 5 companions...');
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
    }

    console.log(`\n📊 Avatar generation complete!`);
    console.log(`✅ Successfully generated: ${successCount} avatars`);
    console.log(`❌ Failed: ${failCount} companions`);

    if (results.length > 0) {
      console.log(`\n📝 Summary of generated avatars:`);
      results.forEach((result, i) => {
        console.log(`${i + 1}. ${result.name} (${result.id})`);
        console.log(`   Avatar: ${result.avatarUrl}`);
      });

      console.log(`\n🔧 To update Airtable, add these Avatar_URL values to the Characters table.`);
    }

  } catch (error) {
    console.error('❌ Error in main process:', error);
    process.exit(1);
  }
}

// Run the script
main();