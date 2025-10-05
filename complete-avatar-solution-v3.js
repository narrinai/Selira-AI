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
  console.log('🔍 Fetching ALL companions using proper pagination...');

  let allCompanions = [];
  const seenSlugs = new Set();
  let offset = null;
  let batchNumber = 1;

  // Use proper pagination to get ALL companions
  while (true) {
    console.log(`📄 Batch ${batchNumber}: Fetching companions${offset ? ` with offset ${offset}` : ''}...`);

    try {
      let url = 'https://selira.ai/.netlify/functions/selira-characters?limit=200&includePrivate=true';
      if (offset) {
        url += `&offset=${offset}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        console.log(`❌ HTTP error: ${response.status}`);
        break;
      }

      const data = await response.json();
      console.log(`📦 Batch ${batchNumber}: ${data.characters.length} companions received, offset: ${data.offset || 'null'}`);

      // If no characters returned, we've reached the end
      if (!data.characters || data.characters.length === 0) {
        console.log('✅ No more companions to fetch - reached end of database');
        break;
      }

      // Add new companions to our collection
      let newCompanions = 0;
      data.characters.forEach(companion => {
        if (!seenSlugs.has(companion.slug)) {
          seenSlugs.add(companion.slug);
          allCompanions.push(companion);
          newCompanions++;
        }
      });

      console.log(`📦 Batch ${batchNumber}: ${newCompanions} new companions added (${allCompanions.length} total)`);

      // Check if there's an offset for next batch
      if (!data.offset) {
        console.log('✅ No offset returned - reached end of database');
        break;
      }

      offset = data.offset;
      batchNumber++;

      // Rate limiting - wait between requests
      await new Promise(resolve => setTimeout(resolve, 1500));

    } catch (error) {
      console.warn(`⚠️ Error fetching batch ${batchNumber}:`, error.message);
      break;
    }
  }

  console.log(`📦 Total unique companions collected: ${allCompanions.length}`);

  // Debug: Show companions without avatar_url
  const companionsWithoutAvatars = allCompanions.filter(c => !c.avatar_url || c.avatar_url === null || c.avatar_url === '');
  console.log(`🔍 Companions without avatar_url: ${companionsWithoutAvatars.length}`);
  companionsWithoutAvatars.forEach(c => {
    console.log(`   - ${c.slug}: avatar_url = ${c.avatar_url}`);
  });

  return allCompanions;
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
      female: ['extremely revealing school uniform', 'micro bikini', 'ultra-short kimono', 'barely-there top', 'almost naked maid outfit', 'tiny lingerie set', 'string bikini', 'see-through outfit', 'exposed breasts lingerie', 'topless with mini skirt', 'transparent clothing', 'nipple-revealing top']
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

    // Default fallback - extremely sexy companion clothing for anime
    default: {
      female: ['ultra-revealing lingerie', 'micro string bikini', 'see-through dress', 'topless with tiny shorts', 'exposed breasts outfit', 'barely covered privates', 'transparent lingerie', 'nipple-revealing top', 'almost completely naked', 'tiny thong bikini', 'exposed cleavage outfit']
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
    // Use actual Airtable fields instead of parsing description
    const traits = {
      style: companion.companion_type || 'realistic',
      sex: companion.sex || 'female',
      ethnicity: companion.ethnicity || 'white',
      hairLength: companion.hair_length || 'long',
      hairColor: companion.hair_color || 'brown'
    };
    console.log(`   Traits from Airtable: ${traits.style}, ${traits.sex}, ${traits.ethnicity}, ${traits.hairLength}, ${traits.hairColor}`);

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

    // Hair color descriptions (with emphasis for better AI generation)
    const hairColorMap = {
      'brown': 'brown hair, brunette',
      'black': 'black hair, dark hair',
      'blonde': 'BLONDE hair, golden blonde hair, light blonde hair',
      'red': 'red hair, ginger hair, vibrant red hair',
      'auburn': 'auburn hair, reddish-brown hair',
      'gray': 'gray hair, silver hair',
      'white': 'white hair, platinum blonde hair',
      'purple': 'purple hair, violet hair'
    };

    const ethnicityDesc = ethnicityMap[traits.ethnicity] || 'diverse features';
    const hairLengthDesc = hairMap[traits.hairLength] || 'styled hair';
    const hairColorDesc = hairColorMap[traits.hairColor] || 'brown hair';

    // Build simple prompt WITHOUT traits (Netlify function will add traits from parameters)
    // Just include clothing and style keywords
    let avatarPrompt;
    if (isAnimeStyle) {
      avatarPrompt = `very attractive face, extremely seductive expression, detailed anime art, very erotic pose, wearing ${stylishClothing}, vibrant colors, high quality anime artwork, detailed facial features, anime eyes, perfect anatomy, correct human anatomy, two arms, two hands, very sensual pose, large breasts, curvy figure, big butt, voluptuous body, exposed skin, revealing clothing, single character, solo, no extra limbs, proper proportions, bedroom background, intimate setting, seductive atmosphere`;
    } else {
      avatarPrompt = `attractive face, seductive expression, alluring pose, wearing ${stylishClothing}, photorealistic, professional photography, soft romantic lighting, glamour photography style, eye contact, sharp focus, attractive model, confident pose, single person, solo, perfect human anatomy, two arms, two hands, correct proportions, no extra limbs, bedroom background, beach setting, luxury suite, intimate atmosphere`;
    }

    console.log(`   🎨 CUSTOM PROMPT (traits added by Netlify function): ${avatarPrompt.substring(0, 80)}...`);
    console.log(`   👤 TRAITS: ${traits.style}, ${traits.sex}, ${traits.ethnicity}, ${traits.hairLength}, ${traits.hairColor}`);

    // Use Netlify function which has access to Replicate API token
    // (now using uncensored Flux Dev model - no NSFW filter)
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