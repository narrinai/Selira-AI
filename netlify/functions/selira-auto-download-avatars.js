// Automatically download Replicate avatars to local /avatars/ folder
// and update Avatar_URL field in Airtable to point to local files

const fetch = require('node-fetch');
const fs = require('fs').promises;
const path = require('path');

exports.handler = async (event, context) => {
  console.log('🔄 Auto-download avatars function triggered');

  const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  }

  try {
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID_SELIRA || process.env.AIRTABLE_BASE_ID || process.env.AIRTABLE_BASE;
    const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN_SELIRA || process.env.AIRTABLE_TOKEN;

    if (!AIRTABLE_BASE_ID || !AIRTABLE_TOKEN) {
      throw new Error('Missing Airtable configuration');
    }

    // Find all characters with Replicate URLs (not yet downloaded)
    console.log('🔍 Looking for characters with Replicate URLs...');
    const filterFormula = encodeURIComponent("FIND('replicate.delivery', {Avatar_URL})");
    let allCharacters = [];
    let offset = null;

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

      if (!data.offset) break;
      offset = data.offset;
    }

    console.log(`📊 Found ${allCharacters.length} characters with Replicate URLs`);

    if (allCharacters.length === 0) {
      return {
        statusCode: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          message: 'No Replicate URLs found to download',
          processed: 0
        })
      };
    }

    let processed = 0;
    let failed = 0;
    const results = [];

    // Process each character
    for (const record of allCharacters) {
      try {
        const { Name, Slug, Avatar_URL } = record.fields;

        if (!Avatar_URL || !Avatar_URL.includes('replicate.delivery')) {
          continue;
        }

        console.log(`📥 Processing: ${Name} (${Slug})`);

        // Generate local filename
        const timestamp = Date.now();
        const filename = `${Slug || Name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${timestamp}.webp`;
        const localPath = `/avatars/${filename}`;
        const fullLocalPath = path.join(process.cwd(), 'avatars', filename);

        // Download the image from Replicate
        console.log(`🌐 Downloading: ${Avatar_URL}`);
        const imageResponse = await fetch(Avatar_URL);

        if (!imageResponse.ok) {
          throw new Error(`Failed to download image: ${imageResponse.status} ${imageResponse.statusText}`);
        }

        const buffer = await imageResponse.buffer();

        // Ensure avatars directory exists
        const avatarsDir = path.join(process.cwd(), 'avatars');
        try {
          await fs.access(avatarsDir);
        } catch (error) {
          await fs.mkdir(avatarsDir, { recursive: true });
          console.log('📁 Created avatars directory');
        }

        // Save the image locally
        await fs.writeFile(fullLocalPath, buffer);
        console.log(`💾 Saved to: ${fullLocalPath}`);

        // Update Airtable record with local URL
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

        console.log(`✅ Updated Airtable record for ${Name}`);
        processed++;

        results.push({
          name: Name,
          slug: Slug,
          localPath: localPath,
          originalUrl: Avatar_URL,
          status: 'success'
        });

        // Small delay to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`❌ Failed to process ${record.fields.Name}: ${error.message}`);
        failed++;

        results.push({
          name: record.fields.Name,
          slug: record.fields.Slug,
          originalUrl: record.fields.Avatar_URL,
          error: error.message,
          status: 'failed'
        });
      }
    }

    console.log(`🎉 Processing complete: ${processed} successful, ${failed} failed`);

    return {
      statusCode: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        message: `Processed ${allCharacters.length} characters`,
        stats: {
          total: allCharacters.length,
          successful: processed,
          failed: failed
        },
        results: results
      })
    };

  } catch (error) {
    console.error('❌ Auto-download avatars error:', error);
    return {
      statusCode: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: 'Failed to process avatar downloads',
        details: error.message
      })
    };
  }
};