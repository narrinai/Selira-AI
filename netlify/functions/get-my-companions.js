// netlify/functions/get-my-companions.js
// Gets both companions the user has chatted with AND companions they have created
exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: 'Method not allowed' })
    };
  }

  try {
    const requestData = JSON.parse(event.body || '{}');
    const { user_email, user_uid } = requestData;

    if (!user_email || !user_uid) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Missing required parameters: user_email and user_uid'
        })
      };
    }

    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID_SELIRA;
    const AIRTABLE_API_KEY = process.env.AIRTABLE_TOKEN_SELIRA;

    if (!AIRTABLE_BASE_ID || !AIRTABLE_API_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Server configuration error - Missing Airtable credentials'
        })
      };
    }

    const airtableHeaders = {
      'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
      'Content-Type': 'application/json'
    };

    // Step 1: Get user record
    console.log('🔍 Finding user by email and UID:', user_email, user_uid);
    let allUsers = [];
    let offset = null;

    do {
      const usersUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Users${offset ? `?offset=${offset}` : ''}`;
      const usersResponse = await fetch(usersUrl, {
        method: 'GET',
        headers: airtableHeaders
      });

      if (!usersResponse.ok) {
        throw new Error(`Users fetch failed: ${usersResponse.statusText}`);
      }

      const pageData = await usersResponse.json();
      allUsers = allUsers.concat(pageData.records);
      offset = pageData.offset;
    } while (offset);

    // Find user by email (primary identifier)
    let targetUser = allUsers.find(record =>
      record.fields.Email === user_email ||
      (record.fields.Email && record.fields.Email.toLowerCase() === user_email.toLowerCase())
    );

    if (!targetUser) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'User not found in database'
        })
      };
    }

    const userRecordId = targetUser.id;
    const userEmail = targetUser.fields.Email;
    console.log('✅ Found user:', userRecordId, userEmail);

    // Step 2: Get companions from chat history - use both email and record ID for matching
    const userFilter = `OR({User}='${userEmail}',SEARCH('${userRecordId}',ARRAYJOIN({User})))`;
    const chatHistoryUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/ChatHistory?filterByFormula=${userFilter}&sort[0][field]=CreatedTime&sort[0][direction]=desc`;

    const chatResponse = await fetch(chatHistoryUrl, {
      method: 'GET',
      headers: airtableHeaders
    });

    let chattedCharacterIds = [];
    if (chatResponse.ok) {
      const chatData = await chatResponse.json();
      console.log('💬 Found', chatData.records.length, 'chat messages');

      // Extract unique character IDs from chat history
      const characterIdSet = new Set();
      chatData.records.forEach(record => {
        const characterId = record.fields.Character ? record.fields.Character[0] : null;
        if (characterId) {
          characterIdSet.add(characterId);
        }
      });
      chattedCharacterIds = Array.from(characterIdSet);
      console.log('🎭 Found chats with', chattedCharacterIds.length, 'different characters');
    } else {
      console.log('⚠️ Could not fetch chat history, continuing with user-created only');
    }

    // Step 3: Get user-created companions (same logic as characters.js with user_created=true)
    let userCreatedCharacters = [];
    let charactersOffset = null;

    do {
      // Build filter for user-created characters: public visibility AND created by this user (using email)
      const createdByFilter = `AND({Visibility} = "public", OR({Created_By} = "${userEmail}", SEARCH("${userRecordId}", ARRAYJOIN({Created_By}))))`;

      const userCreatedUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Characters?filterByFormula=${encodeURIComponent(createdByFilter)}${charactersOffset ? `&offset=${charactersOffset}` : ''}`;

      const userCreatedResponse = await fetch(userCreatedUrl, {
        method: 'GET',
        headers: airtableHeaders
      });

      if (userCreatedResponse.ok) {
        const pageData = await userCreatedResponse.json();
        userCreatedCharacters = userCreatedCharacters.concat(pageData.records);
        charactersOffset = pageData.offset;
      } else {
        console.log('⚠️ Could not fetch user-created characters');
        break;
      }
    } while (charactersOffset);

    console.log('👤 Found', userCreatedCharacters.length, 'user-created characters');
    const userCreatedIds = userCreatedCharacters.map(char => char.id);

    // Step 4: Combine all character IDs (remove duplicates)
    const allCharacterIds = [...new Set([...chattedCharacterIds, ...userCreatedIds])];
    console.log('🎯 Total unique companions:', allCharacterIds.length);

    if (allCharacterIds.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          companions: [],
          message: 'No companions found for this user'
        })
      };
    }

    // Step 5: Get full character details for all companions
    const characterFilter = allCharacterIds.map(id => `RECORD_ID()='${id}'`).join(',');
    const charactersUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Characters?filterByFormula=OR(${characterFilter})`;

    const charactersResponse = await fetch(charactersUrl, {
      method: 'GET',
      headers: airtableHeaders
    });

    if (!charactersResponse.ok) {
      throw new Error(`Characters fetch failed: ${charactersResponse.statusText}`);
    }

    const charactersData = await charactersResponse.json();
    console.log('🎭 Retrieved', charactersData.records.length, 'character details');

    // Step 6: Format companions with additional metadata
    const companions = charactersData.records.map(character => {
      const fields = character.fields;

      // Determine avatar URL
      let avatarUrl = '';
      if (fields.Local_Avatar_Path && typeof fields.Local_Avatar_Path === 'string') {
        avatarUrl = fields.Local_Avatar_Path;
      } else if (fields.Avatar_URL && Array.isArray(fields.Avatar_URL) && fields.Avatar_URL.length > 0) {
        avatarUrl = fields.Avatar_URL[0].url || '';
      } else if (fields.Avatar_File && Array.isArray(fields.Avatar_File) && fields.Avatar_File.length > 0) {
        avatarUrl = fields.Avatar_File[0].url || '';
      } else if (fields.Avatar_URL && typeof fields.Avatar_URL === 'string') {
        avatarUrl = fields.Avatar_URL;
      }

      // Determine if user created this character
      const isUserCreated = userCreatedIds.includes(character.id);
      const hasChats = chattedCharacterIds.includes(character.id);

      return {
        id: character.id,
        name: fields.Name || '',
        title: fields.Character_Title || '',
        description: fields.Character_Description || '',
        avatar: avatarUrl,
        category: fields.Category || 'historical',
        tags: fields.Tags || [],
        slug: fields.Slug || '',
        creator: fields.Created_by || 'Selira',
        chats: '0', // We don't calculate exact chat count here for performance
        rating: '4.5', // Default rating
        isUserCreated: isUserCreated,
        hasChats: hasChats,
        companion_type: isUserCreated ? 'user-created' : 'chatted'
      };
    });

    // Sort: user-created first, then by name
    companions.sort((a, b) => {
      if (a.isUserCreated && !b.isUserCreated) return -1;
      if (!a.isUserCreated && b.isUserCreated) return 1;
      return a.name.localeCompare(b.name);
    });

    console.log('✅ Final companions:', companions.length);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        companions: companions,
        total: companions.length,
        user_created_count: companions.filter(c => c.isUserCreated).length,
        chatted_count: companions.filter(c => c.hasChats).length,
        user_id: userRecordId
      })
    };

  } catch (error) {
    console.error('❌ Function error:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Internal server error: ' + error.message
      })
    };
  }
};