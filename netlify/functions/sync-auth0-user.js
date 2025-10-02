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

    // Strategy 1: Check if user exists by Auth0ID
    console.log('🔍 Strategy 1: Checking by Auth0ID...');
    const checkByAuth0 = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Users?filterByFormula={Auth0ID}='${auth0_id}'&maxRecords=1`;
    
    const auth0Response = await fetch(checkByAuth0, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (auth0Response.ok) {
      const auth0Data = await auth0Response.json();
      
      if (auth0Data.records.length > 0) {
        console.log('✅ User found by Auth0ID');
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            action: 'found_by_auth0id',
            user_id: auth0Data.records[0].id,
            message: 'User already synchronized'
          })
        };
      }
    }

    // Strategy 2: Check if user exists by Email (to update existing user)
    console.log('🔍 Strategy 2: Checking by Email to update...');
    const checkByEmail = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Users?filterByFormula={Email}='${email}'&maxRecords=1`;
    
    const emailResponse = await fetch(checkByEmail, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (emailResponse.ok) {
      const emailData = await emailResponse.json();
      
      if (emailData.records.length > 0) {
        const existingUser = emailData.records[0];
        console.log('✅ Found existing user by email, updating Auth0ID...');
        
        // Update existing user with Auth0ID
        const updateUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Users/${existingUser.id}`;
        
        const updateResponse = await fetch(updateUrl, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fields: {
              Auth0ID: auth0_id
            }
          })
        });

        if (updateResponse.ok) {
          console.log('✅ Updated existing user with Auth0ID');
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              action: 'updated_existing',
              user_id: existingUser.id,
              message: 'User updated with Auth0ID'
            })
          };
        }
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
          email_notifications: true,
          email_marketing: true
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