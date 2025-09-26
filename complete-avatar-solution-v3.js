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

// Exact clothing options from selira-generate-companion-avatar.js
function getSexyClothing(style, category = 'default') {
  const categoryClothing = {
    // Anime & Manga specific - more revealing
    'anime-manga': {
      female: ['sexy school uniform', 'revealing magical girl outfit', 'short kimono', 'crop top sailor uniform', 'sexy maid outfit', 'revealing anime outfit', 'mini skirt and crop top', 'bikini armor']
    },
    anime: {
      female: ['sexy school uniform', 'revealing outfit', 'short kimono', 'bikini top', 'sexy maid outfit', 'revealing anime clothes']
    },

    // Cooking & Food - sexy versions
    cooking: {
      female: ['sexy apron only', 'revealing chef outfit', 'apron over lingerie', 'crop top chef outfit', 'bikini with apron']
    },
    food: {
      female: ['sexy waitress outfit', 'revealing server uniform', 'mini skirt uniform', 'crop top and shorts']
    },

    // Fitness & Sports - already revealing
    fitness: {
      female: ['sports bra and short shorts', 'yoga pants and sports bra', 'revealing gym wear', 'sexy workout outfit', 'bikini fitness wear', 'tight athletic wear']
    },
    sports: {
      female: ['cheerleader outfit', 'volleyball bikini', 'tennis skirt', 'athletic bikini', 'sexy sports uniform']
    },

    // Professional & Business - sexy professional
    business: {
      female: ['sexy secretary outfit', 'revealing business dress', 'short skirt suit', 'unbuttoned blouse', 'sexy office wear']
    },

    // Default fallback - sexy companions
    default: {
      female: ['sexy lingerie', 'revealing dress', 'bikini', 'crop top and mini skirt', 'sexy outfit', 'revealing top', 'sensual clothing']
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
  console.log(`🔥 Generating EXPLICIT avatar for: ${name}`);

  try {
    const traits = extractTraitsFromDescription(companion.description);
    console.log(`   Traits: ${traits.style}, ${traits.sex}, ${traits.ethnicity}, ${traits.hairLength} ${traits.hairColor} hair`);

    // Get random sexy clothing based on companion description (extract category)
    const category = companion.description.toLowerCase().includes('cooking') ? 'cooking' :
                     companion.description.toLowerCase().includes('fitness') ? 'fitness' :
                     companion.description.toLowerCase().includes('business') ? 'business' : 'default';

    const sexyClothing = getSexyClothing(traits.style, category);
    console.log(`   Clothing: ${sexyClothing}`);

    // EXACT prompts from selira-generate-companion-avatar.js createRealisticPortraitPrompt()
    let explicitPrompt;
    const isAnimeCategory = traits.style === 'anime';
    const ethnicGender = `${traits.ethnicity} ${traits.sex}`;

    if (isAnimeCategory) {
      explicitPrompt = `Sexy anime girl, ${ethnicGender}, seductive pose, revealing outfit, detailed anime art, attractive, flirtatious expression, seductive pose, wearing ${sexyClothing}, attractive body, bedroom background, anime art style, sexy anime character, vibrant colors, attractive body, sensual lighting, digital anime art, ecchi style, full body or upper body, seductive composition, high quality anime artwork, detailed facial features, anime eyes, perfect anime anatomy, suggestive pose, single character, solo, one person only`;
    } else {
      explicitPrompt = `Beautiful sexy ${ethnicGender}, seductive expression, revealing clothing, sensual pose, attractive, photorealistic, flirtatious expression, seductive pose, wearing ${sexyClothing}, attractive body, bedroom or intimate setting, full body or upper body shot, sensual photography, attractive model, soft romantic lighting, glamour photography style, alluring pose, eye contact, sharp focus, professional photography, shallow depth of field, sexy photoshoot, single person, solo, one woman only`;
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

      // Handle 503 Service Busy with longer wait
      if (avatarResponse.status === 503) {
        console.log(`   🔄 Service busy, waiting 30 seconds before retrying...`);
        await new Promise(resolve => setTimeout(resolve, 30000));

        const retryResponse = await fetch('https://selira.ai/.netlify/functions/selira-generate-custom-image', {
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

        if (retryResponse.ok) {
          const retryResult = await retryResponse.json();
          if (retryResult.imageUrl) {
            console.log(`✅ Generated on retry: ${retryResult.imageUrl}`);
            const filename = `${nameToFilename(name)}-explicit-retry-${Date.now()}.webp`;
            const downloaded = await downloadImage(retryResult.imageUrl, filename);

            if (downloaded) {
              const localUrl = `https://selira.ai/avatars/${filename}`;
              console.log(`🔗 Local URL: ${localUrl}`);
              return localUrl;
            }
          }
        }
      }

      // Try slightly less explicit prompt for NSFW errors
      if (errorText.includes('NSFW content detected')) {
        console.log(`   🔄 Trying with moderate explicit prompt...`);
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Use more conservative version of real /create prompts
        let moderatePrompt;
        if (isAnimeCategory) {
          moderatePrompt = `anime girl, ${ethnicGender}, attractive pose, anime art style, detailed anime art, appealing expression, anime character, vibrant colors, attractive body, digital anime art, upper body, anime artwork, detailed facial features, anime eyes, single character, solo`;
        } else {
          moderatePrompt = `Beautiful ${ethnicGender}, attractive expression, appealing clothing, confident pose, attractive, photorealistic, professional pose, attractive body, portrait photography, attractive model, professional photography, single person, solo, one woman only`;
        }

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

      // Add longer delay between requests due to API rate limits
      if (i < companionsNeedingAvatars.length - 1) {
        console.log('⏳ Waiting 15 seconds...');
        await new Promise(resolve => setTimeout(resolve, 15000));
      }

      // Take longer break every 3 companions
      if ((i + 1) % 3 === 0 && i < companionsNeedingAvatars.length - 1) {
        console.log('☕ Taking a 60 second break...');
        await new Promise(resolve => setTimeout(resolve, 60000));
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