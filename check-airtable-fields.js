require('dotenv').config();
const https = require('https');

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN_SELIRA || process.env.AIRTABLE_TOKEN;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID_SELIRA || process.env.AIRTABLE_BASE_ID;

// Fetch first character to see available fields
function fetchFirstCharacter() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.airtable.com',
      path: `/v0/${AIRTABLE_BASE_ID}/Characters?maxRecords=1`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve(response.records || []);
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// Main execution
async function checkFields() {
  try {
    console.log('🔍 Checking available fields in Characters table...\n');

    const records = await fetchFirstCharacter();

    if (records.length === 0) {
      console.log('❌ No records found');
      return;
    }

    const firstRecord = records[0];
    const fields = Object.keys(firstRecord.fields);

    console.log('✅ Found field names:');
    console.log('='.repeat(60));
    fields.sort().forEach(field => {
      console.log(`  - ${field}`);
    });
    console.log('='.repeat(60));
    console.log(`\nTotal fields: ${fields.length}`);

    // Check for greeting-related fields
    const greetingFields = fields.filter(f =>
      f.toLowerCase().includes('greet') ||
      f.toLowerCase().includes('conversation') ||
      f.toLowerCase().includes('starter')
    );

    if (greetingFields.length > 0) {
      console.log('\n📝 Greeting-related fields found:');
      greetingFields.forEach(field => {
        console.log(`  ✓ ${field}`);
      });
    } else {
      console.log('\n⚠️  No greeting-related fields found!');
      console.log('   Please create a field named "Greeting" or "greeting" in Airtable');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkFields();