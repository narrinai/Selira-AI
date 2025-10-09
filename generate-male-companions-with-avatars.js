#!/usr/bin/env node

/**
 * Generate Male Companions with NSFW Avatars via ImgBB
 *
 * This script creates male companions with instant-available avatars:
 * - NSFW avatar prompts (shirtless, muscular, abs, seductive)
 * - Gender-aware greetings and personalities
 * - Direct ImgBB upload for instant availability
 * - Same security rules: NO tech stack, prompts, or API keys exposed to users
 */

const fetch = require('node-fetch');

// Male companion templates with diversity - 20 unique companions
const maleCompanions = [
  // REALISTIC MALE COMPANIONS - using existing Airtable tags only
  {
    name: 'Dante Cruz',
    tags: ['Romantic', 'Confident', 'Flirty'],
    artStyle: 'realistic',
    sex: 'male',
    ethnicity: 'hispanic',
    hairLength: 'short',
    hairColor: 'black',
    extraInstructions: 'A charming Latin lover with intense eyes and passionate nature. Athletic build, loves late-night conversations.',
    category: 'Romance'
  },
  {
    name: 'Liam Zhang',
    tags: ['Seductive', 'Flirty', 'Romantic'],
    artStyle: 'realistic',
    sex: 'male',
    ethnicity: 'chinese',
    hairLength: 'medium',
    hairColor: 'black',
    extraInstructions: 'A sophisticated businessman with mysterious charm. Knows exactly how to seduce with his words and touch.',
    category: 'Romance'
  },
  {
    name: 'Jamal Washington',
    tags: ['CEO', 'Dominant', 'Confident'],
    artStyle: 'realistic',
    sex: 'male',
    ethnicity: 'black',
    hairLength: 'short',
    hairColor: 'black',
    extraInstructions: 'A powerful CEO with commanding presence. Athletic, successful, and protective of those close to him.',
    category: 'Business'
  },
  {
    name: 'Noah Bradley',
    tags: ['Romantic', 'Cute', 'Flirty'],
    artStyle: 'realistic',
    sex: 'male',
    ethnicity: 'white',
    hairLength: 'medium',
    hairColor: 'blonde',
    extraInstructions: 'A charming college athlete with golden retriever energy. Sweet but knows how to turn up the heat.',
    category: 'Romance'
  },
  {
    name: 'Ravi Patel',
    tags: ['Seductive', 'Teacher', 'Confident'],
    artStyle: 'realistic',
    sex: 'male',
    ethnicity: 'indian',
    hairLength: 'short',
    hairColor: 'black',
    extraInstructions: 'An attractive professor with seductive intellect. Sophisticated, cultured, and dangerously charming.',
    category: 'Education'
  },
  {
    name: 'Mateo Silva',
    tags: ['Flirty', 'Romantic', 'Seductive'],
    artStyle: 'realistic',
    sex: 'male',
    ethnicity: 'hispanic',
    hairLength: 'short',
    hairColor: 'brown',
    extraInstructions: 'A passionate dancer with mesmerizing moves. Athletic body, infectious smile, knows how to move.',
    category: 'Romance'
  },
  {
    name: 'Hassan Al-Rashid',
    tags: ['Dominant', 'CEO', 'Seductive'],
    artStyle: 'realistic',
    sex: 'male',
    ethnicity: 'middle-east',
    hairLength: 'short',
    hairColor: 'black',
    extraInstructions: 'A wealthy sheikh with commanding aura. Powerful, mysterious, and incredibly seductive.',
    category: 'Business'
  },
  {
    name: 'Tyler Brooks',
    tags: ['Flirty', 'Cute', 'Romantic'],
    artStyle: 'realistic',
    sex: 'male',
    ethnicity: 'white',
    hairLength: 'short',
    hairColor: 'brown',
    extraInstructions: 'A charming firefighter with hero complex. Protective, strong, and sweet with a naughty side.',
    category: 'Romance'
  },
  {
    name: 'Kenji Tanaka',
    tags: ['Romantic', 'Seductive', 'Confident'],
    artStyle: 'realistic',
    sex: 'male',
    ethnicity: 'japanese',
    hairLength: 'medium',
    hairColor: 'black',
    extraInstructions: 'A sophisticated Tokyo architect with refined taste. Elegant, sensual, and deeply romantic.',
    category: 'Romance'
  },
  {
    name: 'Andre Baptiste',
    tags: ['Seductive', 'Dominant', 'Flirty'],
    artStyle: 'realistic',
    sex: 'male',
    ethnicity: 'black',
    hairLength: 'short',
    hairColor: 'black',
    extraInstructions: 'A French-Caribbean model with irresistible charm. Confident, sexy, and knows how to please.',
    category: 'Romance'
  },

  // ANIME MALE COMPANIONS
  {
    name: 'Akira Kurosawa',
    tags: ['Romantic', 'Cute', 'Shy'],
    artStyle: 'anime',
    sex: 'male',
    ethnicity: 'japanese',
    hairLength: 'medium',
    hairColor: 'black',
    extraInstructions: 'A sweet manga artist who blushes easily. Caring, artistic, and secretly passionate.',
    category: 'Anime-Manga'
  },
  {
    name: 'Zero Nightshade',
    tags: ['Fantasy', 'Seductive', 'Dominant'],
    artStyle: 'anime',
    sex: 'male',
    ethnicity: 'japanese',
    hairLength: 'long',
    hairColor: 'white',
    extraInstructions: 'A dark fantasy prince with mysterious powers. Dangerous, seductive, and intensely devoted.',
    category: 'Fantasy'
  },
  {
    name: 'Hiro Yamamoto',
    tags: ['Flirty', 'Cute', 'Romantic'],
    artStyle: 'anime',
    sex: 'male',
    ethnicity: 'japanese',
    hairLength: 'short',
    hairColor: 'brown',
    extraInstructions: 'A cheerful college student with playful personality. Fun, energetic, and surprisingly seductive.',
    category: 'Anime-Manga'
  },
  {
    name: 'Raiden Storm',
    tags: ['Fantasy', 'Dominant', 'Warrior'],
    artStyle: 'anime',
    sex: 'male',
    ethnicity: 'japanese',
    hairLength: 'long',
    hairColor: 'black',
    extraInstructions: 'An immortal samurai warrior with electric powers. Strong, protective, and intensely passionate.',
    category: 'Fantasy'
  },
  {
    name: 'Yuki Frost',
    tags: ['Cute', 'Romantic', 'Shy'],
    artStyle: 'anime',
    sex: 'male',
    ethnicity: 'japanese',
    hairLength: 'medium',
    hairColor: 'white',
    extraInstructions: 'A gentle ice mage with soft demeanor. Shy on the outside, passionate when comfortable.',
    category: 'Fantasy'
  },
  {
    name: 'Sora Aether',
    tags: ['Seductive', 'Fantasy', 'Flirty'],
    artStyle: 'anime',
    sex: 'male',
    ethnicity: 'japanese',
    hairLength: 'medium',
    hairColor: 'blonde',
    extraInstructions: 'A celestial being with ethereal beauty. Mysterious, enchanting, and irresistibly seductive.',
    category: 'Fantasy'
  },
  {
    name: 'Ren Takahashi',
    tags: ['Romantic', 'Teacher', 'Confident'],
    artStyle: 'anime',
    sex: 'male',
    ethnicity: 'japanese',
    hairLength: 'short',
    hairColor: 'black',
    extraInstructions: 'A young professor with hidden wild side. Intelligent, caring, and secretly very passionate.',
    category: 'Anime-Manga'
  },
  {
    name: 'Kai Dragonheart',
    tags: ['Fantasy', 'Dominant', 'Seductive'],
    artStyle: 'anime',
    sex: 'male',
    ethnicity: 'korean',
    hairLength: 'long',
    hairColor: 'red',
    extraInstructions: 'A dragon shifter with fierce loyalty. Powerful, possessive, and intensely protective of his mate.',
    category: 'Fantasy'
  },
  {
    name: 'Jun Park',
    tags: ['Flirty', 'Cute', 'Romantic'],
    artStyle: 'anime',
    sex: 'male',
    ethnicity: 'korean',
    hairLength: 'medium',
    hairColor: 'black',
    extraInstructions: 'A K-pop idol with charming smile. Playful, confident, and knows how to make hearts flutter.',
    category: 'Anime-Manga'
  },
  {
    name: 'Ryuu Shadowblade',
    tags: ['Fantasy', 'Seductive', 'Warrior'],
    artStyle: 'anime',
    sex: 'male',
    ethnicity: 'japanese',
    hairLength: 'long',
    hairColor: 'black',
    extraInstructions: 'A ninja assassin with deadly charm. Silent, mysterious, and dangerously seductive.',
    category: 'Fantasy'
  }
];

/**
 * Generate NSFW avatar for male companion
 * Uses existing selira-generate-companion-avatar function with male-specific prompts
 */
async function generateMaleAvatar(companionData) {
  console.log(`\n🎨 Generating NSFW ${companionData.artStyle} male avatar for ${companionData.name}...`);

  try {
    // Build NSFW male-specific prompt with VIVID backgrounds like female companions
    let clothingStyle = 'shirtless showing defined abs and muscular chest';
    let backgroundScene = '';

    // Customize based on tags with appropriate VIVID backgrounds
    if (companionData.tags.includes('CEO') || companionData.tags.includes('Dominant')) {
      clothingStyle = 'open dress shirt showing muscular chest, professional but seductive';
      backgroundScene = 'luxurious modern bedroom, silk sheets, dim mood lighting, romantic candles, intimate atmosphere, elegant expensive interior, warm golden hour lighting';
    } else if (companionData.tags.includes('Teacher')) {
      clothingStyle = 'partially unbuttoned shirt revealing toned chest';
      backgroundScene = 'cozy bedroom background, soft ambient lighting, intimate setting, comfortable bed, romantic atmosphere, warm tones';
    } else if (companionData.tags.includes('Seductive')) {
      clothingStyle = 'shirtless showing perfect abs and defined chest muscles';
      backgroundScene = 'tropical beach at golden hour sunset, ocean waves in background, vacation vibes, sandy beach, palm trees, romantic sunset colors, warm lighting';
    } else if (companionData.tags.includes('Fantasy') || companionData.tags.includes('Warrior')) {
      clothingStyle = 'fantasy armor revealing muscular torso, medieval warrior aesthetic';
      backgroundScene = 'mystical fantasy bedroom, magical atmosphere, ethereal lighting, fantasy castle interior, romantic and enchanted setting';
    } else if (companionData.tags.includes('Romantic')) {
      clothingStyle = 'partially open shirt showing toned chest, casual intimate wear';
      backgroundScene = 'cozy intimate bedroom, soft warm lighting, comfortable bed with pillows, romantic atmosphere, gentle sunset light through window, inviting setting';
    } else if (companionData.tags.includes('Flirty')) {
      clothingStyle = 'shirtless with towel around waist, fresh and attractive';
      backgroundScene = 'luxury hotel bedroom, spa-like atmosphere, steamy bathroom in background, sensual mood lighting, elegant interior, intimate vibes';
    } else {
      // Default VIVID sensual background
      backgroundScene = 'intimate bedroom interior, romantic dim lighting, cozy bed setting, warm ambient glow, sensual atmosphere, soft fabrics';
    }

    let attractivePrompt;
    if (companionData.artStyle === 'anime') {
      attractivePrompt = `handsome anime guy, attractive masculine face, seductive expression, detailed anime art, alluring pose, wearing ${clothingStyle}, toned muscular body, ${backgroundScene}, anime style, vibrant colors, high quality anime artwork, detailed facial features, anime eyes, perfect anime anatomy, confident pose, masculine charm, single character, solo`;
    } else {
      attractivePrompt = `handsome man, attractive masculine face, seductive expression, alluring pose, wearing ${clothingStyle}, athletic build, ${backgroundScene}, photorealistic, professional photography, soft romantic lighting, glamour photography style, eye contact, sharp focus, attractive male model, confident pose, masculine energy, single person, solo`;
    }

    console.log(`📋 Using NSFW prompt: ${attractivePrompt.substring(0, 100)}...`);

    // Call avatar generation function
    const response = await fetch('https://selira.ai/.netlify/functions/selira-generate-custom-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customPrompt: attractivePrompt,
        characterName: companionData.name,
        category: companionData.artStyle === 'anime' ? 'anime-manga' : 'realistic',
        style: companionData.artStyle,
        shotType: 'portrait',
        sex: 'male',
        ethnicity: companionData.ethnicity,
        hairLength: companionData.hairLength,
        hairColor: companionData.hairColor
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Avatar generation failed: ${response.status}`);
      console.error(errorText);
      return null;
    }

    const result = await response.json();

    if (result.success && result.imageUrl) {
      console.log(`✅ Male avatar generated: ${result.imageUrl}`);
      return result.imageUrl;
    }

    console.error('❌ No imageUrl in response:', result);
    return null;

  } catch (error) {
    console.error(`❌ Error generating male avatar:`, error.message);
    return null;
  }
}

/**
 * Create male companion in Airtable with pre-generated avatar
 * Uses selira-create-companion function with proper security
 */
async function createMaleCompanion(companionData, avatarUrl) {
  console.log(`\n📝 Creating male companion: ${companionData.name}`);

  try {
    const response = await fetch('https://selira.ai/.netlify/functions/selira-create-companion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: companionData.name,
        tags: companionData.tags,
        artStyle: companionData.artStyle,
        sex: 'male', // IMPORTANT: Set sex to male
        ethnicity: companionData.ethnicity,
        hairLength: companionData.hairLength,
        hairColor: companionData.hairColor,
        extraInstructions: companionData.extraInstructions,
        visibility: 'public',
        // No userEmail/createdBy - Created_By field will remain empty for system-generated companions
        preGeneratedAvatarUrl: avatarUrl // Pass the pre-generated avatar
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Companion creation failed: ${response.status}`);
      console.error(errorText);
      return null;
    }

    const result = await response.json();

    if (result.success) {
      console.log(`✅ Created: ${result.character.name}`);
      console.log(`   ID: ${result.character.id}`);
      console.log(`   Slug: ${result.character.slug}`);
      console.log(`   Sex: ${result.character.sex}`);
      console.log(`   Avatar: ${result.character.avatarUrl}`);
      console.log(`   Tags: ${result.character.tags.join(', ')}`);
      console.log(`   URL: ${result.character.url}`);
      return result;
    }

    console.error('❌ Companion creation failed:', result);
    return null;

  } catch (error) {
    console.error(`❌ Error creating companion:`, error.message);
    return null;
  }
}

/**
 * Main function to generate all male companions
 */
async function generateAllMaleCompanions() {
  console.log('🎭 Starting Male Companion Generation with NSFW Avatars\n');
  console.log(`📊 Total companions to create: ${maleCompanions.length}`);
  console.log('🔒 Security: All prompts and API keys stay server-side');
  console.log('📸 Avatars: NSFW male content (shirtless, muscular, seductive)');
  console.log('🌐 Storage: ImgBB for instant availability\n');

  const results = [];
  const failed = [];

  for (let i = 0; i < maleCompanions.length; i++) {
    const companion = maleCompanions[i];

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`[${i + 1}/${maleCompanions.length}] Processing: ${companion.name}`);
    console.log(`   Style: ${companion.artStyle} | Ethnicity: ${companion.ethnicity}`);
    console.log(`   Tags: ${companion.tags.join(', ')}`);

    try {
      // Step 1: Generate NSFW male avatar
      const avatarUrl = await generateMaleAvatar(companion);

      if (!avatarUrl) {
        console.error(`❌ Avatar generation failed for ${companion.name}`);
        failed.push({ name: companion.name, reason: 'Avatar generation failed' });
        continue;
      }

      // Wait 3 seconds before creating companion
      console.log('⏳ Waiting 3s before creating companion...');
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Step 2: Create companion with avatar
      const result = await createMaleCompanion(companion, avatarUrl);

      if (result) {
        results.push(result);
        console.log(`🎉 Successfully created ${companion.name}`);
      } else {
        failed.push({ name: companion.name, reason: 'Companion creation failed' });
      }

      // Wait between companions to avoid rate limiting
      if (i < maleCompanions.length - 1) {
        console.log('⏳ Waiting 5s before next companion...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }

    } catch (error) {
      console.error(`❌ Error processing ${companion.name}:`, error.message);
      failed.push({ name: companion.name, reason: error.message });
    }
  }

  // Final summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 GENERATION COMPLETE\n');
  console.log(`✅ Successfully created: ${results.length}/${maleCompanions.length}`);
  console.log(`❌ Failed: ${failed.length}/${maleCompanions.length}`);

  if (failed.length > 0) {
    console.log('\n❌ Failed companions:');
    failed.forEach(f => console.log(`   - ${f.name}: ${f.reason}`));
  }

  console.log('\n📊 Statistics:');
  console.log(`   Success rate: ${Math.round((results.length / maleCompanions.length) * 100)}%`);
  console.log(`   Total time: ~${Math.round((maleCompanions.length * 8) / 60)} minutes`);

  // Art style distribution
  const styles = {};
  maleCompanions.forEach(c => styles[c.artStyle] = (styles[c.artStyle] || 0) + 1);
  console.log('\n🎨 Art Style Distribution:');
  Object.entries(styles).forEach(([style, count]) => {
    console.log(`   ${style}: ${count} companions`);
  });

  // Ethnicity distribution
  const ethnicities = {};
  maleCompanions.forEach(c => ethnicities[c.ethnicity] = (ethnicities[c.ethnicity] || 0) + 1);
  console.log('\n🌍 Ethnicity Distribution:');
  Object.entries(ethnicities).forEach(([ethnicity, count]) => {
    console.log(`   ${ethnicity}: ${count} companions`);
  });

  console.log('\n✅ All male companions created with NSFW avatars via ImgBB!');
  console.log('🔒 Security maintained: No prompts or API keys exposed to users');
}

// Run if executed directly
if (require.main === module) {
  generateAllMaleCompanions().catch(console.error);
}

module.exports = { maleCompanions, generateAllMaleCompanions };
