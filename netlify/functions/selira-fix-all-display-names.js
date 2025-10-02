const https = require('https');

// Username generator function (same as in auth0-user-sync.js)
function generateUsername() {
  const adjectives = [
    'Brave', 'Swift', 'Clever', 'Mighty', 'Cosmic', 'Golden', 'Silver', 'Bright',
    'Stormy', 'Gentle', 'Fierce', 'Noble', 'Wild', 'Zen', 'Bold', 'Quiet',
    'Grumpy', 'Happy', 'Sneaky', 'Lucky', 'Witty', 'Daring', 'Calm', 'Fiery',
    'Mystic', 'Royal', 'Ancient', 'Shadow', 'Crystal', 'Thunder', 'Frost', 'Blazing'
  ];

  const nouns = [
    'Tiger', 'Eagle', 'Wolf', 'Dragon', 'Phoenix', 'Lion', 'Falcon', 'Bear',
    'Fox', 'Raven', 'Panther', 'Shark', 'Hawk', 'Leopard', 'Stallion', 'Viper',
    'Reindeer', 'Dolphin', 'Penguin', 'Koala', 'Panda', 'Lynx', 'Otter', 'Seal',
    'Octopus', 'Whale', 'Sparrow', 'Turtle', 'Rabbit', 'Monkey', 'Elephant', 'Giraffe'
  ];

  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const number = Math.floor(Math.random() * 9000) + 1000; // 1000-9999

  return `${adjective}${noun}${number}`;
}

exports.handler = async (event, context) => {
  console.log('🔧 Fix all display names function called');

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Method not allowed. Use POST.' })
    };
  }

  try {
    // Get environment variables
    const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN_SELIRA;
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID_SELIRA;

    if (!AIRTABLE_TOKEN || !AIRTABLE_BASE_ID) {
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Missing Airtable configuration' })
      };
    }

    console.log('📋 Fetching all users from Airtable...');

    // Fetch all users from Airtable
    const getAllUsers = () => {
      return new Promise((resolve, reject) => {
        const options = {
          hostname: 'api.airtable.com',
          port: 443,
          path: `/v0/${AIRTABLE_BASE_ID}/Users`,
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
            'Content-Type': 'application/json'
          }
        };

        const req = https.request(options, (res) => {
          let data = '';

          res.on('data', (chunk) => {
            data += chunk;
          });

          res.on('end', () => {
            try {
              const response = JSON.parse(data);
              resolve({ statusCode: res.statusCode, data: response });
            } catch (error) {
              console.error('❌ Error parsing Airtable response:', error);
              reject(error);
            }
          });
        });

        req.on('error', (error) => {
          console.error('❌ Request error:', error);
          reject(error);
        });

        req.end();
      });
    };

    const result = await getAllUsers();

    if (result.statusCode !== 200) {
      console.error('❌ Error fetching users:', result.data);
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Failed to fetch users from Airtable' })
      };
    }

    const users = result.data.records || [];
    console.log(`📊 Found ${users.length} users in Airtable`);

    // Track updates
    let updatedCount = 0;
    let skippedCount = 0;
    const updateResults = [];

    // Process each user
    for (const user of users) {
      const userId = user.id;
      const email = user.fields.Email;
      const currentDisplayName = user.fields.display_name;

      // Check if display_name needs to be updated
      const needsUpdate = !currentDisplayName ||
                         currentDisplayName === email ||
                         currentDisplayName.includes('@');

      if (needsUpdate) {
        const newDisplayName = generateUsername();

        console.log(`🔄 Updating user ${email}: "${currentDisplayName}" -> "${newDisplayName}"`);

        // Update the user in Airtable
        const updateUser = () => {
          return new Promise((resolve, reject) => {
            const updateData = JSON.stringify({
              fields: {
                display_name: newDisplayName
              }
            });

            const options = {
              hostname: 'api.airtable.com',
              port: 443,
              path: `/v0/${AIRTABLE_BASE_ID}/Users/${userId}`,
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(updateData)
              }
            };

            const req = https.request(options, (res) => {
              let data = '';

              res.on('data', (chunk) => {
                data += chunk;
              });

              res.on('end', () => {
                try {
                  const response = JSON.parse(data);
                  resolve({ statusCode: res.statusCode, data: response });
                } catch (error) {
                  console.error('❌ Error parsing update response:', error);
                  reject(error);
                }
              });
            });

            req.on('error', (error) => {
              console.error('❌ Update request error:', error);
              reject(error);
            });

            req.write(updateData);
            req.end();
          });
        };

        try {
          const updateResult = await updateUser();

          if (updateResult.statusCode === 200) {
            console.log(`✅ Updated ${email} successfully`);
            updatedCount++;
            updateResults.push({
              email,
              oldDisplayName: currentDisplayName,
              newDisplayName,
              status: 'success'
            });
          } else {
            console.error(`❌ Failed to update ${email}:`, updateResult.data);
            updateResults.push({
              email,
              oldDisplayName: currentDisplayName,
              status: 'failed',
              error: updateResult.data
            });
          }
        } catch (error) {
          console.error(`❌ Error updating ${email}:`, error);
          updateResults.push({
            email,
            oldDisplayName: currentDisplayName,
            status: 'error',
            error: error.message
          });
        }

        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } else {
        console.log(`⏭️ Skipping ${email}: already has valid display_name "${currentDisplayName}"`);
        skippedCount++;
      }
    }

    console.log(`✅ Batch update complete: ${updatedCount} updated, ${skippedCount} skipped`);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        totalUsers: users.length,
        updated: updatedCount,
        skipped: skippedCount,
        results: updateResults
      })
    };

  } catch (error) {
    console.error('❌ Fix display names error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};
