// Fix Replicate URLs by re-generating avatars
// Uses EXACT same prompts as complete-avatar-solution-v3.js
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

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

// EXACT COPY from complete-avatar-solution-v3.js
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

async function generateNewAvatar(companion) {
  console.log(`🎨 Generating new avatar for: ${companion.name}`);

  try {
    // Use companion's traits - same as complete-avatar-solution-v3.js
    const traits = {
      style: companion.companion_type || 'realistic',
      sex: companion.sex || 'female',
      ethnicity: companion.ethnicity || 'white',
      hairLength: companion.hair_length || 'medium',
      hairColor: companion.hair_color || 'brown'
    };

    console.log(`   Traits: ${traits.style}, ${traits.sex}, ${traits.ethnicity}, ${traits.hairLength} ${traits.hairColor} hair`);

    // Get random sexy clothing - EXACT same as complete-avatar-solution-v3.js
    const category = 'default'; // Use default for most explicit clothing
    const stylishClothing = getStylishClothing(traits.style, category);
    console.log(`   Clothing: ${stylishClothing}`);

    // EXACT same character-aware prompt building as complete-avatar-solution-v3.js
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

    // EXACT same prompts as complete-avatar-solution-v3.js
    let avatarPrompt;
    if (isAnimeStyle) {
      avatarPrompt = `beautiful anime girl, very attractive face, extremely seductive expression, detailed anime art, very erotic pose, wearing ${stylishClothing}, anime style, vibrant colors, high quality anime artwork, detailed facial features, anime eyes, perfect anatomy, correct human anatomy, two arms, two hands, very sensual pose, large breasts, curvy figure, big butt, voluptuous body, exposed skin, revealing clothing, single character, solo, no extra limbs, proper proportions, bedroom background, intimate setting, seductive atmosphere`;
    } else {
      avatarPrompt = `beautiful woman, attractive face, seductive expression, alluring pose, wearing ${stylishClothing}, photorealistic, professional photography, soft romantic lighting, glamour photography style, eye contact, sharp focus, attractive model, confident pose, single person, solo, perfect human anatomy, two arms, two hands, correct proportions, no extra limbs, bedroom background, beach setting, luxury suite, intimate atmosphere`;
    }

    console.log(`   🎨 AVATAR PROMPT: ${avatarPrompt.substring(0, 100)}...`);

    // Call Netlify function - EXACT same as complete-avatar-solution-v3.js
    const response = await fetch('https://selira.ai/.netlify/functions/selira-generate-custom-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customPrompt: avatarPrompt,
        characterName: companion.name,
        category: traits.style === 'anime' ? 'anime-manga' : 'realistic',
        style: traits.style,
        shotType: 'portrait',
        sex: traits.sex,
        ethnicity: traits.ethnicity,
        hairLength: traits.hairLength,
        hairColor: traits.hairColor
      })
    });

    if (!response.ok) {
      console.log(`❌ Generation failed: ${response.status}`);
      return null;
    }

    const result = await response.json();
    if (result.success && result.imageUrl) {
      console.log(`✅ Generated: ${result.imageUrl.substring(0, 60)}...`);
      return result.imageUrl;
    }

    return null;
  } catch (error) {
    console.log(`❌ Generation error: ${error.message}`);
    return null;
  }
}

async function main() {
  try {
    console.log('🔧 Starting Replicate URL fix...\n');

    // Get companions via Netlify function
    const response = await fetch('https://selira.ai/.netlify/functions/selira-characters?limit=1000&includePrivate=true');
    const data = await response.json();

    // Filter companions with Replicate URLs or empty avatars
    const companionsToFix = data.characters.filter(char =>
      !char.avatar_url ||
      char.avatar_url.includes('replicate.delivery')
    );

    if (companionsToFix.length === 0) {
      console.log('🎉 No companions need fixing!');
      return;
    }

    console.log(`📊 Found ${companionsToFix.length} companions to fix\n`);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < companionsToFix.length; i++) {
      const companion = companionsToFix[i];

      console.log(`\n[${i + 1}/${companionsToFix.length}] Processing: ${companion.name} (${companion.slug})`);
      console.log(`   Current avatar: ${companion.avatar_url || 'NONE'}`);

      try {
        // Generate new avatar using EXACT same method as complete-avatar-solution-v3.js
        const newAvatarUrl = await generateNewAvatar(companion);

        if (!newAvatarUrl) {
          throw new Error('Avatar generation failed');
        }

        // Download to local storage
        const timestamp = Date.now();
        const filename = `${companion.slug}-${timestamp}.webp`;
        const downloaded = await downloadImage(newAvatarUrl, filename);

        if (!downloaded) {
          throw new Error('Download failed');
        }

        // Generate local URL
        const localUrl = `https://selira.ai/avatars/${filename}`;
        console.log(`   Local URL: ${localUrl}`);

        // Update Airtable via Netlify function
        const updateResponse = await fetch('https://selira.ai/.netlify/functions/selira-update-avatar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companionId: companion.id,
            avatarUrl: localUrl
          })
        });

        if (!updateResponse.ok) {
          throw new Error(`Update failed: ${updateResponse.status}`);
        }

        console.log(`   ✅ Successfully updated in Airtable`);
        successCount++;

        // Delay to avoid rate limiting (20 seconds between generations)
        if (i < companionsToFix.length - 1) {
          console.log('   ⏳ Waiting 20 seconds...');
          await new Promise(resolve => setTimeout(resolve, 20000));
        }

      } catch (error) {
        console.error(`   ❌ Failed: ${error.message}`);
        failCount++;
      }
    }

    console.log(`\n📊 Fix Complete!`);
    console.log(`✅ Successfully fixed: ${successCount} companions`);
    console.log(`❌ Failed: ${failCount} companions`);

  } catch (error) {
    console.error('❌ Error in main process:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);
