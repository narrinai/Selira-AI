#!/usr/bin/env node

// Script to fill empty avatar_url fields in Airtable Characters table
// Based on character attributes (hair_length, hair_color, sex, art_style, etc.)

require('dotenv').config();

// Environment variables
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID_SELIRA || process.env.AIRTABLE_BASE_ID || process.env.AIRTABLE_BASE;
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN_SELIRA || process.env.AIRTABLE_TOKEN;

if (!AIRTABLE_BASE_ID || !AIRTABLE_TOKEN) {
  console.error('❌ Missing required environment variables:');
  console.error('   AIRTABLE_BASE_ID or AIRTABLE_BASE');
  console.error('   AIRTABLE_TOKEN');
  process.exit(1);
}

const BATCH_SIZE = 5; // Process in batches to avoid rate limiting
const DELAY_BETWEEN_REQUESTS = 4000; // 4 seconds between API calls

// Console colors
const Colors = {
  RESET: '\033[0m',
  BLUE: '\033[94m',
  GREEN: '\033[92m',
  YELLOW: '\033[93m',
  RED: '\033[91m',
  CYAN: '\033[96m',
  MAGENTA: '\033[95m'
};

function log(color, message) {
  console.log(`${color}${message}${Colors.RESET}`);
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Fetch all characters from Airtable with empty avatar_url
async function getCharactersWithEmptyAvatars() {
  log(Colors.BLUE, '📋 Fetching characters with empty avatar_url from Airtable...');

  let allCharacters = [];
  let offset = null;
  let totalFetched = 0;

  try {
    while (true) {
      const filterFormula = encodeURIComponent("AND({Avatar_URL} = BLANK(), {Name} != BLANK())");
      let url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Characters?filterByFormula=${filterFormula}&maxRecords=100`;

      if (offset) {
        url += `&offset=${offset}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Airtable API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const characters = data.records.map(record => ({
        id: record.id,
        name: record.fields.Name || 'Unknown',
        sex: record.fields.sex || record.fields.Sex || 'female',
        art_style: record.fields.art_style || record.fields.ArtStyle || 'realistic',
        ethnicity: record.fields.ethnicity || record.fields.Ethnicity || 'white',
        hair_length: record.fields.hair_length || record.fields.HairLength || 'medium',
        hair_color: record.fields.hair_color || record.fields.HairColor || 'brown',
        category: record.fields.Category || 'general',
        slug: record.fields.Slug || record.fields.slug
      }));

      allCharacters.push(...characters);
      totalFetched += characters.length;

      log(Colors.CYAN, `   📊 Fetched ${totalFetched} characters so far...`);

      if (!data.offset) {
        break;
      }

      offset = data.offset;
      await delay(200); // Small delay between paginated requests
    }
  } catch (error) {
    log(Colors.RED, `❌ Error fetching characters: ${error.message}`);
    throw error;
  }

  log(Colors.GREEN, `✅ Found ${allCharacters.length} characters with empty avatar_url`);
  return allCharacters;
}

// Generate avatar for a character using the existing avatar generation function
async function generateAvatarForCharacter(character) {
  try {
    log(Colors.YELLOW, `🎨 Generating avatar for: ${character.name}`);

    const generateUrl = `${process.env.NETLIFY_FUNCTIONS_URL || 'https://selira.ai/.netlify/functions'}/selira-generate-companion-avatar`;

    const payload = {
      characterName: character.name,
      artStyle: character.art_style,
      sex: character.sex,
      ethnicity: character.ethnicity,
      hairLength: character.hair_length,
      hairColor: character.hair_color
    };

    log(Colors.CYAN, `   📝 Payload: ${JSON.stringify(payload)}`);

    const response = await fetch(generateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Avatar generation failed: ${response.status} ${errorText}`);
    }

    const result = await response.json();

    if (!result.success || !result.imageUrl) {
      throw new Error(`No image URL returned: ${JSON.stringify(result)}`);
    }

    log(Colors.GREEN, `   ✅ Avatar generated: ${result.imageUrl}`);
    return result.imageUrl;

  } catch (error) {
    log(Colors.RED, `   ❌ Failed to generate avatar for ${character.name}: ${error.message}`);
    return null;
  }
}

// Update character's avatar_url in Airtable
async function updateCharacterAvatar(characterId, avatarUrl) {
  try {
    const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Characters/${characterId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: {
          Avatar_URL: avatarUrl
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Airtable update failed: ${response.status} ${errorText}`);
    }

    log(Colors.GREEN, `   ✅ Updated Airtable with avatar URL`);
    return true;
  } catch (error) {
    log(Colors.RED, `   ❌ Failed to update Airtable: ${error.message}`);
    return false;
  }
}

// Process a batch of characters
async function processBatch(characters, batchNumber) {
  log(Colors.MAGENTA, `\n🔄 Processing batch ${batchNumber} (${characters.length} characters)`);

  let successful = 0;
  let failed = 0;

  for (let i = 0; i < characters.length; i++) {
    const character = characters[i];

    log(Colors.BLUE, `\n[${i + 1}/${characters.length}] Processing: ${character.name} (${character.id})`);
    log(Colors.CYAN, `   Attributes: ${character.sex}, ${character.ethnicity}, ${character.art_style}, ${character.hair_length} ${character.hair_color} hair`);

    // Generate avatar
    const avatarUrl = await generateAvatarForCharacter(character);

    if (avatarUrl) {
      // Update Airtable
      const updated = await updateCharacterAvatar(character.id, avatarUrl);
      if (updated) {
        successful++;
        log(Colors.GREEN, `   ✅ Successfully processed ${character.name}`);
      } else {
        failed++;
      }
    } else {
      failed++;
      log(Colors.RED, `   ❌ Skipped ${character.name} due to avatar generation failure`);
    }

    // Delay between characters to avoid rate limiting
    if (i < characters.length - 1) {
      log(Colors.YELLOW, `   ⏳ Waiting ${DELAY_BETWEEN_REQUESTS/1000}s before next character...`);
      await delay(DELAY_BETWEEN_REQUESTS);
    }
  }

  log(Colors.MAGENTA, `\n📊 Batch ${batchNumber} completed: ${successful} successful, ${failed} failed`);
  return { successful, failed };
}

// Main function
async function main() {
  log(Colors.BLUE, '🚀 Starting avatar generation for empty avatar_url fields');
  log(Colors.CYAN, `📝 Processing in batches of ${BATCH_SIZE} with ${DELAY_BETWEEN_REQUESTS/1000}s delay between requests\n`);

  try {
    // Get all characters with empty avatars
    const characters = await getCharactersWithEmptyAvatars();

    if (characters.length === 0) {
      log(Colors.GREEN, '✅ No characters found with empty avatar_url fields!');
      return;
    }

    // Process in batches
    let totalSuccessful = 0;
    let totalFailed = 0;

    for (let i = 0; i < characters.length; i += BATCH_SIZE) {
      const batch = characters.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;

      const result = await processBatch(batch, batchNumber);
      totalSuccessful += result.successful;
      totalFailed += result.failed;

      // Delay between batches
      if (i + BATCH_SIZE < characters.length) {
        log(Colors.YELLOW, `⏳ Waiting 5s before next batch...`);
        await delay(5000);
      }
    }

    // Final summary
    log(Colors.GREEN, `\n🎉 Avatar generation completed!`);
    log(Colors.GREEN, `✅ Successfully processed: ${totalSuccessful} characters`);
    if (totalFailed > 0) {
      log(Colors.RED, `❌ Failed to process: ${totalFailed} characters`);
    }
    log(Colors.BLUE, `📊 Total characters processed: ${totalSuccessful + totalFailed}`);

  } catch (error) {
    log(Colors.RED, `❌ Fatal error: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    log(Colors.RED, `❌ Unhandled error: ${error.message}`);
    console.error(error);
    process.exit(1);
  });
}

module.exports = { main };