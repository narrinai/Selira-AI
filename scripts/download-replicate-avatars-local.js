#!/usr/bin/env node

/**
 * Script to download Replicate avatars and save them locally
 * Run this locally (not on Netlify) to download avatars to /avatars folder
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const AIRTABLE_BASE_ID = 'appyMZrR9e0YBCmBB';
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN || process.env.AIRTABLE_API_KEY;
const AIRTABLE_TABLE = 'tblRLBLmHqeSMcAvo';

if (!AIRTABLE_TOKEN) {
  console.error('❌ Please set AIRTABLE_TOKEN environment variable');
  process.exit(1);
}

// Function to fetch characters with Replicate URLs
async function fetchCharactersWithReplicateUrls() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.airtable.com',
      path: `/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE}?filterByFormula=AND(FIND("replicate.delivery",{Avatar_URL}),NOT({Local_Avatar_Path}))&maxRecords=100`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result.records || []);
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// Function to download image from URL
async function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);

    https.get(url, (response) => {
      response.pipe(file);

      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => {}); // Delete the file on error
      reject(err);
    });
  });
}

// Function to update Airtable with local path
async function updateAirtableWithLocalPath(recordId, localPath) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      fields: {
        Local_Avatar_Path: localPath
      }
    });

    const options = {
      hostname: 'api.airtable.com',
      path: `/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE}/${recordId}`,
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(responseData));
        } else {
          reject(new Error(`Failed to update Airtable: ${res.statusCode}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Main function
async function main() {
  console.log('🔍 Searching for characters with Replicate URLs...');

  try {
    // Ensure avatars directory exists
    const avatarsDir = path.join(process.cwd(), 'avatars');
    if (!fs.existsSync(avatarsDir)) {
      fs.mkdirSync(avatarsDir, { recursive: true });
      console.log('📁 Created avatars directory');
    }

    // Fetch characters
    const characters = await fetchCharactersWithReplicateUrls();
    console.log(`📊 Found ${characters.length} characters with Replicate URLs`);

    if (characters.length === 0) {
      console.log('✅ No new avatars to download');
      return;
    }

    // Process each character
    let successCount = 0;
    let errorCount = 0;

    for (const record of characters) {
      const { id, fields } = record;
      const { Name, Slug, Avatar_URL } = fields;

      if (!Avatar_URL || typeof Avatar_URL !== 'string' || !Avatar_URL.includes('replicate.delivery')) {
        console.log(`⏭️  Skipping ${Name} - no valid Replicate URL`);
        continue;
      }

      console.log(`\n📥 Processing ${Name} (${Slug})`);

      try {
        // Generate filename
        const timestamp = Date.now();
        const slug = Slug || Name.toLowerCase().replace(/[^a-z0-9]/g, '-');
        const filename = `${slug}-${timestamp}.webp`;
        const filepath = path.join(avatarsDir, filename);
        const publicPath = `/avatars/${filename}`;

        // Download the image
        console.log(`   📥 Downloading from: ${Avatar_URL.substring(0, 50)}...`);
        await downloadImage(Avatar_URL, filepath);

        // Verify file was created
        const stats = fs.statSync(filepath);
        if (stats.size > 0) {
          console.log(`   ✅ Saved: ${filename} (${(stats.size / 1024).toFixed(1)} KB)`);

          // Update Airtable with local path
          await updateAirtableWithLocalPath(id, publicPath);
          console.log(`   📝 Updated Airtable with local path`);

          successCount++;
        } else {
          console.error(`   ❌ Downloaded file is empty`);
          errorCount++;
        }

      } catch (error) {
        console.error(`   ❌ Error processing ${Name}:`, error.message);
        errorCount++;
      }
    }

    // Summary
    console.log('\n📊 Download Summary:');
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📁 Total avatars in folder: ${fs.readdirSync(avatarsDir).length}`);

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);