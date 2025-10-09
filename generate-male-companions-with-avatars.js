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

// Male companion templates with diversity - 5 unique companions for testing
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
  }
];

/**
 * Generate NSFW avatar for male companion
 * Uses existing selira-generate-companion-avatar function with male-specific prompts
 */
async function generateMaleAvatar(companionData) {
  console.log(`\n🎨 Generating NSFW ${companionData.artStyle} male avatar for ${companionData.name}...`);

  try {
    // Build NSFW male-specific prompt with diverse random backgrounds
    let backgroundScene = '';

    // Random diverse backgrounds to prevent repetition
    const randomBackgrounds = [
      'luxury penthouse bedroom, city skyline view through windows, modern elegant interior, ambient mood lighting, silky sheets',
      'tropical beach at golden hour sunset, ocean waves, sandy beach, palm trees, vacation paradise atmosphere',
      'modern gym environment, fitness equipment in background, athletic setting, professional sports lighting',
      'rooftop terrace at dusk, city lights twinkling, urban skyline, romantic evening atmosphere',
      'cozy mountain cabin bedroom, fireplace glowing, rustic wooden interior, warm intimate setting',
      'luxury yacht bedroom cabin, ocean view through portholes, nautical elegance, intimate quarters',
      'infinity pool edge at resort, tropical paradise, crystal clear water, luxury vacation setting',
      'modern loft apartment, industrial chic, floor-to-ceiling windows, natural daylight streaming in',
      'spa retreat bedroom, zen atmosphere, minimalist design, tranquil peaceful setting',
      'private beach cabana, tropical island, ocean breeze, intimate paradise hideaway',
      'art gallery loft, sophisticated modern space, large windows, artistic atmosphere',
      'luxury hotel suite bedroom, five-star elegance, king bed, romantic mood lighting',
      'garden terrace with city view, outdoor lounge, evening atmosphere, romantic setting',
      'modern penthouse living room, floor-to-ceiling windows, stunning view, sophisticated interior',
      'beachfront villa bedroom, ocean view, tropical luxury, romantic sunset ambiance'
    ];

    backgroundScene = randomBackgrounds[Math.floor(Math.random() * randomBackgrounds.length)];
    console.log(`🎲 Selected random background: ${backgroundScene.substring(0, 60)}...`);

    // Simple short prompt - let the main function add the rest
    let attractivePrompt;
    if (companionData.artStyle === 'anime') {
      attractivePrompt = `shirtless with bare muscular chest showing defined abs and pecs, NO shirt on, seductive pose, ${backgroundScene}`;
    } else {
      attractivePrompt = `shirtless bare chest showing defined abs and pecs, NO shirt, muscular build, seductive pose, ${backgroundScene}`;
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
