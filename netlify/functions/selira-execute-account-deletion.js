// Execute Account Deletion for Selira AI
// This function:
// 1. Saves deletion feedback to Account_Deletions table
// 2. Collects last 25 messages and chat summary
// 3. Deletes user data from Airtable (ChatHistory, Memories, Custom_Companions, Users)
// 4. Deletes user from Supabase

const { createClient } = require('@supabase/supabase-js');

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN_SELIRA || process.env.AIRTABLE_TOKEN;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID_SELIRA || process.env.AIRTABLE_BASE_ID;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
    const {
      email,
      supabase_id,
      deletion_reason,
      reason_details
    } = JSON.parse(event.body);

    console.log('🗑️ Account deletion request:', { email, supabase_id, deletion_reason });

    // Validate required fields
    if (!email || !supabase_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields: email, supabase_id' })
      };
    }

    if (!deletion_reason) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Please select a reason for deletion' })
      };
    }

    // Step 1: Get user record from Airtable
    console.log('👤 Looking up user in Airtable...');
    const userResponse = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Users?filterByFormula=OR({Email}='${email}',{SupabaseID}='${supabase_id}')&maxRecords=1`,
      {
        headers: {
          'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!userResponse.ok) {
      throw new Error('Failed to lookup user in Airtable');
    }

    const userData = await userResponse.json();
    if (userData.records.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'User not found in database' })
      };
    }

    const userRecord = userData.records[0];
    const airtableUserId = userRecord.id;
    const userPlan = userRecord.fields.Plan || 'Free';
    const userCreatedDate = userRecord.fields.Created || userRecord.fields.createdTime;

    console.log('✅ User found:', airtableUserId, 'Plan:', userPlan);

    // Step 2: Get chat history statistics and last 25 messages
    console.log('📊 Collecting chat history...');

    // Get all chat messages for this user
    let allMessages = [];
    let offset = null;

    do {
      // Use FIND with ARRAYJOIN on linked User field since User_ID can be inconsistent
      const filterFormula = encodeURIComponent(`OR({User_ID}='${airtableUserId}',FIND('${airtableUserId}',ARRAYJOIN({User}))>0)`);
      const chatUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/ChatHistory?filterByFormula=${filterFormula}&sort[0][field]=Created&sort[0][direction]=desc${offset ? `&offset=${offset}` : ''}`;

      console.log('🔍 ChatHistory filter formula:', decodeURIComponent(filterFormula));
      console.log('🔍 ChatHistory URL:', chatUrl);

      const chatResponse = await fetch(chatUrl, {
        headers: {
          'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('🔍 ChatHistory response status:', chatResponse.status);

      if (chatResponse.ok) {
        const chatData = await chatResponse.json();
        console.log('🔍 ChatHistory records found this batch:', chatData.records?.length || 0);
        if (chatData.records?.length > 0) {
          console.log('🔍 First record sample:', JSON.stringify(chatData.records[0].fields, null, 2));
        }
        allMessages = allMessages.concat(chatData.records);
        offset = chatData.offset;
      } else {
        const errorText = await chatResponse.text();
        console.log('⚠️ Could not fetch chat history:', chatResponse.status, errorText);
        break;
      }
    } while (offset && allMessages.length < 1000); // Limit to 1000 for safety

    console.log(`📊 Found ${allMessages.length} total messages`);

    // Get last 25 messages (already sorted desc, so first 25)
    const last25Messages = allMessages.slice(0, 25).map(record => ({
      role: record.fields.Role,
      message: record.fields.Message?.substring(0, 500), // Truncate long messages
      created: record.fields.Created
    }));

    // Calculate chat summary
    const uniqueCharacters = new Set();
    const characterMessageCounts = {};

    allMessages.forEach(record => {
      const charId = record.fields.Character?.[0];
      if (charId) {
        uniqueCharacters.add(charId);
        characterMessageCounts[charId] = (characterMessageCounts[charId] || 0) + 1;
      }
    });

    // Find favorite character (most messages)
    let favoriteCharacterId = null;
    let maxMessages = 0;
    Object.entries(characterMessageCounts).forEach(([charId, count]) => {
      if (count > maxMessages) {
        maxMessages = count;
        favoriteCharacterId = charId;
      }
    });

    // Get favorite character name
    let favoriteCharacterName = 'Unknown';
    if (favoriteCharacterId) {
      try {
        const charResponse = await fetch(
          `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Characters/${favoriteCharacterId}`,
          {
            headers: {
              'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
              'Content-Type': 'application/json'
            }
          }
        );
        if (charResponse.ok) {
          const charData = await charResponse.json();
          favoriteCharacterName = charData.fields.Name || 'Unknown';
        }
      } catch (e) {
        console.log('⚠️ Could not fetch favorite character name');
      }
    }

    const chatSummary = {
      total_messages: allMessages.length,
      unique_characters: uniqueCharacters.size,
      favorite_character: favoriteCharacterName,
      favorite_character_messages: maxMessages,
      user_messages: allMessages.filter(m => m.fields.Role === 'user').length,
      assistant_messages: allMessages.filter(m => m.fields.Role === 'assistant').length
    };

    console.log('📊 Chat summary:', chatSummary);

    // Step 3: Save to Account_Deletions table
    console.log('💾 Saving deletion record...');

    const deletionRecord = {
      fields: {
        Email: email,
        Deletion_Reason: deletion_reason,
        Reason_Details: reason_details || '',
        Last_25_Messages: JSON.stringify(last25Messages, null, 2),
        Chat_Summary: JSON.stringify(chatSummary, null, 2),
        Total_Messages: allMessages.length,
        Total_Characters_Chatted: uniqueCharacters.size,
        Favorite_Character: favoriteCharacterName,
        User_Since: userCreatedDate ? userCreatedDate.split('T')[0] : null,
        Deletion_Date: new Date().toISOString().split('T')[0],
        Plan_At_Deletion: userPlan,
        Supabase_ID: supabase_id,
        Airtable_User_ID: airtableUserId
      }
    };

    const saveDeletionResponse = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Account_Deletions`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ records: [deletionRecord] })
      }
    );

    if (!saveDeletionResponse.ok) {
      const errorText = await saveDeletionResponse.text();
      console.error('❌ Failed to save deletion record:', errorText);
      // Continue with deletion even if saving fails
    } else {
      console.log('✅ Deletion record saved');
    }

    // Step 4: Delete chat history from Airtable
    console.log('🗑️ Deleting chat history...');

    // Airtable allows max 10 records per delete request
    const chatRecordIds = allMessages.map(r => r.id);
    for (let i = 0; i < chatRecordIds.length; i += 10) {
      const batch = chatRecordIds.slice(i, i + 10);
      const deleteParams = batch.map(id => `records[]=${id}`).join('&');

      await fetch(
        `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/ChatHistory?${deleteParams}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );
    }
    console.log(`✅ Deleted ${chatRecordIds.length} chat messages`);

    // Step 5: Delete memories
    console.log('🗑️ Deleting memories...');

    const memoriesFilterFormula = encodeURIComponent(`OR({User_ID}='${airtableUserId}',FIND('${airtableUserId}',ARRAYJOIN({User}))>0)`);
    const memoriesResponse = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Memories?filterByFormula=${memoriesFilterFormula}`,
      {
        headers: {
          'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (memoriesResponse.ok) {
      const memoriesData = await memoriesResponse.json();
      const memoryIds = memoriesData.records.map(r => r.id);

      for (let i = 0; i < memoryIds.length; i += 10) {
        const batch = memoryIds.slice(i, i + 10);
        const deleteParams = batch.map(id => `records[]=${id}`).join('&');

        await fetch(
          `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Memories?${deleteParams}`,
          {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
              'Content-Type': 'application/json'
            }
          }
        );
      }
      console.log(`✅ Deleted ${memoryIds.length} memories`);
    }

    // Step 6: Delete custom companions
    console.log('🗑️ Deleting custom companions...');

    const companionsFilterFormula = encodeURIComponent(`OR({Creator_ID}='${airtableUserId}',FIND('${airtableUserId}',ARRAYJOIN({Creator}))>0)`);
    const companionsResponse = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Custom_Companions?filterByFormula=${companionsFilterFormula}`,
      {
        headers: {
          'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (companionsResponse.ok) {
      const companionsData = await companionsResponse.json();
      const companionIds = companionsData.records.map(r => r.id);

      for (let i = 0; i < companionIds.length; i += 10) {
        const batch = companionIds.slice(i, i + 10);
        const deleteParams = batch.map(id => `records[]=${id}`).join('&');

        await fetch(
          `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Custom_Companions?${deleteParams}`,
          {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
              'Content-Type': 'application/json'
            }
          }
        );
      }
      console.log(`✅ Deleted ${companionIds.length} custom companions`);
    }

    // Step 7: Delete user record from Airtable
    console.log('🗑️ Deleting user record from Airtable...');

    await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Users/${airtableUserId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('✅ User record deleted from Airtable');

    // Step 8: Delete user from Supabase
    console.log('🗑️ Deleting user from Supabase...');

    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });

      const { error: supabaseError } = await supabaseAdmin.auth.admin.deleteUser(supabase_id);

      if (supabaseError) {
        console.error('⚠️ Supabase deletion error:', supabaseError.message);
        // Don't fail the whole request if Supabase deletion fails
      } else {
        console.log('✅ User deleted from Supabase');
      }
    } else {
      console.log('⚠️ Supabase service role key not configured - skipping Supabase deletion');
    }

    console.log('✅ Account deletion completed successfully');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Account deleted successfully',
        summary: {
          messages_deleted: chatRecordIds.length,
          characters_chatted: uniqueCharacters.size
        }
      })
    };

  } catch (error) {
    console.error('❌ Account deletion error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to delete account',
        details: error.message
      })
    };
  }
};
