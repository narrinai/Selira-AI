const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Download image from URL and save to local file
async function downloadImage(url, filename) {
  try {
    console.log(`📥 Downloading: ${filename}`);
    const response = await fetch(url);

    if (!response.ok) {
      console.log(`❌ Download failed: ${response.status}`);
      return false;
    }

    const buffer = await response.buffer();
    const filepath = path.join('./avatars/', filename);

    fs.writeFileSync(filepath, buffer);
    console.log(`✅ Saved: ${filename}`);
    return true;
  } catch (error) {
    console.log(`❌ Download error: ${error.message}`);
    return false;
  }
}

// Convert companion name to filename
function nameToFilename(name) {
  return name.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

async function getAllSeliraCompanions() {
  console.log('🔍 Fetching Selira companions...');

  const response = await fetch('https://selira.ai/.netlify/functions/selira-characters?limit=1000');

  if (!response.ok) {
    throw new Error(`Failed to fetch companions: ${response.status}`);
  }

  const data = await response.json();
  console.log(`📦 Fetched ${data.characters.length} companions`);

  return data.characters;
}

function extractTraitsFromDescription(description) {
  // Fix regex - single backslashes for JavaScript
  const match = description.match(/A\s+(\w+)\s+companion\s+with\s+(\w+)\s+features,\s+(\w+)\s+(\w+)\s+hair/);

  if (match) {
    const [, style, ethnicity, hairLength, hairColor] = match;
    return {
      style: style,
      ethnicity: ethnicity,
      hairLength: hairLength,
      hairColor: hairColor,
      sex: 'female'
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

function getSexyClothing(style) {
  // From selira-generate-companion-avatar.js - the real explicit prompts
  const sexyClothing = {
    anime: [
      'sexy school uniform', 'revealing magical girl outfit', 'short kimono',
      'crop top sailor uniform', 'sexy maid outfit', 'revealing anime outfit',
      'mini skirt and crop top', 'bikini armor', 'bikini top', 'revealing outfit'
    ],
    realistic: [
      'sexy secretary outfit', 'revealing business dress', 'short skirt suit',
      'unbuttoned blouse', 'sexy office wear', 'revealing clothing', 'sensual pose',
      'sports bra and short shorts', 'yoga pants and sports bra', 'revealing gym wear',
      'bikini', 'lingerie style outfit', 'sexy apron only', 'revealing chef outfit'
    ]
  };

  const clothingOptions = sexyClothing[style] || sexyClothing.realistic;
  return clothingOptions[Math.floor(Math.random() * clothingOptions.length)];
}

async function generateAndDownloadAvatar(companion) {
  const name = companion.name;
  console.log(`🔥 Generating EXPLICIT avatar for: ${name}`);

  try {
    const traits = extractTraitsFromDescription(companion.description);
    console.log(`   Traits: ${traits.style}, ${traits.sex}, ${traits.ethnicity}, ${traits.hairLength} ${traits.hairColor} hair`);

    // Get random sexy clothing
    const sexyClothing = getSexyClothing(traits.style);
    console.log(`   Clothing: ${sexyClothing}`);

    // EXPLICIT prompts from the real /create flow
    let explicitPrompt;
    if (traits.style === 'anime') {
      explicitPrompt = `Sexy anime girl, ${traits.ethnicity} ${traits.sex}, seductive pose, ${sexyClothing}, revealing outfit, detailed anime art, attractive, sensual expression, alluring, exposed skin, sexy pose`;
    } else {
      explicitPrompt = `Beautiful sexy ${traits.ethnicity} ${traits.sex}, seductive expression, ${sexyClothing}, revealing clothing, sensual pose, attractive, photorealistic, exposed skin, alluring gaze, sexy confident look, seductive body language`;
    }

    console.log(`   🔥 EXPLICIT PROMPT: ${explicitPrompt}`);

    const avatarResponse = await fetch('https://selira.ai/.netlify/functions/selira-generate-custom-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customPrompt: explicitPrompt,
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
        console.log(`✅ Generated EXPLICIT: ${avatarResult.imageUrl}`);

        // Download the image immediately
        const filename = `${nameToFilename(name)}-explicit-${Date.now()}.webp`;
        const downloaded = await downloadImage(avatarResult.imageUrl, filename);

        if (downloaded) {
          const localUrl = `https://selira.ai/avatars/${filename}`;
          console.log(`🔗 Local URL: ${localUrl}`);
          return localUrl;
        }
      }
    } else {
      const errorText = await avatarResponse.text();
      console.log(`⚠️ Avatar generation failed: ${avatarResponse.status} - ${errorText}`);

      // Try slightly less explicit prompt for NSFW errors
      if (errorText.includes('NSFW content detected')) {
        console.log(`   🔄 Trying with moderate explicit prompt...`);
        await new Promise(resolve => setTimeout(resolve, 5000));

        const moderatePrompt = `attractive ${traits.ethnicity} ${traits.sex}, seductive pose, revealing clothing, sensual expression, appealing look, confident pose, attractive features, alluring gaze`;

        const conservativeResponse = await fetch('https://selira.ai/.netlify/functions/selira-generate-custom-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customPrompt: moderatePrompt,
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
            console.log(`✅ Generated moderate explicit: ${conservativeResult.imageUrl}`);

            const filename = `${nameToFilename(name)}-moderate-${Date.now()}.webp`;
            const downloaded = await downloadImage(conservativeResult.imageUrl, filename);

            if (downloaded) {
              const localUrl = `https://selira.ai/avatars/${filename}`;
              console.log(`🔗 Local URL: ${localUrl}`);
              return localUrl;
            }
          }
        }
      }
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }

  return null;
}

async function updateCompanionAvatar(companionId, avatarUrl, name) {
  console.log(`💾 Updating ${name} in Airtable`);

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
      console.log(`✅ Success: ${result.message}`);
      return true;
    } else {
      const errorText = await updateResponse.text();
      console.log(`❌ Failed: ${updateResponse.status} - ${errorText}`);
      return false;
    }

  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return false;
  }
}

async function main() {
  try {
    console.log('🔥 Starting EXPLICIT avatar solution V3 (max sexuality)...\n');

    // Get all companions
    const allCompanions = await getAllSeliraCompanions();

    // Find companions without proper avatars
    const companionsNeedingAvatars = allCompanions.filter(companion => {
      return !companion.avatar_url ||
             companion.avatar_url === '' ||
             companion.avatar_url.includes('replicate.delivery') ||
             companion.avatar_url.includes('placeholder');
    });

    console.log(`🔍 Found ${companionsNeedingAvatars.length} companions needing EXPLICIT avatars\n`);

    if (companionsNeedingAvatars.length === 0) {
      console.log('🎉 All companions already have working avatars!');
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < companionsNeedingAvatars.length; i++) {
      const companion = companionsNeedingAvatars[i];

      console.log(`\n[${i + 1}/${companionsNeedingAvatars.length}] Processing: ${companion.name}`);
      console.log(`   Description sample: ${companion.description.substring(0, 100)}...`);

      // Generate, download and get local URL
      const localAvatarUrl = await generateAndDownloadAvatar(companion);

      if (localAvatarUrl) {
        // Update Airtable with local URL
        const updated = await updateCompanionAvatar(companion.id, localAvatarUrl, companion.name);
        if (updated) {
          successCount++;
        } else {
          failCount++;
        }
      } else {
        failCount++;
      }

      // Add delay between requests
      if (i < companionsNeedingAvatars.length - 1) {
        console.log('⏳ Waiting 8 seconds...');
        await new Promise(resolve => setTimeout(resolve, 8000));
      }

      // Take longer break every 5 companions
      if ((i + 1) % 5 === 0 && i < companionsNeedingAvatars.length - 1) {
        console.log('☕ Taking a 30 second break...');
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
    }

    console.log(`\n📊 EXPLICIT avatar solution V3 finished!`);
    console.log(`✅ Successfully processed: ${successCount} companions`);
    console.log(`❌ Failed: ${failCount} companions`);

    if (successCount > 0) {
      console.log(`\n🔥 All avatars are now using stable local URLs with MAXIMUM SEXUALITY!`);
    }

  } catch (error) {
    console.error('❌ Error in main process:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);