// User Management Netlify Function
// Replaces Make.com webhook for user operations

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

  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID_SELIRA;
  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN_SELIRA;

  if (!AIRTABLE_BASE_ID || !AIRTABLE_TOKEN) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Missing Airtable configuration' })
    };
  }

  try {
    const requestData = JSON.parse(event.body);
    const { action, user_uid, email } = requestData;

    console.log('🔄 User management request:', { action, user_uid, email });

    switch (action) {
      case 'get_profile':
        return await getUserProfile(user_uid, email, headers, AIRTABLE_BASE_ID, AIRTABLE_TOKEN);
      
      case 'update_profile':
        return await updateUserProfile(requestData, headers, AIRTABLE_BASE_ID, AIRTABLE_TOKEN);
      
      case 'check_usage':
        return await checkUsage(user_uid, headers, AIRTABLE_BASE_ID, AIRTABLE_TOKEN);
        
      case 'update_usage':
        return await updateUsage(requestData, headers, AIRTABLE_BASE_ID, AIRTABLE_TOKEN);

      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid action specified' })
        };
    }

  } catch (error) {
    console.error('❌ User management error:', error);
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

// Get user profile from Airtable
async function getUserProfile(user_uid, email, headers, baseId, token) {
  try {
    // Try to find user by uid first, then email
    let filterFormula = `{User_UID}='${user_uid}'`;
    if (!user_uid && email) {
      filterFormula = `{Email}='${email}'`;
    }

    const url = `https://api.airtable.com/v0/${baseId}/Users?filterByFormula=${encodeURIComponent(filterFormula)}&maxRecords=1`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Airtable API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.records.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'User not found' })
      };
    }

    const user = data.records[0];
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        user: {
          id: user.id,
          email: user.fields.Email,
          name: user.fields.Name,
          display_name: user.fields.display_name,
          plan: user.fields.Plan || 'Free',
          subscription_status: user.fields.Subscription_Status || 'active',
          message_count: user.fields.Message_Count || 0,
          trial_end_date: user.fields.Trial_End_Date,
          created_at: user.fields.Created_At
        }
      })
    };

  } catch (error) {
    console.error('❌ Get profile error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to get user profile' })
    };
  }
}

// Update user profile in Airtable
async function updateUserProfile(requestData, headers, baseId, token) {
  try {
    const { user_uid, email, updates } = requestData;
    
    // Find user first
    let filterFormula = `{User_UID}='${user_uid}'`;
    if (!user_uid && email) {
      filterFormula = `{Email}='${email}'`;
    }

    const findUrl = `https://api.airtable.com/v0/${baseId}/Users?filterByFormula=${encodeURIComponent(filterFormula)}&maxRecords=1`;
    
    const findResponse = await fetch(findUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const findData = await findResponse.json();
    
    if (findData.records.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'User not found for update' })
      };
    }

    const userId = findData.records[0].id;
    
    // Update user
    const updateUrl = `https://api.airtable.com/v0/${baseId}/Users/${userId}`;
    
    const updateResponse = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: updates
      })
    });

    if (!updateResponse.ok) {
      throw new Error(`Update failed: ${updateResponse.status}`);
    }

    const updatedUser = await updateResponse.json();
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'User profile updated successfully',
        user: updatedUser.fields
      })
    };

  } catch (error) {
    console.error('❌ Update profile error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to update user profile' })
    };
  }
}

// Check user usage
async function checkUsage(user_uid, headers, baseId, token) {
  try {
    const filterFormula = `{User_UID}='${user_uid}'`;
    const url = `https://api.airtable.com/v0/${baseId}/Users?filterByFormula=${encodeURIComponent(filterFormula)}&maxRecords=1`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    
    if (data.records.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'User not found' })
      };
    }

    const user = data.records[0];
    const plan = user.fields.Plan || 'Free';
    const messageCount = user.fields.Message_Count || 0;
    const dailyLimit = plan === 'Free' ? 10 : (plan === 'Engage' ? 999999 : 10);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        usage: {
          current_messages: messageCount,
          daily_limit: dailyLimit,
          plan: plan,
          can_send: messageCount < dailyLimit
        }
      })
    };

  } catch (error) {
    console.error('❌ Check usage error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to check usage' })
    };
  }
}

// Update user usage
async function updateUsage(requestData, headers, baseId, token) {
  try {
    const { user_uid, increment_messages = 1 } = requestData;
    
    // Get current user data
    const filterFormula = `{User_UID}='${user_uid}'`;
    const findUrl = `https://api.airtable.com/v0/${baseId}/Users?filterByFormula=${encodeURIComponent(filterFormula)}&maxRecords=1`;
    
    const findResponse = await fetch(findUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const findData = await findResponse.json();
    
    if (findData.records.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'User not found for usage update' })
      };
    }

    const user = findData.records[0];
    const currentCount = user.fields.Message_Count || 0;
    const newCount = currentCount + increment_messages;
    
    // Update usage
    const updateUrl = `https://api.airtable.com/v0/${baseId}/Users/${user.id}`;
    
    const updateResponse = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: {
          Message_Count: newCount,
          Last_Activity: new Date().toISOString()
        }
      })
    });

    if (!updateResponse.ok) {
      throw new Error(`Usage update failed: ${updateResponse.status}`);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Usage updated successfully',
        new_count: newCount
      })
    };

  } catch (error) {
    console.error('❌ Update usage error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to update usage' })
    };
  }
}