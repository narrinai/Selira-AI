// Direct test of Airtable API access
// Helps debug token/permission issues

const fetch = require('node-fetch');

const BASE_ID = process.env.AIRTABLE_BASE_ID_SELIRA || 'app5Xqa4KmvZ8wvaV';
const TOKEN = process.env.AIRTABLE_TOKEN_SELIRA;

async function testAirtableAccess() {
  console.log('🔍 Testing Airtable API access...');
  console.log('Base ID:', BASE_ID);
  console.log('Token format:', TOKEN?.substring(0, 8) + '...');
  console.log('Token type:', TOKEN?.startsWith('pat') ? 'Personal Access Token' : 'Legacy API Key');
  
  // Test 1: List all tables (schema access)
  console.log('\n📋 Test 1: Base Schema Access...');
  try {
    const schemaUrl = `https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables`;
    const schemaResponse = await fetch(schemaUrl, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Schema Status:', schemaResponse.status);
    
    if (schemaResponse.ok) {
      const schema = await schemaResponse.json();
      console.log('✅ Schema access works');
      console.log('📊 Tables found:', schema.tables.map(t => t.name));
      
      // Test 2: Read records from each table
      for (const table of schema.tables) {
        console.log(`\n📖 Testing read access to: ${table.name}`);
        
        try {
          const readUrl = `https://api.airtable.com/v0/${BASE_ID}/${table.name}?maxRecords=1`;
          const readResponse = await fetch(readUrl, {
            headers: {
              'Authorization': `Bearer ${TOKEN}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (readResponse.ok) {
            const data = await readResponse.json();
            console.log(`  ✅ Read ${table.name}: ${data.records.length} records`);
          } else {
            console.log(`  ❌ Read ${table.name}: ${readResponse.status}`);
          }
        } catch (error) {
          console.log(`  ❌ Read ${table.name}: ${error.message}`);
        }
      }
      
      // Test 3: Try to create a simple record in Characters
      const charactersTable = schema.tables.find(t => t.name === 'Characters');
      if (charactersTable) {
        console.log('\n✏️ Test 3: Write Access to Characters...');
        
        const testRecord = {
          fields: {
            Name: 'Test Character',
            Slug: 'test-char-' + Date.now(),
            Character_Title: 'Test',
            Character_Description: 'A test character',
            Category: 'Friendship'
          }
        };
        
        try {
          const createUrl = `https://api.airtable.com/v0/${BASE_ID}/Characters`;
          const createResponse = await fetch(createUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${TOKEN}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(testRecord)
          });
          
          if (createResponse.ok) {
            const result = await createResponse.json();
            console.log('✅ Write access works! Created record:', result.id);
            
            // Clean up - delete test record
            const deleteResponse = await fetch(`${createUrl}/${result.id}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (deleteResponse.ok) {
              console.log('🗑️ Test record cleaned up');
            }
          } else {
            const errorText = await createResponse.text();
            console.log('❌ Write access failed:', createResponse.status);
            console.log('Error details:', errorText);
          }
        } catch (error) {
          console.log('❌ Write test error:', error.message);
        }
      }
      
    } else {
      const errorText = await schemaResponse.text();
      console.log('❌ Schema access failed:', schemaResponse.status);
      console.log('Error:', errorText);
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

testAirtableAccess();