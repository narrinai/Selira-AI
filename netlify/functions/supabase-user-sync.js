// Supabase User Sync to Airtable
// Creates or updates user in Airtable Users table with SupabaseID

// Use Selira Airtable base (not old Narrin base)
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN_SELIRA || process.env.AIRTABLE_TOKEN;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID_SELIRA || process.env.AIRTABLE_BASE_ID;

// Generate random username like "QuietPanda2259"
function generateUsername() {
  const adjectives = ['Happy', 'Brave', 'Calm', 'Bright', 'Swift', 'Noble', 'Kind', 'Wise', 'Bold', 'Quiet', 'Gentle', 'Fierce', 'Cool', 'Lucky', 'Wild'];
  const nouns = ['Tiger', 'Eagle', 'Wolf', 'Bear', 'Fox', 'Lion', 'Hawk', 'Owl', 'Panda', 'Dragon', 'Phoenix', 'Falcon', 'Raven', 'Lynx', 'Panther'];

  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const number = Math.floor(1000 + Math.random() * 9000); // 4-digit number

  return `${adjective}${noun}${number}`;
}

exports.handler = async (event) => {
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
    const { supabase_id, email, name, display_name } = JSON.parse(event.body);

    console.log('🔄 Supabase user sync:', { email, supabase_id: supabase_id?.substring(0, 20) + '...' });

    if (!supabase_id || !email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Missing required fields: supabase_id, email'
        })
      };
    }

    // Check if user already exists by SupabaseID or Email
    console.log('🔍 Checking existing user by SupabaseID or Email...');

    const checkUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Users?filterByFormula=OR({SupabaseID}='${supabase_id}',{Email}='${email}')&maxRecords=1`;

    const checkResponse = await fetch(checkUrl, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (checkResponse.ok) {
      const checkData = await checkResponse.json();

      if (checkData.records.length > 0) {
        const existingUser = checkData.records[0];
        console.log('✅ User exists, updating SupabaseID...');

        // Create display name if not exists
        let userDisplayName = existingUser.fields.display_name;
        if (!userDisplayName) {
          if (display_name) {
            userDisplayName = display_name;
          } else {
            // Generate random username like "QuietPanda2259"
            userDisplayName = generateUsername();
          }
          console.log('📝 Setting missing display name for existing user:', userDisplayName);
        }

        // Update existing user with SupabaseID and display name if missing
        const updateFields = {
          SupabaseID: supabase_id
        };

        // Only update display_name if it's empty
        if (!existingUser.fields.display_name && userDisplayName) {
          updateFields.display_name = userDisplayName;
        }

        // Update Name if missing
        if (!existingUser.fields.Name && name) {
          updateFields.Name = name;
        }

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
          console.log('✅ User updated with SupabaseID');
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              action: 'updated',
              user_id: existingUser.id,
              message: 'User updated with SupabaseID'
            })
          };
        }
      }
    }

    // Create new user with display name
    console.log('🔨 Creating new user...');

    // Generate display name - always use generated username for email signups
    let defaultDisplayName = '';
    if (display_name) {
      defaultDisplayName = display_name;
    } else {
      // Generate random username like "QuietPanda2259"
      defaultDisplayName = generateUsername();
    }

    console.log('📝 Setting display name:', defaultDisplayName);

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
            SupabaseID: supabase_id,
            Name: name || defaultDisplayName,
            display_name: defaultDisplayName,
            Plan: 'Free',
            email_notifications: true,
            email_marketing: true
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
    console.error('❌ Supabase user sync error:', error);
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
