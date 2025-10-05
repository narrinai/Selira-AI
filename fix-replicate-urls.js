// Fix Replicate URLs by re-generating avatars
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

async function generateNewAvatar(companion) {
  console.log(`🎨 Generating new avatar for: ${companion.name}`);

  // Use companion's traits to generate new avatar
  const prompt = `beautiful ${companion.sex || 'female'}, ${companion.ethnicity || 'diverse'} features, ${companion.hair_length || 'medium'} ${companion.hair_color || 'brown'} hair, ${companion.companion_type === 'anime' ? 'anime style, vibrant colors' : 'photorealistic, professional photography'}`;

  try {
    const response = await fetch('https://selira.ai/.netlify/functions/selira-generate-custom-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customPrompt: prompt,
        characterName: companion.name,
        category: companion.companion_type === 'anime' ? 'anime-manga' : 'realistic',
        style: companion.companion_type || 'realistic',
        shotType: 'portrait',
        sex: companion.sex || 'female',
        ethnicity: companion.ethnicity || 'white',
        hairLength: companion.hair_length || 'medium',
        hairColor: companion.hair_color || 'brown'
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

async function getAllCompanionsWithReplicateUrls() {
  console.log('🔍 Fetching companions with Replicate URLs...');

  const SELIRA_BASE_ID = process.env.AIRTABLE_BASE_ID_SELIRA || process.env.AIRTABLE_BASE_ID || process.env.AIRTABLE_BASE;
  const SELIRA_TOKEN = process.env.AIRTABLE_TOKEN_SELIRA || process.env.AIRTABLE_TOKEN;

  if (!SELIRA_BASE_ID || !SELIRA_TOKEN) {
    throw new Error('Missing Airtable credentials. Set AIRTABLE_BASE_ID and AIRTABLE_TOKEN');
  }

  let allCompanions = [];
  let offset = null;

  while (true) {
    let url = `https://api.airtable.com/v0/${SELIRA_BASE_ID}/Characters?filterByFormula=FIND("replicate.delivery",{Avatar_URL})>0`;
    if (offset) {
      url += `&offset=${offset}`;
    }

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${SELIRA_TOKEN}`
      }
    });

    if (!response.ok) {
      throw new Error(`Airtable fetch failed: ${response.status}`);
    }

    const data = await response.json();

    if (!data.records || data.records.length === 0) {
      break;
    }

    allCompanions.push(...data.records);
    console.log(`📦 Fetched ${data.records.length} companions (${allCompanions.length} total)`);

    if (!data.offset) {
      break;
    }

    offset = data.offset;
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log(`📊 Total companions with Replicate URLs: ${allCompanions.length}`);
  return allCompanions;
}

async function updateAirtableAvatar(companionId, localUrl) {
  const SELIRA_BASE_ID = process.env.AIRTABLE_BASE_ID_SELIRA || process.env.AIRTABLE_BASE_ID || process.env.AIRTABLE_BASE;
  const SELIRA_TOKEN = process.env.AIRTABLE_TOKEN_SELIRA || process.env.AIRTABLE_TOKEN;

  const response = await fetch(
    `https://api.airtable.com/v0/${SELIRA_BASE_ID}/Characters/${companionId}`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${SELIRA_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: {
          Avatar_URL: localUrl
        }
      })
    }
  );

  if (!response.ok) {
    throw new Error(`Airtable update failed: ${response.status}`);
  }

  return await response.json();
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
        // Generate new avatar
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
