// Setup script to create Account_Deletions table in Airtable
// Run once via: https://selira.ai/.netlify/functions/setup-account-deletions-table
//
// This creates the Account_Deletions table with the following fields:
// - Email (email)
// - Deletion_Reason (single select)
// - Reason_Details (long text) - for "Other" reasons
// - Last_25_Messages (long text) - JSON of last 25 messages
// - Chat_Summary (long text) - summary stats
// - Total_Messages (number)
// - Total_Characters_Chatted (number)
// - Favorite_Character (text)
// - User_Since (date)
// - Deletion_Date (date)
// - Plan_At_Deletion (single select)
// - Supabase_ID (text)
// - Airtable_User_ID (text)

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Only allow GET for safety
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Use GET to run this setup script' })
    };
  }

  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN_SELIRA || process.env.AIRTABLE_TOKEN;
  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID_SELIRA || process.env.AIRTABLE_BASE_ID;

  if (!AIRTABLE_TOKEN || !AIRTABLE_BASE_ID) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Missing Airtable configuration' })
    };
  }

  try {
    // Check if table already exists by trying to read from it
    const checkResponse = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Account_Deletions?maxRecords=1`,
      {
        headers: {
          'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (checkResponse.ok) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Account_Deletions table already exists!',
          instructions: 'Table is ready to use.'
        })
      };
    }

    // Table doesn't exist - provide instructions for manual creation
    // Airtable doesn't have a public API for creating tables, so we provide schema
    const tableSchema = {
      tableName: 'Account_Deletions',
      fields: [
        { name: 'Email', type: 'email', description: 'User email address' },
        {
          name: 'Deletion_Reason',
          type: 'singleSelect',
          options: [
            'Not using it anymore',
            'Found a better alternative',
            'Too expensive',
            'Privacy concerns',
            'Technical issues',
            'Content quality issues',
            'Other'
          ]
        },
        { name: 'Reason_Details', type: 'multilineText', description: 'Additional details for "Other" reason' },
        { name: 'Last_25_Messages', type: 'multilineText', description: 'JSON array of last 25 messages' },
        { name: 'Chat_Summary', type: 'multilineText', description: 'Summary of user chat activity' },
        { name: 'Total_Messages', type: 'number', description: 'Total messages sent by user' },
        { name: 'Total_Characters_Chatted', type: 'number', description: 'Number of unique characters chatted with' },
        { name: 'Favorite_Character', type: 'singleLineText', description: 'Most chatted character name' },
        { name: 'User_Since', type: 'date', description: 'Account creation date' },
        { name: 'Deletion_Date', type: 'date', description: 'When deletion was requested' },
        { name: 'Plan_At_Deletion', type: 'singleSelect', options: ['Free', 'Pro', 'Premium'] },
        { name: 'Supabase_ID', type: 'singleLineText', description: 'Supabase user ID' },
        { name: 'Airtable_User_ID', type: 'singleLineText', description: 'Original Airtable record ID' }
      ]
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: false,
        message: 'Account_Deletions table does not exist yet.',
        instructions: 'Please create the table manually in Airtable with the following schema:',
        schema: tableSchema,
        steps: [
          '1. Go to your Airtable base',
          '2. Click "+ Add or import" to create a new table',
          '3. Name it "Account_Deletions"',
          '4. Add the fields listed in the schema above',
          '5. For Deletion_Reason and Plan_At_Deletion, use Single Select with the options provided',
          '6. Run this endpoint again to verify the table exists'
        ]
      })
    };

  } catch (error) {
    console.error('❌ Setup error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Setup failed',
        details: error.message
      })
    };
  }
};
