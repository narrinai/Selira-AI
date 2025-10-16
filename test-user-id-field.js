// Check if User_ID text field exists in ChatHistory
const https = require('https');

const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID_SELIRA;
const AIRTABLE_API_KEY = process.env.AIRTABLE_TOKEN_SELIRA;

async function fetchData(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

(async () => {
  try {
    // Get latest ChatHistory record to check fields
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/ChatHistory?maxRecords=1&sort[0][field]=CreatedTime&sort[0][direction]=desc`;
    const result = await fetchData(url);

    if (result.records && result.records.length > 0) {
      const record = result.records[0];
      console.log('Latest ChatHistory record fields:');
      console.log(Object.keys(record.fields));
      console.log('\nField values:');
      console.log('User (linked):', record.fields.User);
      console.log('User_ID (text):', record.fields.User_ID);
      console.log('\n❓ User_ID field exists?', 'User_ID' in record.fields);
    } else {
      console.log('No records found');
    }

    // Now test filtering by User_ID
    console.log('\n\n--- Testing User_ID filter ---');
    const userRecordId = 'rec0Ce0WAwF2YHLv4';
    const filter = `{User_ID}='${userRecordId}'`;
    const filterUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/ChatHistory?filterByFormula=${encodeURIComponent(filter)}`;

    console.log('Filter:', filter);
    const filterResult = await fetchData(filterUrl);
    console.log('Results:', filterResult.records.length, 'records');

    if (filterResult.records.length > 0) {
      console.log('✅ User_ID filtering works!');
      console.log('First record:', {
        User: filterResult.records[0].fields.User,
        User_ID: filterResult.records[0].fields.User_ID
      });
    } else {
      console.log('❌ User_ID filtering returned 0 results');
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
})();
