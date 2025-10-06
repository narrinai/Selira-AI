// Check companion data directly from Airtable
const fetch = require('node-fetch');
require('dotenv').config();

async function checkCompanion(slug) {
  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN || process.env.AIRTABLE_API_KEY;
  const AIRTABLE_TABLE_ID = 'tblsYou5hdY3yJfNv';

  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}?filterByFormula=OR({Slug}='${slug}',{Character_ID}='${slug}')&maxRecords=1`;

  console.log(`🔍 Checking Airtable data for: ${slug}`);

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    console.error(`❌ Airtable error: ${response.status}`);
    return;
  }

  const data = await response.json();

  if (!data.records || data.records.length === 0) {
    console.log(`❌ No companion found with slug: ${slug}`);
    return;
  }

  const record = data.records[0];
  const fields = record.fields;

  console.log(`\n📋 Raw Airtable Fields:`);
  console.log(`   Name: "${fields.Name}"`);
  console.log(`   Slug: "${fields.Slug}"`);
  console.log(`   companion_type: "${fields.companion_type}" (type: ${typeof fields.companion_type})`);
  console.log(`   Category: "${fields.Category}"`);
  console.log(`   sex: "${fields.sex}"`);
  console.log(`   ethnicity: "${fields.ethnicity}"`);
  console.log(`   hair_length: "${fields.hair_length}"`);
  console.log(`   hair_color: "${fields.hair_color}"`);
  console.log(`\n✅ Done!`);
}

// Check Mona Hirose
const slug = process.argv[2] || 'mona-hirose';
checkCompanion(slug).catch(console.error);
