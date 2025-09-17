// netlify/functions/fix-test-character-avatars.js
// Quick fix for test characters with broken avatar URLs

exports.handler = async (event, context) => {
  console.log('🔧 Fix test character avatars function called');

  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Use Selira-specific environment variables
  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID_SELIRA;
  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN_SELIRA;

  if (!AIRTABLE_BASE_ID || !AIRTABLE_TOKEN) {
    console.error('❌ Selira Airtable credentials not found');
    return {
      statusCode: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: 'Selira Airtable credentials not configured'
      })
    };
  }

  try {
    // Get all characters first
    console.log('📡 Fetching all characters from Airtable...');
    const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Characters?maxRecords=100`, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Airtable API error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`📋 Found ${data.records.length} characters`);

    // Find test characters with broken avatars
    const testCharacters = data.records.filter(record => {
      const name = record.fields.Name || '';
      const avatar = record.fields.Avatar_URL || '';

      // Check if it's a test character OR has a broken avatar URL
      const isTestCharacter = name.includes('Test') || name.includes('Emma') || name.includes('Sarah') || name.includes('Visible');
      const hasBrokenAvatar = avatar.includes('default-companion.webp') ||
                             avatar.includes('female-caucasian') ||
                             avatar.includes('female-asian') ||
                             avatar.includes('placeholder.webp');

      return isTestCharacter || hasBrokenAvatar;
    });

    console.log(`🎯 Found ${testCharacters.length} characters to fix:`, testCharacters.map(r => r.fields.Name));

    // Working avatar options
    const workingAvatars = [
      'https://selira.ai/avatars/aria.webp',
      'https://selira.ai/avatars/ava.webp',
      'https://selira.ai/avatars/emma.webp',
      'https://selira.ai/avatars/sarah.webp',
      'https://selira.ai/avatars/anna.webp',
      'https://selira.ai/avatars/clara.webp',
      'https://selira.ai/avatars/diana.webp',
      'https://selira.ai/avatars/eva.webp',
      'https://selira.ai/avatars/grace.webp',
      'https://selira.ai/avatars/bella.webp'
    ];

    let updatedCount = 0;

    // Update each character
    for (const character of testCharacters) {
      const name = character.fields.Name;
      const sex = character.fields.sex || 'female';

      // Pick avatar based on name or randomly
      let newAvatar;
      if (name.toLowerCase().includes('emma')) {
        newAvatar = 'https://selira.ai/avatars/emma.webp';
      } else if (name.toLowerCase().includes('sarah')) {
        newAvatar = 'https://selira.ai/avatars/sarah.webp';
      } else if (name.toLowerCase().includes('aria')) {
        newAvatar = 'https://selira.ai/avatars/aria.webp';
      } else if (name.toLowerCase().includes('ava')) {
        newAvatar = 'https://selira.ai/avatars/ava.webp';
      } else {
        // Random selection for other characters
        if (sex === 'male') {
          const maleAvatars = ['https://selira.ai/avatars/alex.webp', 'https://selira.ai/avatars/blake.webp', 'https://selira.ai/avatars/chris.webp'];
          newAvatar = maleAvatars[Math.floor(Math.random() * maleAvatars.length)];
        } else {
          newAvatar = workingAvatars[Math.floor(Math.random() * workingAvatars.length)];
        }
      }

      console.log(`🔄 Updating ${name}: ${newAvatar}`);

      // Update character in Airtable
      const updateResponse = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Characters/${character.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fields: {
            Avatar_URL: newAvatar
          }
        })
      });

      if (updateResponse.ok) {
        updatedCount++;
        console.log(`✅ Updated ${name} with avatar: ${newAvatar}`);
      } else {
        console.error(`❌ Failed to update ${name}: ${updateResponse.status}`);
      }

      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        message: `Updated ${updatedCount} characters with working avatars`,
        updated: updatedCount,
        total: testCharacters.length
      })
    };

  } catch (error) {
    console.error('❌ Error fixing avatars:', error);
    return {
      statusCode: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: 'Failed to fix avatars',
        details: error.message
      })
    };
  }
};