// netlify/functions/download-replicate-avatars-scheduled.js
// Scheduled function to download external URLs (Replicate/ImgBB/googleapis) and convert to local storage
// Runs once per day at 3:00 AM UTC to reduce credit usage

const fetch = require('node-fetch');
const schedule = "0 3 * * *"; // Run at 03:00 UTC daily (05:00 CEST)

const handler = async (event, context) => {
  console.log('📥 Starting scheduled external URL download (Replicate/ImgBB/googleapis)...');

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

    console.log('🔍 Fetching companions with external URLs (Replicate/ImgBB/googleapis)...');

    do {
      // Find Replicate, ImgBB, AND googleapis URLs to convert to local storage
      const filterFormula = encodeURIComponent("OR(FIND('replicate.delivery', {Avatar_URL}), FIND('i.ibb.co', {Avatar_URL}), FIND('imgbb.com', {Avatar_URL}), FIND('googleapis.com', {Avatar_URL}), FIND('storage.googleapis.com', {Avatar_URL}))");
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

    console.log(`📊 Found ${allRecords.length} companions with external URLs (Replicate/ImgBB/googleapis)`);

    if (allRecords.length === 0) {
      console.log('✨ No external URLs to convert!');
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: 'No external URLs found'
        })
      };
    }

    // Process up to 20 companions per run (faster than regeneration)
    const maxToProcess = Math.min(20, allRecords.length);
    let successCount = 0;
    let failCount = 0;

    console.log(`⚡ Processing ${maxToProcess} companions (converting to local storage)...\n`);

    for (let i = 0; i < maxToProcess; i++) {
      const record = allRecords[i];
      const fields = record.fields;
      const name = fields.Name;
      const slug = fields.Slug || fields.Character_ID;
      const externalUrl = fields.Avatar_URL;

      console.log(`[${i+1}/${maxToProcess}] ${name} (${slug})`);

      try {
        // Determine source type
        let sourceType = 'unknown';
        if (externalUrl.includes('replicate.delivery')) sourceType = 'Replicate';
        else if (externalUrl.includes('ibb.co') || externalUrl.includes('imgbb.com')) sourceType = 'ImgBB';
        else if (externalUrl.includes('googleapis.com')) sourceType = 'googleapis';

        // Download image from external URL
        console.log(`   📥 Downloading from ${sourceType}...`);
        const imageResponse = await fetch(externalUrl);

        if (!imageResponse.ok) {
          console.log(`   ❌ Failed to download (${imageResponse.status})`);
          failCount++;
          continue;
        }

        // Get image data
        const imageBuffer = await imageResponse.arrayBuffer();
        const timestamp = Date.now();

        // Determine file extension from URL or content-type
        let extension = 'webp';
        if (externalUrl.includes('.webp')) extension = 'webp';
        else if (externalUrl.includes('.png')) extension = 'png';
        else if (externalUrl.includes('.jpg') || externalUrl.includes('.jpeg')) extension = 'jpg';
        else {
          // Fallback to content-type header
          const contentType = imageResponse.headers.get('content-type');
          if (contentType?.includes('webp')) extension = 'webp';
          else if (contentType?.includes('png')) extension = 'png';
          else if (contentType?.includes('jpeg') || contentType?.includes('jpg')) extension = 'jpg';
        }

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
