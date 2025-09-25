#!/usr/bin/env node

// Script to check how many characters have avatars after generation

require('dotenv').config();

const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID_SELIRA || process.env.AIRTABLE_BASE_ID || process.env.AIRTABLE_BASE;
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN_SELIRA || process.env.AIRTABLE_TOKEN;

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

async function checkAvatarResults() {
  log(Colors.BLUE, '📊 Checking avatar generation results...\n');

  try {
    // Check total characters
    const totalUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Characters?fields[]=Name&maxRecords=1000`;
    const totalResponse = await fetch(totalUrl, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!totalResponse.ok) {
      throw new Error(`Failed to fetch total characters: ${totalResponse.statusText}`);
    }

    const totalData = await totalResponse.json();
    const totalCharacters = totalData.records.length;

    // Check characters with avatars
    const withAvatarFormula = encodeURIComponent("AND({Avatar_URL} != BLANK(), {Name} != BLANK())");
    const withAvatarUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Characters?filterByFormula=${withAvatarFormula}&fields[]=Name&fields[]=Avatar_URL&maxRecords=1000`;

    const withAvatarResponse = await fetch(withAvatarUrl, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!withAvatarResponse.ok) {
      throw new Error(`Failed to fetch characters with avatars: ${withAvatarResponse.statusText}`);
    }

    const withAvatarData = await withAvatarResponse.json();
    const charactersWithAvatars = withAvatarData.records.length;

    // Check characters without avatars
    const withoutAvatarFormula = encodeURIComponent("AND({Avatar_URL} = BLANK(), {Name} != BLANK())");
    const withoutAvatarUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Characters?filterByFormula=${withoutAvatarFormula}&fields[]=Name&maxRecords=1000`;

    const withoutAvatarResponse = await fetch(withoutAvatarUrl, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!withoutAvatarResponse.ok) {
      throw new Error(`Failed to fetch characters without avatars: ${withoutAvatarResponse.statusText}`);
    }

    const withoutAvatarData = await withoutAvatarResponse.json();
    const charactersWithoutAvatars = withoutAvatarData.records.length;

    // Display results
    log(Colors.GREEN, '📊 AVATAR GENERATION RESULTS:');
    log(Colors.CYAN, '================================');
    log(Colors.BLUE, `📋 Total Characters: ${totalCharacters}`);
    log(Colors.GREEN, `✅ Characters with avatars: ${charactersWithAvatars}`);
    log(Colors.RED, `❌ Characters without avatars: ${charactersWithoutAvatars}`);
    log(Colors.YELLOW, `📈 Success rate: ${Math.round((charactersWithAvatars / totalCharacters) * 100)}%`);
    log(Colors.CYAN, '================================\n');

    if (charactersWithoutAvatars > 0) {
      log(Colors.YELLOW, '📝 Characters still missing avatars:');
      withoutAvatarData.records.slice(0, 10).forEach((record, index) => {
        log(Colors.RED, `   ${index + 1}. ${record.fields.Name} (${record.id})`);
      });
      if (charactersWithoutAvatars > 10) {
        log(Colors.YELLOW, `   ... and ${charactersWithoutAvatars - 10} more`);
      }
    } else {
      log(Colors.GREEN, '🎉 All characters now have avatars!');
    }

    // Check recent Replicate URLs (newly generated)
    const replicateFormula = encodeURIComponent("FIND('replicate.delivery', {Avatar_URL})");
    const replicateUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Characters?filterByFormula=${replicateFormula}&fields[]=Name&fields[]=Avatar_URL&maxRecords=100`;

    const replicateResponse = await fetch(replicateUrl, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (replicateResponse.ok) {
      const replicateData = await replicateResponse.json();
      log(Colors.CYAN, `🔗 Characters with Replicate URLs (newly generated): ${replicateData.records.length}`);
    }

  } catch (error) {
    log(Colors.RED, `❌ Error: ${error.message}`);
  }
}

if (require.main === module) {
  checkAvatarResults();
}

module.exports = { checkAvatarResults };