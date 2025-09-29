// Debug function to test user lookup in webhook context
const Airtable = require('airtable');

// Use same environment variables as webhook
const base = new Airtable({
  apiKey: process.env.AIRTABLE_TOKEN_SELIRA || process.env.AIRTABLE_API_KEY || process.env.AIRTABLE_TOKEN
}).base(process.env.AIRTABLE_BASE_ID_SELIRA || process.env.AIRTABLE_BASE_ID);

async function testUserLookup() {
  try {
    const testEmail = 'info@narrin.ai';

    console.log('🔍 Debug user lookup for:', testEmail);
    console.log('🔍 Environment check:', {
      hasTokenSelira: !!process.env.AIRTABLE_TOKEN_SELIRA,
      hasToken: !!process.env.AIRTABLE_TOKEN,
      hasApiKey: !!process.env.AIRTABLE_API_KEY,
      hasBaseSelira: !!process.env.AIRTABLE_BASE_ID_SELIRA,
      hasBase: !!process.env.AIRTABLE_BASE_ID,
      tokenUsed: process.env.AIRTABLE_TOKEN_SELIRA || process.env.AIRTABLE_API_KEY || process.env.AIRTABLE_TOKEN || 'none',
      baseUsed: process.env.AIRTABLE_BASE_ID_SELIRA || process.env.AIRTABLE_BASE_ID || 'none'
    });

    // Try to find user using same logic as webhook
    const users = await base('Users').select({
      filterByFormula: `{Email} = '${testEmail}'`
    }).firstPage();

    console.log('👥 Users found:', users.length);

    if (users.length > 0) {
      const user = users[0];
      console.log('✅ User found:', {
        id: user.id,
        email: user.fields.Email,
        plan: user.fields.Plan,
        auth0ID: user.fields.Auth0ID
      });
    } else {
      console.log('❌ User not found');
      
      // Try to list first few users to see what's in the database
      console.log('🔍 Listing available users...');
      const allUsers = await base('Users').select({ maxRecords: 3 }).firstPage();
      console.log('Available users:');
      allUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.fields.Email || 'No email'} - ${user.fields.Plan || 'No plan'}`);
      });
    }

  } catch (error) {
    console.error('❌ Debug error:', error);
  }
}

testUserLookup();
