// Clean Selira user sync function - no legacy code
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
    const { auth0_id, email, name, picture, display_name } = JSON.parse(event.body);
    
    console.log('🔄 Selira user sync:', { email, auth0_id: auth0_id?.substring(0, 20) + '...' });

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

    // Check if user already exists by email
    console.log('🔍 Checking existing user by email...');
    
    const checkResponse = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Users?filterByFormula={Email}='${email}'&maxRecords=1`, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (checkResponse.ok) {
      const checkData = await checkResponse.json();
      
      if (checkData.records.length > 0) {
        const existingUser = checkData.records[0];
        console.log('✅ User exists, updating Auth0ID...');
        
        // Update existing user with Auth0ID only (keep it simple)
        const updateFields = {
          Auth0ID: auth0_id
        };
        
        const updateResponse = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Users/${existingUser.id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fields: updateFields
          })
        });

        if (updateResponse.ok) {
          console.log('✅ User updated with Auth0ID');
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              action: 'updated',
              user_id: existingUser.id,
              message: 'User updated with Auth0ID'
            })
          };
        }
      }
    }

    // Create new user
    console.log('🔨 Creating new user...');
    
    const createResponse = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Users`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        records: [{
          fields: {
            Email: email,
            Auth0ID: auth0_id
          }
        }]
      })
    });

    if (!createResponse.ok) {
      const errorData = await createResponse.text();
      console.error('❌ Failed to create user:', createResponse.status, errorData);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Failed to create user',
          details: errorData
        })
      };
    }

    const createData = await createResponse.json();
    const newUser = createData.records[0];
    
    console.log('✅ New user created:', newUser.id);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        action: 'created',
        user_id: newUser.id,
        message: 'User created successfully'
      })
    };

  } catch (error) {
    console.error('❌ Selira sync error:', error);
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