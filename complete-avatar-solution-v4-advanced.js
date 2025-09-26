const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// V4 Avatar Solution using Advanced AI models
// MeinaHentai v5 for anime, Absolute Reality v1.8.1 for realistic

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
  // Extract traits from companion description
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

// Extreme clothing options for maximum sexuality
function getSexyClothing(style, category = 'default') {
  const categoryClothing = {
    // Anime & Manga - very revealing
    'anime-manga': {
      female: ['sexy school uniform', 'revealing magical girl outfit', 'bikini armor', 'sexy maid outfit', 'revealing anime outfit', 'lingerie style outfit', 'micro bikini']
    },
    anime: {
      female: ['sexy school uniform', 'revealing outfit', 'bikini top', 'sexy maid outfit', 'revealing anime clothes', 'lingerie', 'micro bikini']
    },

    // Cooking & Food - sexy versions
    cooking: {
      female: ['sexy apron only', 'revealing chef outfit', 'apron over lingerie', 'bikini with apron']
    },
    food: {
      female: ['sexy waitress outfit', 'revealing server uniform', 'lingerie uniform', 'micro bikini waitress']
    },

    // Fitness & Sports - very revealing
    fitness: {
      female: ['sports bra only', 'revealing gym wear', 'sexy workout outfit', 'bikini fitness wear', 'micro bikini gym']
    },
    sports: {
      female: ['volleyball bikini', 'athletic bikini', 'sexy sports uniform', 'cheerleader outfit', 'micro bikini sports']
    },

    // Professional & Business - sexy professional
    business: {
      female: ['sexy secretary outfit', 'revealing business dress', 'unbuttoned blouse', 'sexy office wear', 'lingerie business']
    },

    // Default fallback - maximum sexuality
    default: {
      female: ['sexy lingerie', 'revealing dress', 'bikini', 'crop top and mini skirt', 'micro bikini', 'barely covered', 'revealing top']
    }
  };

  // Find matching category or use default
  let clothingOptions = categoryClothing.default;

  const categoryLower = (category || 'default').toLowerCase();
  if (categoryClothing[categoryLower]) {
    clothingOptions = categoryClothing[categoryLower];
  } else {
    for (const [key, value] of Object.entries(categoryClothing)) {
      if (categoryLower.includes(key) || key.includes(categoryLower)) {
        clothingOptions = value;
        break;
      }
    }
  }

  // Select female clothing (since all companions are female)
  const femaleClothing = clothingOptions.female || categoryClothing.default.female;
  return femaleClothing[Math.floor(Math.random() * femaleClothing.length)];
}

async function generateAndDownloadAvatar(companion) {
  const name = companion.name;
  console.log(`🎨 Generating ADVANCED AI avatar for: ${name}`);

  try {
    const traits = extractTraitsFromDescription(companion.description);
    console.log(`   Traits: ${traits.style}, ${traits.sex}, ${traits.ethnicity}, ${traits.hairLength} ${traits.hairColor} hair`);

    // Get random sexy clothing based on companion description
    const category = companion.description.toLowerCase().includes('cooking') ? 'cooking' :
                     companion.description.toLowerCase().includes('fitness') ? 'fitness' :
                     companion.description.toLowerCase().includes('business') ? 'business' : 'default';

    const sexyClothing = getSexyClothing(traits.style, category);
    console.log(`   Clothing: ${sexyClothing}`);

    // Build explicit prompts optimized for Advanced AI models
    let explicitPrompt;
    const isAnimeCategory = traits.style === 'anime';
    const ethnicGender = `${traits.ethnicity} ${traits.sex}`;

    if (isAnimeCategory) {
      // MeinaHentai v5 optimized prompt
      explicitPrompt = `Extremely sexy anime girl, ${ethnicGender}, seductive pose, ${sexyClothing}, revealing outfit, detailed anime art, attractive, flirtatious expression, bedroom background, ecchi style, hentai inspired, sensual lighting, digital anime art, full body, seductive composition, high quality anime artwork, detailed facial features, anime eyes, perfect anatomy, suggestive pose, erotic anime, single character, solo, one person only`;
    } else {
      // Absolute Reality v1.8.1 optimized prompt
      explicitPrompt = `Extremely beautiful sexy ${ethnicGender}, seductive expression, ${sexyClothing}, revealing clothing, sensual pose, attractive, photorealistic, flirtatious expression, intimate bedroom setting, full body shot, sensual photography, attractive model, soft romantic lighting, glamour photography style, alluring pose, eye contact, sharp focus, professional photography, shallow depth of field, sexy photoshoot, erotic photography, single person, solo, one woman only`;
    }

    console.log(`   🔥 ADVANCED PROMPT: ${explicitPrompt}`);

    // Call new Advanced AI function
    const avatarResponse = await fetch('https://selira.ai/.netlify/functions/selira-generate-advanced-image', {
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
        console.log(`✅ Generated ADVANCED: ${avatarResult.imageUrl}`);
        console.log(`   🎨 Model: ${avatarResult.model}`);

        // Download the image immediately
        const filename = `${nameToFilename(name)}-advanced-${Date.now()}.webp`;
        const downloaded = await downloadImage(avatarResult.imageUrl, filename);

        if (downloaded) {
          const localUrl = `https://selira.ai/avatars/${filename}`;
          console.log(`🔗 Local URL: ${localUrl}`);
          return localUrl;
        }
      }
    } else {
      const errorText = await avatarResponse.text();
      console.log(`⚠️ Advanced AI generation failed: ${avatarResponse.status} - ${errorText}`);
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
    console.log('🎨 Starting ADVANCED AI avatar solution V4 (uncensored models)...\\n');

    // Get all companions
    const allCompanions = await getAllSeliraCompanions();

    // Find companions without proper avatars
    const companionsNeedingAvatars = allCompanions.filter(companion => {
      return !companion.avatar_url ||
             companion.avatar_url === '' ||
             companion.avatar_url.includes('replicate.delivery') ||
             companion.avatar_url.includes('placeholder');
    });

    console.log(`🔍 Found ${companionsNeedingAvatars.length} companions needing ADVANCED AI avatars\\n`);

    if (companionsNeedingAvatars.length === 0) {
      console.log('🎉 All companions already have working avatars!');
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < companionsNeedingAvatars.length; i++) {
      const companion = companionsNeedingAvatars[i];

      console.log(`\\n[${i + 1}/${companionsNeedingAvatars.length}] Processing: ${companion.name}`);
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
        console.log('⏳ Waiting 10 seconds...');
        await new Promise(resolve => setTimeout(resolve, 10000));
      }

      // Take longer break every 3 companions
      if ((i + 1) % 3 === 0 && i < companionsNeedingAvatars.length - 1) {
        console.log('☕ Taking a 30 second break...');
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
    }

    console.log(`\\n📊 ADVANCED AI avatar solution V4 finished!`);
    console.log(`✅ Successfully processed: ${successCount} companions`);
    console.log(`❌ Failed: ${failCount} companions`);

    if (successCount > 0) {
      console.log(`\\n🎨 All avatars generated with uncensored Advanced AI models!`);
      console.log(`🎌 Anime companions used: MeinaHentai v5`);
      console.log(`📸 Realistic companions used: Absolute Reality v1.8.1`);
    }

  } catch (error) {
    console.error('❌ Error in main process:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);