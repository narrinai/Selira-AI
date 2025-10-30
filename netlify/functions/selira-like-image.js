// Toggle like on a feed image
// Creates or deletes like record in Image_Likes table
// Updates like_count on Generated_Images record

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
    const { image_id, user_id, user_email } = JSON.parse(event.body || '{}');

    if (!image_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing image_id' })
      };
    }

    if (!user_id && !user_email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing user_id or user_email' })
      };
    }

    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID_SELIRA;
    const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN_SELIRA;

    if (!AIRTABLE_BASE_ID || !AIRTABLE_TOKEN) {
      console.error('❌ Airtable credentials not configured');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Database not configured' })
      };
    }

    console.log('❤️ Like request:', { image_id, user_id, user_email });

    // First, find user's Airtable record ID if we only have email/supabase_id
    let userRecordId = null;

    if (user_email) {
      const userSearchUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Users?` +
        `filterByFormula={Email}='${user_email}'&maxRecords=1`;

      const userSearchResponse = await fetch(userSearchUrl, {
        headers: {
          'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      if (userSearchResponse.ok) {
        const userData = await userSearchResponse.json();
        if (userData.records && userData.records.length > 0) {
          userRecordId = userData.records[0].id;
          console.log('✅ Found user record:', userRecordId);
        }
      }
    }

    if (!userRecordId) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'User not found' })
      };
    }

    // Check if user already liked this image
    const likesSearchUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Image_Likes?` +
      `filterByFormula=AND({image_id}='${image_id}',{user_id}='${userRecordId}')&maxRecords=1`;

    console.log('🔍 Checking existing like:', likesSearchUrl);

    const likesSearchResponse = await fetch(likesSearchUrl, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!likesSearchResponse.ok) {
      const errorText = await likesSearchResponse.text();
      console.error('❌ Error checking likes:', errorText);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to check likes' })
      };
    }

    const likesData = await likesSearchResponse.json();
    const existingLike = likesData.records && likesData.records.length > 0 ? likesData.records[0] : null;

    let userLiked = false;
    let newLikeCount = 0;

    if (existingLike) {
      // Unlike - delete the like record
      console.log('👎 Removing like:', existingLike.id);

      const deleteUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Image_Likes/${existingLike.id}`;
      const deleteResponse = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_TOKEN}`
        }
      });

      if (!deleteResponse.ok) {
        const errorText = await deleteResponse.text();
        console.error('❌ Error deleting like:', errorText);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Failed to unlike' })
        };
      }

      userLiked = false;

      // Decrement like count on image
      const imageUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Generated_Images/${image_id}`;
      const imageResponse = await fetch(imageUrl, {
        headers: {
          'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      if (imageResponse.ok) {
        const imageData = await imageResponse.json();
        const currentCount = imageData.fields.like_count || 0;
        newLikeCount = Math.max(0, currentCount - 1);

        await fetch(imageUrl, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fields: {
              like_count: newLikeCount
            }
          })
        });
      }

      console.log('✅ Unliked successfully, new count:', newLikeCount);

    } else {
      // Like - create new like record
      console.log('👍 Creating like');

      const createUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Image_Likes`;
      const createResponse = await fetch(createUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fields: {
            image_id: [image_id], // Linked record array
            user_id: [userRecordId], // Linked record array
            liked_at: new Date().toISOString()
          }
        })
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        console.error('❌ Error creating like:', errorText);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Failed to like' })
        };
      }

      userLiked = true;

      // Increment like count on image
      const imageUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Generated_Images/${image_id}`;
      const imageResponse = await fetch(imageUrl, {
        headers: {
          'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      if (imageResponse.ok) {
        const imageData = await imageResponse.json();
        const currentCount = imageData.fields.like_count || 0;
        newLikeCount = currentCount + 1;

        await fetch(imageUrl, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fields: {
              like_count: newLikeCount
            }
          })
        });
      }

      console.log('✅ Liked successfully, new count:', newLikeCount);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        liked: userLiked,
        like_count: newLikeCount
      })
    };

  } catch (error) {
    console.error('❌ Like image error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to toggle like',
        details: error.message
      })
    };
  }
};
