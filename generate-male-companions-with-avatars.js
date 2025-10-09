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

// Male companion templates with diversity
const maleCompanions = [
  // REALISTIC MALE COMPANIONS
  {
    name: 'Marcus Steel',
    tags: ['Boyfriend', 'Romance', 'Flirty'],
    artStyle: 'realistic',
    sex: 'male',
    ethnicity: 'black',
    hairLength: 'short',
    hairColor: 'black',
    extraInstructions: 'A charming and confident boyfriend who loves deep conversations and romantic evenings. Athletic build with a warm smile.',
    category: 'Romance'
  },
  {
    name: 'Diego Santana',
    tags: ['Seductive', 'Flirty', 'Romance'],
    artStyle: 'realistic',
    sex: 'male',
    ethnicity: 'hispanic',
    hairLength: 'medium',
    hairColor: 'brown',
    extraInstructions: 'A passionate Latin lover with smoldering eyes and an irresistible charm. Knows exactly how to make you feel desired.',
    category: 'Romance'
  },
  {
    name: 'Alexander Frost',
    tags: ['Boss', 'Romance', 'Tsundere'],
    artStyle: 'realistic',
    sex: 'male',
    ethnicity: 'white',
    hairLength: 'short',
    hairColor: 'blonde',
    extraInstructions: 'A powerful CEO with a commanding presence and hidden soft side. Tough in business but protective of those he cares about.',
    category: 'Business'
  },

  // ANIME MALE COMPANIONS
  {
    name: 'Ryu Hayashi',
    tags: ['Boyfriend', 'Romance', 'Cute'],
    artStyle: 'anime',
    sex: 'male',
    ethnicity: 'japanese',
    hairLength: 'medium',
    hairColor: 'black',
    extraInstructions: 'A sweet and caring anime boyfriend with a mysterious past. Always there when you need him.',
    category: 'Anime-Manga'
  },
  {
    name: 'Kai Storm',
    tags: ['Fantasy', 'Seductive', 'Romance'],
    artStyle: 'anime',
    sex: 'male',
    ethnicity: 'mixed',
    hairLength: 'long',
    hairColor: 'silver',
    extraInstructions: 'A mystical warrior with supernatural powers and otherworldly charm. Protective and intensely devoted.',
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
    // Build NSFW male-specific prompt
    let clothingStyle = 'shirtless showing defined abs and muscular chest';

    // Customize based on tags
    if (companionData.tags.includes('Boss')) {
      clothingStyle = 'open shirt showing muscular chest, professional but sexy';
    } else if (companionData.tags.includes('Teacher')) {
      clothingStyle = 'partially unbuttoned shirt revealing toned chest';
    } else if (companionData.tags.includes('Seductive')) {
      clothingStyle = 'shirtless showing perfect abs and defined chest muscles';
    } else if (companionData.tags.includes('Fantasy')) {
      clothingStyle = 'fantasy armor revealing muscular torso';
    }

    let attractivePrompt;
    if (companionData.artStyle === 'anime') {
      attractivePrompt = `handsome anime guy, attractive masculine face, seductive expression, ${clothingStyle}, toned muscular body, anime style, detailed artwork, confident pose, masculine charm, single character, solo`;
    } else {
      attractivePrompt = `handsome muscular man, attractive masculine face, seductive expression, ${clothingStyle}, athletic build, photorealistic, professional photography, masculine energy, confident pose, single person, solo`;
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
        createdBy: 'Male Companion Script with Avatars',
        userEmail: 'admin@selira.ai',
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
