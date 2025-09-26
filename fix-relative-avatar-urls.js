const fetch = require('node-fetch');

// Configuration
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID_SELIRA || process.env.AIRTABLE_BASE_ID || process.env.AIRTABLE_BASE;
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN_SELIRA || process.env.AIRTABLE_TOKEN;
const BASE_URL = 'https://selira.ai';

async function fixRelativeAvatarUrls() {
  console.log('🔧 Fixing relative avatar URLs to full URLs in Airtable...');

  try {
    // Fetch all characters with relative avatar URLs
    const fetchUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Characters?filterByFormula=LEFT({Avatar_URL}, 9) = '/avatars/'`;

    const response = await fetch(fetchUrl, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.records || data.records.length === 0) {
      console.log('✅ No characters with relative avatar URLs found');
      return;
    }

    console.log(`📊 Found ${data.records.length} characters with relative avatar URLs`);

    // Process each character
    let successful = 0;
    let failed = 0;

    for (const record of data.records) {
      const character = record.fields;
      const relativeUrl = character.Avatar_URL;

      if (relativeUrl && relativeUrl.startsWith('/avatars/')) {
        const fullUrl = `${BASE_URL}${relativeUrl}`;

        console.log(`🔄 Updating ${character.Name}: ${relativeUrl} -> ${fullUrl}`);

        try {
          // Update the record with full URL
          const updateResponse = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Characters/${record.id}`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              fields: {
                Avatar_URL: fullUrl
              }
            })
          });

          if (updateResponse.ok) {
            console.log(`✅ Updated ${character.Name}`);
            successful++;
          } else {
            console.error(`❌ Failed to update ${character.Name}: ${updateResponse.status}`);
            failed++;
          }

          // Small delay to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
          console.error(`❌ Error updating ${character.Name}:`, error.message);
          failed++;
        }
      }
    }

    console.log('\n📊 Update Results:');
    console.log(`✅ Successfully updated: ${successful}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success rate: ${((successful / (successful + failed)) * 100).toFixed(1)}%`);

  } catch (error) {
    console.error('💥 Error fetching characters:', error.message);
  }
}

// Main execution
async function main() {
  try {
    await fixRelativeAvatarUrls();
    console.log('\n🎉 Avatar URL fix process completed!');
  } catch (error) {
    console.error('💥 Fatal error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { fixRelativeAvatarUrls };