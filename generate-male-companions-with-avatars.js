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

// Name pools for generating unique combinations
const firstNames = {
  realistic: {
    hispanic: ['Dante', 'Mateo', 'Diego', 'Carlos', 'Miguel', 'Rafael', 'Alejandro', 'Santiago', 'Gabriel', 'Antonio'],
    chinese: ['Liam', 'Wei', 'Chen', 'Ming', 'Jun', 'Kai', 'Jian', 'Yang', 'Feng', 'Rui'],
    black: ['Jamal', 'Marcus', 'Andre', 'Tyrone', 'DeShawn', 'Malik', 'Xavier', 'Isaiah', 'Darius', 'Khalil'],
    white: ['Noah', 'Tyler', 'Ethan', 'Connor', 'Jake', 'Ryan', 'Brandon', 'Austin', 'Logan', 'Mason'],
    indian: ['Ravi', 'Arjun', 'Dev', 'Rohan', 'Aditya', 'Karan', 'Vikram', 'Nikhil', 'Raj', 'Sanjay'],
    'middle-east': ['Hassan', 'Omar', 'Tariq', 'Amir', 'Khalid', 'Rashid', 'Faisal', 'Youssef', 'Samir', 'Karim'],
    japanese: ['Kenji', 'Hiroshi', 'Takeshi', 'Yuki', 'Ryu', 'Kazuki', 'Haruto', 'Daiki', 'Sora', 'Takumi'],
    korean: ['Min-Jun', 'Ji-Ho', 'Seo-Jun', 'Do-Yoon', 'Hae-Won', 'Tae-Yang', 'Jin-Woo', 'Sung-Min', 'Hyun-Woo', 'Joon-Ho']
  },
  anime: {
    japanese: ['Akira', 'Zero', 'Hiro', 'Raiden', 'Yuki', 'Sora', 'Ren', 'Kai', 'Ryuu', 'Satoshi', 'Makoto', 'Haruki', 'Kaito', 'Shiro', 'Riku'],
    korean: ['Kai', 'Jun', 'Hwan', 'Jae', 'Min', 'Tae', 'Hyun', 'Sung', 'Woo', 'Jin']
  }
};

const lastNames = {
  hispanic: ['Cruz', 'Silva', 'Rodriguez', 'Garcia', 'Martinez', 'Lopez', 'Gonzalez', 'Sanchez', 'Ramirez', 'Torres'],
  chinese: ['Zhang', 'Wang', 'Li', 'Liu', 'Chen', 'Yang', 'Huang', 'Zhao', 'Wu', 'Zhou'],
  black: ['Washington', 'Baptiste', 'Jackson', 'Williams', 'Johnson', 'Brown', 'Davis', 'Wilson', 'Moore', 'Taylor'],
  white: ['Bradley', 'Brooks', 'Anderson', 'Miller', 'Thompson', 'White', 'Harris', 'Martin', 'Garcia', 'Robinson'],
  indian: ['Patel', 'Singh', 'Kumar', 'Sharma', 'Gupta', 'Reddy', 'Mehta', 'Kapoor', 'Rao', 'Malhotra'],
  'middle-east': ['Al-Rashid', 'Hassan', 'Ahmed', 'Ali', 'Khan', 'Malik', 'Hussein', 'Rahman', 'Ibrahim', 'Saleh'],
  japanese: ['Tanaka', 'Yamamoto', 'Sato', 'Takahashi', 'Watanabe', 'Ito', 'Nakamura', 'Kobayashi', 'Kato', 'Yoshida'],
  korean: ['Park', 'Kim', 'Lee', 'Choi', 'Jung', 'Kang', 'Yoon', 'Jang', 'Lim', 'Han']
};

const animeLastNames = ['Kurosawa', 'Nightshade', 'Yamamoto', 'Storm', 'Frost', 'Aether', 'Takahashi', 'Dragonheart', 'Shadowblade', 'Moonlight', 'Eclipse', 'Phoenix', 'Raven', 'Silver', 'Azure'];

// Track already created companion names to avoid duplicates
const createdNames = new Set();

// Function to check if companion already exists in Airtable
async function companionExists(name) {
  try {
    const encodedFormula = encodeURIComponent(`{Name} = "${name}"`);
    const response = await fetch(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Characters?filterByFormula=${encodedFormula}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const data = await response.json();
    return data.records && data.records.length > 0;
  } catch (error) {
    console.error('Error checking companion existence:', error);
    return false;
  }
}

// Generate unique companion name
function generateUniqueName(artStyle, ethnicity) {
  const maxAttempts = 50;
  let attempts = 0;

  while (attempts < maxAttempts) {
    let firstName, lastName;

    if (artStyle === 'anime') {
      const firstNamePool = firstNames.anime[ethnicity] || firstNames.anime.japanese;
      firstName = firstNamePool[Math.floor(Math.random() * firstNamePool.length)];
      lastName = animeLastNames[Math.floor(Math.random() * animeLastNames.length)];
    } else {
      const firstNamePool = firstNames.realistic[ethnicity];
      const lastNamePool = lastNames[ethnicity];
      firstName = firstNamePool[Math.floor(Math.random() * firstNamePool.length)];
      lastName = lastNamePool[Math.floor(Math.random() * lastNamePool.length)];
    }

    const fullName = `${firstName} ${lastName}`;

    if (!createdNames.has(fullName)) {
      createdNames.add(fullName);
      return fullName;
    }

    attempts++;
  }

  // Fallback with timestamp if we can't generate unique name
  return `Companion ${Date.now()}`;
}

// Template data for generating companions
const companionTemplates = [
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
  console.log(`📊 Total companions to create: ${companionTemplates.length}`);
  console.log('🔒 Security: All prompts and API keys stay server-side');
  console.log('📸 Avatars: NSFW male content (shirtless, muscular, seductive)');
  console.log('🌐 Storage: ImgBB for instant availability\n');

  const results = [];
  const failed = [];
  const skipped = [];

  for (let i = 0; i < companionTemplates.length; i++) {
    const template = companionTemplates[i];

    // Generate unique name based on template ethnicity and style
    const uniqueName = generateUniqueName(template.artStyle, template.ethnicity);

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`[${i + 1}/${companionTemplates.length}] Processing: ${uniqueName}`);
    console.log(`   Style: ${template.artStyle} | Ethnicity: ${template.ethnicity}`);
    console.log(`   Tags: ${template.tags.join(', ')}`);

    // Check if companion already exists in Airtable
    console.log(`🔍 Checking if ${uniqueName} already exists...`);
    const exists = await companionExists(uniqueName);

    if (exists) {
      console.log(`⏭️  Skipping ${uniqueName} - already exists in database`);
      skipped.push({ name: uniqueName, reason: 'Already exists' });
      continue;
    }

    // Create companion object with unique name
    const companion = {
      ...template,
      name: uniqueName
    };

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
      if (i < companionTemplates.length - 1) {
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
  console.log(`✅ Successfully created: ${results.length}/${companionTemplates.length}`);
  console.log(`⏭️  Skipped (already exist): ${skipped.length}/${companionTemplates.length}`);
  console.log(`❌ Failed: ${failed.length}/${companionTemplates.length}`);

  if (skipped.length > 0) {
    console.log('\n⏭️  Skipped companions (already exist):');
    skipped.forEach(s => console.log(`   - ${s.name}`));
  }

  if (failed.length > 0) {
    console.log('\n❌ Failed companions:');
    failed.forEach(f => console.log(`   - ${f.name}: ${f.reason}`));
  }

  console.log('\n📊 Statistics:');
  console.log(`   Success rate: ${Math.round((results.length / companionTemplates.length) * 100)}%`);
  console.log(`   Total time: ~${Math.round((companionTemplates.length * 8) / 60)} minutes`);

  // Art style distribution
  const styles = {};
  companionTemplates.forEach(c => styles[c.artStyle] = (styles[c.artStyle] || 0) + 1);
  console.log('\n🎨 Art Style Distribution:');
  Object.entries(styles).forEach(([style, count]) => {
    console.log(`   ${style}: ${count} companions`);
  });

  // Ethnicity distribution
  const ethnicities = {};
  companionTemplates.forEach(c => ethnicities[c.ethnicity] = (ethnicities[c.ethnicity] || 0) + 1);
  console.log('\n🌍 Ethnicity Distribution:');
  Object.entries(ethnicities).forEach(([ethnicity, count]) => {
    console.log(`   ${ethnicity}: ${count} companions`);
  });

  console.log('\n✅ All male companions created with NSFW avatars via ImgBB!');
  console.log('🔒 Security maintained: No prompts or API keys exposed to users');
  console.log(`\n🎲 Total unique name combinations possible: ${Object.values(firstNames.realistic).flat().length * Object.values(lastNames).flat().length + firstNames.anime.japanese.length * animeLastNames.length}`);
}

// Run if executed directly
if (require.main === module) {
  generateAllMaleCompanions().catch(console.error);
}

module.exports = { companionTemplates, generateAllMaleCompanions };
