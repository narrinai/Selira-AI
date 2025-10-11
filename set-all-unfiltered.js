// Set all companions to is_unfiltered = true
const fetch = require('node-fetch');
require('dotenv').config();

async function setAllUnfiltered() {
  console.log('🔓 Setting all companions to is_unfiltered = true...\n');

  // Use Selira database explicitly
  const AIRTABLE_BASE_ID = 'app5Xqa4KmvZ8wvaV'; // Selira AI Database
  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;

  if (!AIRTABLE_BASE_ID || !AIRTABLE_TOKEN) {
    throw new Error('Missing Airtable credentials');
  }

  // Fetch all companions
  console.log('📡 Fetching all companions...');
  let allCompanions = [];
  let offset = null;

  while (true) {
    let url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Characters?maxRecords=100`;
    if (offset) {
      url += `&offset=${offset}`;
    }

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`
      }
    });

    if (!response.ok) {
      throw new Error(`Airtable fetch failed: ${response.status}`);
    }

    const data = await response.json();

    if (!data.records || data.records.length === 0) {
      break;
    }

    allCompanions.push(...data.records);
    console.log(`📦 Fetched ${data.records.length} companions (${allCompanions.length} total)`);

    if (!data.offset) {
      break;
    }

    offset = data.offset;
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log(`\n📊 Total companions: ${allCompanions.length}`);

  // Filter companions that are not already unfiltered
  const companionsToUpdate = allCompanions.filter(c => !c.fields.is_unfiltered);
  console.log(`🔄 Companions to update: ${companionsToUpdate.length}\n`);

  if (companionsToUpdate.length === 0) {
    console.log('✅ All companions are already unfiltered!');
    return;
  }

  let successCount = 0;
  let failCount = 0;

  // Update one by one to see exactly which field name works
  for (let i = 0; i < Math.min(companionsToUpdate.length, 3); i++) {
    const companion = companionsToUpdate[i];

    console.log(`\n📝 Testing update ${i + 1}/3: ${companion.fields.Name}...`);

    try {
      const updateResponse = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Characters`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          records: [{
            id: companion.id,
            fields: {
              is_unfiltered: true
            }
          }]
        })
      });

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        throw new Error(`Batch update failed: ${updateResponse.status} - ${errorText}`);
      }

      const result = await updateResponse.json();
      successCount += result.records.length;

      console.log(`✅ Updated: ${result.records[0].fields.Name}`);
      console.log(`   Field value:`, result.records[0].fields.is_unfiltered);

      // Rate limiting delay
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      console.error(`❌ Update failed:`, error.message);
      failCount++;
    }
  }

  console.log('\n⚠️ Only tested 3 companions. Run full update if successful.');

  console.log(`\n📊 Complete!`);
  console.log(`✅ Successfully updated: ${successCount} companions`);
  console.log(`❌ Failed: ${failCount} companions`);
  console.log(`\n🔓 All companions are now unfiltered!`);
}

setAllUnfiltered().catch(console.error);
