const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight
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
    const {
      messageId,
      feedbackType,
      reportReason,
      messageContent,
      characterSlug,
      characterName,
      userId,
      userEmail
    } = JSON.parse(event.body);

    console.log('📝 Message feedback received:', { messageId, feedbackType, characterSlug, userId, userEmail });
    console.log('📝 userId type:', typeof userId, '| value:', userId);
    console.log('📝 userEmail type:', typeof userEmail, '| value:', userEmail);

    // All feedback types need userId or userEmail to find the ChatHistory record
    if (!userId && !userEmail) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing userId or userEmail for feedback' })
      };
    }

    if (feedbackType === 'report') {
      console.log('🚩 Processing report request for reason:', reportReason);
    }

    const airtableApiKey = process.env.AIRTABLE_TOKEN_SELIRA || process.env.AIRTABLE_API_KEY || process.env.AIRTABLE_TOKEN;
    const airtableBaseId = process.env.AIRTABLE_BASE_ID_SELIRA || process.env.AIRTABLE_BASE_ID;

    console.log('🔑 Airtable config:', {
      hasToken: !!airtableApiKey,
      hasBaseId: !!airtableBaseId,
      baseIdPrefix: airtableBaseId ? airtableBaseId.substring(0, 6) : 'none'
    });

    if (!airtableApiKey || !airtableBaseId) {
      console.error('❌ Missing Airtable credentials');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Server configuration error - missing Airtable credentials' })
      };
    }

    // For all feedback types (thumbs and reports), we need to find the ChatHistory record
    // First, we need to get the User_ID (Airtable record ID)
    // Only use userId if it's a valid Airtable record ID (starts with 'rec')
    let userRecordId = (userId && typeof userId === 'string' && userId.startsWith('rec')) ? userId : null;

    // If no valid userId but we have email, look up the user by email
    if (!userRecordId && userEmail) {
      console.log('🔍 Looking up user by email:', userEmail);
      const userLookupUrl = `https://api.airtable.com/v0/${airtableBaseId}/Users?filterByFormula=${encodeURIComponent(
        `{Email} = '${userEmail}'`
      )}&maxRecords=1`;

      const userLookupResponse = await fetch(userLookupUrl, {
        headers: {
          'Authorization': `Bearer ${airtableApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (userLookupResponse.ok) {
        const userLookupData = await userLookupResponse.json();
        if (userLookupData.records && userLookupData.records.length > 0) {
          userRecordId = userLookupData.records[0].id;
          console.log('✅ Found user record ID:', userRecordId);
        } else {
          console.log('⚠️ No user found with email:', userEmail);
        }
      } else {
        console.error('❌ Failed to lookup user:', await userLookupResponse.text());
      }
    }

    if (!userRecordId) {
      console.log('⚠️ No user record ID available for feedback');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Feedback noted (user not found)' })
      };
    }

    // Search for recent assistant messages from this user
    // Note: Role can be 'assistant' (new) or 'ai assistant' (legacy)
    const filterFormula = `AND({User_ID} = '${userRecordId}', OR({Role} = 'assistant', {Role} = 'ai assistant'))`;
    const searchUrl = `https://api.airtable.com/v0/${airtableBaseId}/ChatHistory?filterByFormula=${encodeURIComponent(
      filterFormula
    )}&sort[0][field]=CreatedTime&sort[0][direction]=desc&maxRecords=10`;

    console.log('🔍 Searching ChatHistory for user:', userRecordId);
    console.log('🔍 Filter formula:', filterFormula);
    console.log('🔍 Search URL:', searchUrl);

    const searchResponse = await fetch(searchUrl, {
      headers: {
        'Authorization': `Bearer ${airtableApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error('❌ Failed to search ChatHistory:', errorText);
      // Still return success - feedback is optional enhancement
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Feedback noted (search failed)' })
      };
    }

    const searchData = await searchResponse.json();
    console.log('📊 Found', searchData.records?.length || 0, 'assistant messages');
    if (searchData.records && searchData.records.length > 0) {
      console.log('📊 First record User_ID:', searchData.records[0].fields?.User_ID);
      console.log('📊 First record Role:', searchData.records[0].fields?.Role);
      console.log('📊 First record ID:', searchData.records[0].id);
    } else {
      console.log('⚠️ No records found. Trying search without Role filter...');
      // Debug: Try searching just by User_ID to see if ANY records exist
      const debugUrl = `https://api.airtable.com/v0/${airtableBaseId}/ChatHistory?filterByFormula=${encodeURIComponent(
        `{User_ID} = '${userRecordId}'`
      )}&maxRecords=5`;
      const debugResponse = await fetch(debugUrl, {
        headers: {
          'Authorization': `Bearer ${airtableApiKey}`,
          'Content-Type': 'application/json'
        }
      });
      if (debugResponse.ok) {
        const debugData = await debugResponse.json();
        console.log('🔍 Debug: Found', debugData.records?.length || 0, 'total records for this user');
        if (debugData.records && debugData.records.length > 0) {
          debugData.records.forEach((r, i) => {
            console.log(`   Record ${i}: Role="${r.fields?.Role}", User_ID="${r.fields?.User_ID}", Message="${(r.fields?.Message || '').substring(0, 50)}..."`);
          });
          // Show all available fields in first record
          console.log('   Available fields:', Object.keys(debugData.records[0].fields || {}));
        }
      }
    }

    // Try to find the most recent AI message
    if (searchData.records && searchData.records.length > 0) {
      const recordToUpdate = searchData.records[0]; // Most recent assistant message

      console.log('📝 Updating record:', recordToUpdate.id);

      const updateUrl = `https://api.airtable.com/v0/${airtableBaseId}/ChatHistory/${recordToUpdate.id}`;

      const updateFields = {};
      if (feedbackType === 'thumbs_up') {
        updateFields.thumbs_up = true;
        updateFields.thumbs_down = false;
      } else if (feedbackType === 'thumbs_down') {
        updateFields.thumbs_up = false;
        updateFields.thumbs_down = true;
      } else if (feedbackType === 'report') {
        // Save report reason to the ChatHistory record
        updateFields.report_reason = reportReason || 'No reason provided';
        console.log('🚩 Reporting message with reason:', reportReason);
      } else if (feedbackType === null) {
        // Remove feedback
        updateFields.thumbs_up = false;
        updateFields.thumbs_down = false;
      }

      const updateResponse = await fetch(updateUrl, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${airtableApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fields: updateFields })
      });

      if (updateResponse.ok) {
        console.log('✅ ChatHistory record updated with feedback');
      } else {
        const errorText = await updateResponse.text();
        console.error('❌ Failed to update ChatHistory:', errorText);
      }
    } else {
      console.log('⚠️ No assistant messages found for user');
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: 'Feedback saved' })
    };

  } catch (error) {
    console.error('❌ Save message feedback error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        details: error.message
      })
    };
  }
};
