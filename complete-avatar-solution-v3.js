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
  console.log('🔍 Fetching ALL Selira companions (using simple batching for now)...');

  // Simple approach: make multiple requests to get more than 100 companions
  // This is a temporary solution until offset pagination is deployed

  let allCompanions = [];
  let attempts = 0;
  const maxAttempts = 20; // Try up to 20 different approaches

  // Method 1: Get the first 100 (default)
  console.log(`📄 Fetching batch 1 (default sort)...`);
  try {
    const response1 = await fetch('https://selira.ai/.netlify/functions/selira-characters?limit=100');
    if (response1.ok) {
      const data1 = await response1.json();
      console.log(`📦 Batch 1: ${data1.characters.length} companions`);
      allCompanions = allCompanions.concat(data1.characters);
    }
  } catch (error) {
    console.warn(`⚠️ Error fetching batch 1:`, error.message);
  }

  await new Promise(resolve => setTimeout(resolve, 1000));

  // Method 2: Get companions sorted differently to get different ones
  console.log(`📄 Fetching batch 2 (reverse sort by name)...`);
  try {
    // This will require updating the Netlify function to support sort direction parameter
    // For now, just try the same endpoint - it might return different results due to Airtable's behavior
    const response2 = await fetch('https://selira.ai/.netlify/functions/selira-characters?limit=100');
    if (response2.ok) {
      const data2 = await response2.json();
      console.log(`📦 Batch 2: ${data2.characters.length} companions`);

      // Add only new companions not already in our list
      const existingSlugs = new Set(allCompanions.map(c => c.slug));
      const newCompanions = data2.characters.filter(c => !existingSlugs.has(c.slug));
      console.log(`📦 Batch 2 new: ${newCompanions.length} new companions`);
      allCompanions = allCompanions.concat(newCompanions);
    }
  } catch (error) {
    console.warn(`⚠️ Error fetching batch 2:`, error.message);
  }

  // Remove duplicates based on slug just to be safe
  const uniqueCompanions = [];
  const seenSlugs = new Set();

  for (const companion of allCompanions) {
    if (!seenSlugs.has(companion.slug)) {
      seenSlugs.add(companion.slug);
      uniqueCompanions.push(companion);
    }
  }

  console.log(`📦 Total unique companions: ${uniqueCompanions.length}`);

  // If we only got 100 or less, warn the user
  if (uniqueCompanions.length <= 100) {
    console.warn('⚠️ WARNING: Only got 100 or fewer companions. There may be more companions not included in this run.');
    console.warn('   Consider deploying the updated Netlify function with offset pagination for complete coverage.');
  }

  return uniqueCompanions;
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

// Stylish clothing options for companion avatars
function getStylishClothing(style, category = 'default') {
  const categoryClothing = {
    // Anime & Manga specific - sexy anime wear
    'anime-manga': {
      female: ['revealing school uniform', 'skimpy magical girl outfit', 'short kimono', 'sexy sailor uniform', 'provocative maid outfit', 'barely-there anime outfit', 'revealing dress', 'seductive costume']
    },
    anime: {
      female: ['revealing school uniform', 'sexy outfit', 'short kimono', 'skimpy top', 'provocative maid outfit', 'seductive anime fashion']
    },
    manga: {
      female: ['sexy manga outfit', 'revealing uniform', 'skimpy dress', 'provocative attire']
    },

    // Cooking & Food - sexy chef wear
    cooking: {
      female: ['sexy apron only', 'revealing chef outfit', 'apron over lingerie', 'skimpy kitchen wear', 'provocative cooking attire']
    },
    food: {
      female: ['sexy waitress outfit', 'revealing server uniform', 'skimpy restaurant attire', 'provocative service wear']
    },

    // Fitness & Sports - sexy athletic wear
    fitness: {
      female: ['revealing sports bra and micro shorts', 'tight yoga pants and crop sports bra', 'skimpy gym wear', 'barely-there workout outfit', 'sexy athletic bikini', 'revealing compression wear']
    },
    sports: {
      female: ['sexy cheerleader outfit', 'skimpy volleyball bikini', 'short tennis skirt', 'revealing athletic uniform', 'provocative sporty crop top']
    },

    // Professional & Business - sexy professional attire
    business: {
      female: ['sexy secretary outfit', 'revealing business dress', 'low-cut office attire', 'provocative work suit', 'seductive corporate wear']
    },

    // Default fallback - sexy companion clothing (pushing boundaries)
    default: {
      female: ['revealing lingerie', 'sexy bikini', 'tight low-cut dress', 'barely-there outfit', 'seductive lingerie', 'skimpy dress', 'provocative outfit']
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
  console.log(`🎨 Generating avatar for: ${name}`);

  try {
    const traits = extractTraitsFromDescription(companion.description);
    console.log(`   Traits: ${traits.style}, ${traits.sex}, ${traits.ethnicity}, ${traits.hairLength} ${traits.hairColor} hair`);

    // Get random sexy clothing based on companion description (extract category)
    const category = companion.description.toLowerCase().includes('cooking') ? 'cooking' :
                     companion.description.toLowerCase().includes('fitness') ? 'fitness' :
                     companion.description.toLowerCase().includes('business') ? 'business' : 'default';

    const stylishClothing = getStylishClothing(traits.style, category);
    console.log(`   Clothing: ${stylishClothing}`);

    // Use same character-aware prompt building as chat/create image generation
    const isAnimeStyle = traits.style === 'anime';

    // Character appearance based on creation flow data
    const genderDescription = traits.sex === 'male' ?
      'handsome man, masculine physique, strong features, well-built' :
      'beautiful woman, feminine physique, attractive features, well-proportioned';

    // Ethnicity descriptions
    const ethnicityMap = {
      'white': 'Caucasian/European features',
      'black': 'African/Black features',
      'indian': 'South Asian/Indian features',
      'middle-east': 'Middle Eastern features',
      'hispanic': 'Hispanic/Latino features',
      'korean': 'Korean features',
      'chinese': 'Chinese features',
      'japanese': 'Japanese features',
      'vietnamese': 'Vietnamese features'
    };

    // Hair length descriptions
    const hairMap = {
      'short': 'short hair',
      'medium': 'medium length hair, shoulder-length hair',
      'long': 'long hair, flowing hair'
    };

    // Hair color descriptions
    const hairColorMap = {
      'brown': 'brown hair',
      'black': 'black hair',
      'blonde': 'blonde hair, golden hair',
      'red': 'red hair, ginger hair',
      'auburn': 'auburn hair, reddish-brown hair',
      'gray': 'gray hair, silver hair',
      'white': 'white hair, platinum hair',
      'purple': 'purple hair, violet hair'
    };

    const ethnicityDesc = ethnicityMap[traits.ethnicity] || 'diverse features';
    const hairLengthDesc = hairMap[traits.hairLength] || 'styled hair';
    const hairColorDesc = hairColorMap[traits.hairColor] || 'brown hair';

    // Build character-aware prompt
    const characterAppearance = `${genderDescription}, ${ethnicityDesc}, ${hairLengthDesc}, ${hairColorDesc}`;

    // Create balanced prompt for companion avatars - attractive but not overly explicit
    const basePrompt = isAnimeStyle ?
      `cute pose, wearing ${stylishClothing}, beautiful appearance, soft lighting` :
      `attractive pose, wearing ${stylishClothing}, beautiful figure, glamour lighting, elegant setting`;

    // Use exact prompts from /create flow that work successfully
    let avatarPrompt;
    if (isAnimeStyle) {
      avatarPrompt = `beautiful anime girl, attractive face, seductive expression, detailed anime art, flirtatious pose, wearing ${stylishClothing}, anime style, vibrant colors, high quality anime artwork, detailed facial features, anime eyes, perfect anatomy, alluring pose, single character, solo`;
    } else {
      avatarPrompt = `beautiful woman, attractive face, seductive expression, alluring pose, wearing ${stylishClothing}, photorealistic, professional photography, soft romantic lighting, glamour photography style, eye contact, sharp focus, attractive model, confident pose, single person, solo`;
    }

    console.log(`   🎨 AVATAR PROMPT: ${avatarPrompt}`);

    // Use Netlify function which has access to Replicate API token
    const avatarResponse = await fetch('https://selira.ai/.netlify/functions/selira-generate-custom-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customPrompt: avatarPrompt,
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
      if (avatarResult.success && avatarResult.imageUrl) {
        console.log(`✅ Generated avatar: ${avatarResult.imageUrl}`);

        // Download the image immediately
        const filename = `${nameToFilename(name)}-avatar-${Date.now()}.webp`;
        const downloaded = await downloadImage(avatarResult.imageUrl, filename);

        if (downloaded) {
          const localUrl = `https://selira.ai/avatars/${filename}`;
          console.log(`🔗 Local URL: ${localUrl}`);
          return localUrl;
        }
      } else {
        console.log(`⚠️ Generation failed: ${avatarResult.error || 'Unknown error'}`);
      }
    } else {
      const errorText = await avatarResponse.text();
      console.log(`⚠️ Avatar generation failed: ${avatarResponse.status} - ${errorText}`);

      // Try conservative prompt for NSFW errors or rate limiting
      if (errorText.includes('NSFW content detected') || errorText.includes('content policy') ||
          avatarResponse.status === 429 || avatarResponse.status === 503) {
        console.log(`   🔄 Trying with more conservative prompt...`);
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Use simple conservative version like /chat does
        const moderatePrompt = isAnimeStyle ?
          `${name} in stylish outfit, alluring pose, anime style` :
          `${name} in fitted dress, attractive pose, glamour lighting`;

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
          if (conservativeResult.success && conservativeResult.imageUrl) {
            console.log(`✅ Generated conservative avatar: ${conservativeResult.imageUrl}`);

            const filename = `${nameToFilename(name)}-conservative-${Date.now()}.webp`;
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
    console.log('🎨 Starting avatar solution V3 (stylish companions)...\n');

    // Get all companions
    const allCompanions = await getAllSeliraCompanions();

    // Find companions without proper avatars
    const companionsNeedingAvatars = allCompanions.filter(companion => {
      return !companion.avatar_url ||
             companion.avatar_url === '' ||
             companion.avatar_url.includes('replicate.delivery') ||
             companion.avatar_url.includes('placeholder');
    });

    console.log(`🔍 Found ${companionsNeedingAvatars.length} companions needing avatars\n`);

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

      // Add longer delay between requests to avoid overwhelming the API
      if (i < companionsNeedingAvatars.length - 1) {
        console.log('⏳ Waiting 20 seconds...');
        await new Promise(resolve => setTimeout(resolve, 20000));
      }

      // Take longer break every 2 companions to be more conservative
      if ((i + 1) % 2 === 0 && i < companionsNeedingAvatars.length - 1) {
        console.log('☕ Taking a 90 second break...');
        await new Promise(resolve => setTimeout(resolve, 90000));
      }
    }

    console.log(`\n📊 Avatar solution V3 finished!`);
    console.log(`✅ Successfully processed: ${successCount} companions`);
    console.log(`❌ Failed: ${failCount} companions`);

    if (successCount > 0) {
      console.log(`\n🎨 All avatars are now using stable local URLs with stylish appearances!`);
    }

  } catch (error) {
    console.error('❌ Error in main process:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);