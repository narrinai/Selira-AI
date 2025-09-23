// Debug script to understand the Airtable structure for companions
const targetEmail = "emailnotiseb@gmail.com";

console.log('🔍 Debug script for Selira companions');
console.log('🎯 Target email:', targetEmail);

// Simulate what the function does
async function debugAirtableStructure() {
  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID_SELIRA;
  const AIRTABLE_API_KEY = process.env.AIRTABLE_TOKEN_SELIRA;

  console.log('🏢 Base ID:', AIRTABLE_BASE_ID ? 'Found' : 'Missing');
  console.log('🔑 API Key:', AIRTABLE_API_KEY ? 'Found' : 'Missing');

  if (!AIRTABLE_BASE_ID || !AIRTABLE_API_KEY) {
    console.log('❌ Missing credentials, cannot continue');
    return;
  }

  const headers = {
    'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
    'Content-Type': 'application/json'
  };

  try {
    // Step 1: Find user by email
    console.log('\n📧 Step 1: Finding user by email...');
    const usersUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Users`;
    const usersResponse = await fetch(usersUrl, { headers });

    if (!usersResponse.ok) {
      console.log('❌ Users fetch failed:', usersResponse.statusText);
      return;
    }

    const usersData = await usersResponse.json();
    console.log('👥 Total users found:', usersData.records.length);

    const targetUser = usersData.records.find(record =>
      record.fields.Email === targetEmail ||
      (record.fields.Email && record.fields.Email.toLowerCase() === targetEmail.toLowerCase())
    );

    if (!targetUser) {
      console.log('❌ User not found with email:', targetEmail);
      return;
    }

    console.log('✅ Found user:', targetUser.id);
    console.log('📧 User email:', targetUser.fields.Email);
    console.log('🔍 All user fields:', Object.keys(targetUser.fields));

    // Step 2: Check Characters table for Created_By links
    console.log('\n🎭 Step 2: Checking Characters with Created_By...');
    const charactersUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Characters`;
    const charactersResponse = await fetch(charactersUrl, { headers });

    if (!charactersResponse.ok) {
      console.log('❌ Characters fetch failed:', charactersResponse.statusText);
      return;
    }

    const charactersData = await charactersResponse.json();
    console.log('🎭 Total characters found:', charactersData.records.length);

    // Check if any characters have the user in Created_By
    const userCreatedCharacters = charactersData.records.filter(char => {
      const createdBy = char.fields.Created_By;
      if (!createdBy) return false;

      // Check if it's an array (linked records) and contains our user ID
      if (Array.isArray(createdBy)) {
        return createdBy.includes(targetUser.id);
      }

      // Check if it's a string and matches our user ID
      return createdBy === targetUser.id;
    });

    console.log('👤 Characters created by user:', userCreatedCharacters.length);

    if (userCreatedCharacters.length > 0) {
      console.log('\n🎯 User-created characters:');
      userCreatedCharacters.forEach((char, index) => {
        console.log(`${index + 1}. ${char.fields.Name} (${char.id})`);
        console.log(`   Created_By:`, char.fields.Created_By);
        console.log(`   Visibility:`, char.fields.Visibility);
      });
    }

    // Step 3: Check what the filter would find
    console.log('\n🔍 Step 3: Testing the SEARCH filter...');
    const createdByFilter = `SEARCH("${targetUser.id}", ARRAYJOIN({Created_By}))`;
    console.log('🔍 Filter:', createdByFilter);

    const filterUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Characters?filterByFormula=${encodeURIComponent(createdByFilter)}`;

    const filterResponse = await fetch(filterUrl, { headers });

    if (filterResponse.ok) {
      const filterData = await filterResponse.json();
      console.log('✅ Filter results:', filterData.records.length, 'characters');

      if (filterData.records.length > 0) {
        filterData.records.forEach((char, index) => {
          console.log(`${index + 1}. ${char.fields.Name} - Created_By: ${char.fields.Created_By}`);
        });
      }
    } else {
      console.log('❌ Filter failed:', filterResponse.statusText);
      const errorText = await filterResponse.text();
      console.log('❌ Error details:', errorText);
    }

  } catch (error) {
    console.error('❌ Debug error:', error);
  }
}

debugAirtableStructure();