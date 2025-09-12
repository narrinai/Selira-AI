// Sync Auth0 user to Airtable Users table
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

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
    const { auth0_id, email, name, nickname } = JSON.parse(event.body);
    
    console.log('🔄 Auth0 user sync request:', { auth0_id, email, name });

    if (!auth0_id || !email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false,
          error: 'Missing required fields: auth0_id, email' 
        })
      };
    }

    // Check if user already exists
    console.log('🔍 Checking if user already exists...');
    const checkUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Users?filterByFormula={Auth0ID}='${auth0_id}'&maxRecords=1`;
    
    const checkResponse = await fetch(checkUrl, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (checkResponse.ok) {
      const checkData = await checkResponse.json();
      
      if (checkData.records.length > 0) {
        console.log('✅ User already exists in Airtable');
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            action: 'found_existing',
            user_id: checkData.records[0].id,
            message: 'User already synchronized'
          })
        };
      }
    }

    // Create new user in Airtable
    console.log('🔨 Creating new user in Airtable...');
    const createUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Users`;
    
    const userData = {
      records: [{
        fields: {
          Email: email,
          Auth0ID: auth0_id,
          Name: name || nickname || email.split('@')[0],
          Nickname: nickname || email.split('@')[0]
        }
      }]
    };

    const createResponse = await fetch(createUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData)
    });

    if (createResponse.ok) {
      const createData = await createResponse.json();
      const newUser = createData.records[0];
      
      console.log('✅ User created successfully:', {
        id: newUser.id,
        email: newUser.fields.Email,
        auth0_id: newUser.fields.Auth0ID
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          action: 'created_new',
          user_id: newUser.id,
          message: 'User synchronized to Airtable'
        })
      };
    } else {
      const errorData = await createResponse.text();
      console.error('❌ Failed to create user:', createResponse.status, errorData);
      
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Failed to create user in Airtable',
          details: errorData
        })
      };
    }

  } catch (error) {
    console.error('❌ Sync error:', error);
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