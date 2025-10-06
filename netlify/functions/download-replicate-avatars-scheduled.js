// netlify/functions/download-replicate-avatars-scheduled.js
// Scheduled function to download Replicate URLs and convert to local storage
// Runs every 8 hours (0:00, 8:00, 16:00)

const fetch = require('node-fetch');
const schedule = "0 */8 * * *"; // Run every 8 hours

const handler = async (event, context) => {
  console.log('📥 Starting scheduled Replicate URL download (no regeneration)...');

  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN || process.env.AIRTABLE_API_KEY;
  const AIRTABLE_TABLE_ID = process.env.AIRTABLE_TABLE_ID || 'tblsYou5hdY3yJfNv';
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const GITHUB_OWNER = process.env.GITHUB_OWNER || 'narrinai';
  const GITHUB_REPO = process.env.GITHUB_REPO || 'Selira-AI';

  if (!AIRTABLE_BASE_ID || !AIRTABLE_TOKEN) {
    console.error('❌ Missing required environment variables');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing environment variables' })
    };
  }

  try {
    // Fetch all characters with Replicate URLs (paginated)
    let allRecords = [];
    let offset = null;

    console.log('🔍 Fetching companions with Replicate URLs...');

    do {
      const filterFormula = encodeURIComponent("FIND('replicate.delivery', {Avatar_URL})");
      const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}?filterByFormula=${filterFormula}${offset ? `&offset=${offset}` : ''}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Airtable API error: ${response.status}`);
      }

      const data = await response.json();
      allRecords = allRecords.concat(data.records);
      offset = data.offset;
    } while (offset);

    console.log(`📊 Found ${allRecords.length} companions with Replicate URLs`);

    if (allRecords.length === 0) {
      console.log('✨ No Replicate URLs to convert!');
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: 'No Replicate URLs found'
        })
      };
    }

    // Process up to 20 companions per run (faster than regeneration)
    const maxToProcess = Math.min(20, allRecords.length);
    let successCount = 0;
    let failCount = 0;

    console.log(`⚡ Processing ${maxToProcess} companions (download only, no regeneration)...\n`);

    for (let i = 0; i < maxToProcess; i++) {
      const record = allRecords[i];
      const fields = record.fields;
      const name = fields.Name;
      const slug = fields.Slug || fields.Character_ID;
      const replicateUrl = fields.Avatar_URL;

      console.log(`[${i+1}/${maxToProcess}] ${name} (${slug})`);

      try {
        // Download image from Replicate
        console.log(`   📥 Downloading from Replicate...`);
        const imageResponse = await fetch(replicateUrl);

        if (!imageResponse.ok) {
          console.log(`   ❌ Failed to download (${imageResponse.status})`);
          failCount++;
          continue;
        }

        // Get image data
        const imageBuffer = await imageResponse.arrayBuffer();
        const timestamp = Date.now();
        const extension = replicateUrl.includes('.webp') ? 'webp' : 'png';
        const filename = `${slug}-avatar-${timestamp}.${extension}`;

        if (GITHUB_TOKEN) {
          // Upload to GitHub
          const base64Image = Buffer.from(imageBuffer).toString('base64');
          const githubUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/avatars/${filename}`;

          console.log(`   📤 Uploading to GitHub...`);
          const githubResponse = await fetch(githubUrl, {
            method: 'PUT',
            headers: {
              'Authorization': `token ${GITHUB_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: `Download avatar for ${name}`,
              content: base64Image,
              branch: 'main'
            })
          });

          if (!githubResponse.ok) {
            const errorText = await githubResponse.text();
            console.log(`   ❌ GitHub upload failed: ${githubResponse.status}`);
            console.log(`      ${errorText.substring(0, 100)}`);
            failCount++;
            continue;
          }

          console.log(`   ✅ Uploaded: avatars/${filename}`);

          // Update Airtable with local URL
          const localUrl = `https://selira.ai/avatars/${filename}`;
          const updateUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}/${record.id}`;

          await fetch(updateUrl, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              fields: {
                Avatar_URL: localUrl
              }
            })
          });

          console.log(`   ✅ Updated Airtable with local URL`);
          successCount++;

        } else {
          console.log(`   ⚠️ GitHub token not configured`);
          failCount++;
        }

      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        failCount++;
      }

      // Small delay between downloads (2 seconds)
      if (i < maxToProcess - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log(`\n✨ Complete! Success: ${successCount}, Failed: ${failCount}`);
    console.log(`📊 Remaining: ${allRecords.length - maxToProcess} companions`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        processed: maxToProcess,
        successful: successCount,
        failed: failCount,
        remaining: allRecords.length - maxToProcess
      })
    };

  } catch (error) {
    console.error('❌ Fatal error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to download avatars',
        details: error.message
      })
    };
  }
};

module.exports = { handler, schedule };
