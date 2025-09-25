#!/usr/bin/env node

// Script to download all Replicate avatars to /avatars/ and update Airtable
// Usage: node download-and-update-avatars.js

require('dotenv').config();
const fetch = require('node-fetch');
const fs = require('fs').promises;
const path = require('path');

// Environment variables
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

async function downloadAndUpdateAvatars() {
  log(Colors.BLUE, '🚀 Starting avatar download and update process...\n');

  if (!AIRTABLE_BASE_ID || !AIRTABLE_TOKEN) {
    log(Colors.RED, '❌ Missing required environment variables:');
    log(Colors.RED, '   AIRTABLE_BASE_ID or AIRTABLE_BASE');
    log(Colors.RED, '   AIRTABLE_TOKEN');
    process.exit(1);
  }

  try {
    // Find all characters with Replicate URLs
    log(Colors.CYAN, '🔍 Searching for characters with Replicate URLs...');
    const filterFormula = encodeURIComponent("FIND('replicate.delivery', {Avatar_URL})");
    let allCharacters = [];
    let offset = null;
    let totalFetched = 0;

    // Paginate through all records
    while (true) {
      let url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Characters?filterByFormula=${filterFormula}&fields[]=Name&fields[]=Slug&fields[]=Avatar_URL&maxRecords=100`;
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
        throw new Error(`Airtable fetch failed: ${response.statusText}`);
      }

      const data = await response.json();
      allCharacters.push(...data.records);
      totalFetched += data.records.length;

      log(Colors.CYAN, `   📊 Fetched ${totalFetched} records so far...`);

      if (!data.offset) break;
      offset = data.offset;
    }

    log(Colors.GREEN, `✅ Found ${allCharacters.length} characters with Replicate URLs\n`);

    if (allCharacters.length === 0) {
      log(Colors.YELLOW, '🎉 No Replicate URLs found to download!');
      return;
    }

    // Ensure avatars directory exists
    const avatarsDir = path.resolve('./avatars');
    try {
      await fs.access(avatarsDir);
      log(Colors.CYAN, `📁 Using existing avatars directory: ${avatarsDir}`);
    } catch (error) {
      await fs.mkdir(avatarsDir, { recursive: true });
      log(Colors.GREEN, `📁 Created avatars directory: ${avatarsDir}`);
    }

    let processed = 0;
    let failed = 0;
    let skipped = 0;

    // Process each character
    for (let i = 0; i < allCharacters.length; i++) {
      const record = allCharacters[i];
      const { Name, Slug, Avatar_URL } = record.fields;

      log(Colors.BLUE, `\n[${i + 1}/${allCharacters.length}] Processing: ${Name}`);

      try {
        if (!Avatar_URL || !Avatar_URL.includes('replicate.delivery')) {
          log(Colors.YELLOW, '   ⚠️  No Replicate URL found, skipping...');
          skipped++;
          continue;
        }

        // Generate local filename
        const timestamp = Date.now();
        const baseSlug = Slug || Name.toLowerCase().replace(/[^a-z0-9]/g, '-');
        const filename = `${baseSlug}-${timestamp}.webp`;
        const localPath = `/avatars/${filename}`;
        const fullLocalPath = path.join(avatarsDir, filename);

        // Check if file already exists (avoid re-downloading)
        try {
          await fs.access(fullLocalPath);
          log(Colors.YELLOW, '   📁 File already exists locally, updating Airtable only...');
        } catch (error) {
          // File doesn't exist, download it
          log(Colors.CYAN, `   🌐 Downloading: ${Avatar_URL.substring(0, 60)}...`);

          const imageResponse = await fetch(Avatar_URL);
          if (!imageResponse.ok) {
            throw new Error(`Failed to download: ${imageResponse.status} ${imageResponse.statusText}`);
          }

          const buffer = await imageResponse.buffer();
          await fs.writeFile(fullLocalPath, buffer);
          log(Colors.GREEN, `   💾 Saved to: ${filename}`);
        }

        // Update Airtable record with local URL
        log(Colors.CYAN, '   📝 Updating Airtable record...');
        const updateUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Characters/${record.id}`;
        const updateResponse = await fetch(updateUrl, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fields: {
              Avatar_URL: localPath
            }
          })
        });

        if (!updateResponse.ok) {
          const errorText = await updateResponse.text();
          throw new Error(`Failed to update Airtable: ${updateResponse.status} ${errorText}`);
        }

        log(Colors.GREEN, `   ✅ Successfully processed ${Name}`);
        processed++;

        // Small delay to avoid rate limiting
        if (i < allCharacters.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 250));
        }

      } catch (error) {
        log(Colors.RED, `   ❌ Failed to process ${Name}: ${error.message}`);
        failed++;
      }
    }

    // Final summary
    log(Colors.GREEN, `\n🎉 Avatar download and update completed!`);
    log(Colors.GREEN, `✅ Successfully processed: ${processed} characters`);
    if (failed > 0) {
      log(Colors.RED, `❌ Failed to process: ${failed} characters`);
    }
    if (skipped > 0) {
      log(Colors.YELLOW, `⚠️  Skipped: ${skipped} characters`);
    }
    log(Colors.BLUE, `📊 Total characters processed: ${processed + failed + skipped}`);

  } catch (error) {
    log(Colors.RED, `❌ Fatal error: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  downloadAndUpdateAvatars().catch(error => {
    log(Colors.RED, `❌ Unhandled error: ${error.message}`);
    console.error(error);
    process.exit(1);
  });
}

module.exports = { downloadAndUpdateAvatars };