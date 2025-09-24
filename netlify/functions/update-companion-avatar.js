// netlify/functions/update-companion-avatar.js
// Updates companion avatar URL in Airtable

exports.handler = async (event, context) => {
  console.log('🔄 update-companion-avatar function called');

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID_SELIRA;
  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN_SELIRA;

  if (!AIRTABLE_BASE_ID || !AIRTABLE_TOKEN) {
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Airtable credentials not found' })
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { companionName, companionId, newAvatarUrl } = body;

    console.log('📝 Update request:', { companionName, companionId, newAvatarUrl });

    if (!newAvatarUrl || (!companionName && !companionId)) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Missing required parameters' })
      };
    }

    let recordId = companionId;

    // If we only have name, find the record ID
    if (!recordId && companionName) {
      console.log(`🔍 Looking up record ID for: ${companionName}`);

      const findResponse = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Characters?filterByFormula={Name}="${companionName}"`, {
        headers: {
          'Authorization': `Bearer ${AIRTABLE_TOKEN}`
        }
      });

      if (findResponse.ok) {
        const findResult = await findResponse.json();
        if (findResult.records && findResult.records.length > 0) {
          recordId = findResult.records[0].id;
          console.log(`✅ Found record ID: ${recordId}`);
        } else {
          console.log(`❌ No record found for: ${companionName}`);
          return {
            statusCode: 404,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ error: 'Companion not found' })
          };
        }
      } else {
        console.log(`❌ Search failed for: ${companionName}`);
        throw new Error('Failed to search for companion');
      }
    }

    // Update the avatar URL
    console.log(`📤 Updating avatar URL for record: ${recordId}`);

    const updateResponse = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Characters/${recordId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: {
          Avatar_URL: newAvatarUrl
        }
      })
    });

    if (updateResponse.ok) {
      const result = await updateResponse.json();
      console.log(`✅ Successfully updated avatar URL for ${companionName || recordId}`);

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: true,
          message: 'Avatar URL updated successfully',
          recordId: recordId,
          newAvatarUrl: newAvatarUrl
        })
      };
    } else {
      const errorText = await updateResponse.text();
      console.error(`❌ Airtable update failed: ${errorText}`);
      throw new Error(`Airtable update failed: ${errorText}`);
    }

  } catch (error) {
    console.error('❌ Update avatar error:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Avatar update failed',
        details: error.message
      })
    };
  }
};