// Auth0 User Sync Function for Selira AI
// Syncs Auth0 users to Airtable Users table

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const SELIRA_BASE_ID = process.env.AIRTABLE_BASE_ID_SELIRA;
  const SELIRA_TOKEN = process.env.AIRTABLE_TOKEN_SELIRA;

  if (!SELIRA_BASE_ID || !SELIRA_TOKEN) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Missing Airtable configuration' })
    };
  }

  try {
    const { auth0_id, email, name, picture } = JSON.parse(event.body);
    
    console.log('🔄 Auth0 user sync:', { auth0_id, email, name });

    // Check if user already exists
    const existingUserUrl = `https://api.airtable.com/v0/${SELIRA_BASE_ID}/Users?filterByFormula={Auth0ID}='${auth0_id}'&maxRecords=1`;
    
    const existingResponse = await fetch(existingUserUrl, {
      headers: {
        'Authorization': `Bearer ${SELIRA_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!existingResponse.ok) {
      throw new Error(`Failed to check existing user: ${existingResponse.status}`);
    }

    const existingData = await existingResponse.json();

    if (existingData.records.length > 0) {
      // User exists - update last active
      const userId = existingData.records[0].id;
      const updateUrl = `https://api.airtable.com/v0/${SELIRA_BASE_ID}/Users/${userId}`;
      
      await fetch(updateUrl, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${SELIRA_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fields: {
            LastActive: new Date().toISOString(),
            Name: name // Update name in case it changed
          }
        })
      });

      console.log('✅ Existing user updated');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          action: 'updated',
          user_id: userId
        })
      };
    } else {
      // New user - create record
      const createUrl = `https://api.airtable.com/v0/${SELIRA_BASE_ID}/Users`;
      
      const createResponse = await fetch(createUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SELIRA_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fields: {
            Auth0ID: auth0_id,
            Email: email,
            Name: name,
            Plan: 'Free', // Default plan
            CreatedAt: new Date().toISOString(),
            LastActive: new Date().toISOString(),
            MessageCount: 0,
            TrialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days trial
          }
        })
      });

      if (!createResponse.ok) {
        throw new Error(`Failed to create user: ${createResponse.status}`);
      }

      const newUser = await createResponse.json();
      
      console.log('✅ New user created');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          action: 'created',
          user_id: newUser.id
        })
      };
    }

  } catch (error) {
    console.error('❌ Auth0 user sync error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'User sync failed',
        details: error.message
      })
    };
  }
};