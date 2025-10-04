// Download avatar from URL and save to avatars folder
// Returns local URL for the downloaded avatar

const fetch = require('node-fetch');
const fs = require('fs').promises;
const path = require('path');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { imageUrl, companionName, companionId } = JSON.parse(event.body);

    if (!imageUrl || !companionName) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing imageUrl or companionName' })
      };
    }

    console.log(`📥 Downloading avatar for: ${companionName}`);

    // Download image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Download failed: ${response.status}`);
    }

    const buffer = await response.buffer();

    // Create filename
    const slug = companionName.toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    const filename = `${slug}-avatar-${Date.now()}.webp`;

    // Save to avatars folder (relative to project root)
    const avatarPath = path.join(process.cwd(), 'avatars', filename);
    await fs.writeFile(avatarPath, buffer);

    console.log(`✅ Saved avatar: ${filename}`);

    // Return local URL
    const localUrl = `https://selira.ai/avatars/${filename}`;

    // Update Airtable with local URL if companionId provided
    if (companionId) {
      const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID_SELIRA;
      const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN_SELIRA;

      if (AIRTABLE_BASE_ID && AIRTABLE_TOKEN) {
        const updateResponse = await fetch(
          `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Characters/${companionId}`,
          {
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
          }
        );

        if (updateResponse.ok) {
          console.log(`✅ Updated Airtable with local URL`);
        } else {
          console.warn(`⚠️ Failed to update Airtable: ${updateResponse.status}`);
        }
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        localUrl: localUrl,
        filename: filename
      })
    };

  } catch (error) {
    console.error('❌ Download avatar error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};
