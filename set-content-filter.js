// Set all companions to content_filter = "Uncensored"
const fetch = require('node-fetch');
require('dotenv').config();

async function setContentFilter() {
  console.log('🔓 Setting all companions to content_filter = "Uncensored"...\n');

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
    let url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Characters?pageSize=100`;
    if (offset) {
      url += `&offset=${offset}`;
    }

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Airtable fetch failed: ${response.status} - ${errorText}`);
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

  // Filter companions that don't have content_filter set to "Uncensored"
  const companionsToUpdate = allCompanions.filter(c => c.fields.content_filter !== 'Uncensored');
  console.log(`🔄 Companions to update: ${companionsToUpdate.length}\n`);

  if (companionsToUpdate.length === 0) {
    console.log('✅ All companions are already set to Uncensored!');
    return;
  }

  let successCount = 0;
  let failCount = 0;

  // Update in batches of 10 (Airtable API limit)
  const batchSize = 10;
  for (let i = 0; i < companionsToUpdate.length; i += batchSize) {
    const batch = companionsToUpdate.slice(i, i + batchSize);

    console.log(`\n📝 Updating batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(companionsToUpdate.length / batchSize)} (${batch.length} companions)...`);

    try {
      const updateResponse = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Characters`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          records: batch.map(companion => ({
            id: companion.id,
            fields: {
              content_filter: 'Uncensored'
            }
          }))
        })
      });

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        throw new Error(`Batch update failed: ${updateResponse.status} - ${errorText}`);
      }

      const result = await updateResponse.json();
      successCount += result.records.length;

      console.log(`✅ Updated ${result.records.length} companions`);
      result.records.slice(0, 3).forEach(r => {
        console.log(`   - ${r.fields.Name}`);
      });
      if (result.records.length > 3) {
        console.log(`   ... and ${result.records.length - 3} more`);
      }

      // Rate limiting delay
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.error(`❌ Batch failed:`, error.message);
      failCount += batch.length;
    }
  }

  console.log(`\n📊 Complete!`);
  console.log(`✅ Successfully updated: ${successCount} companions`);
  console.log(`❌ Failed: ${failCount} companions`);
  console.log(`\n🔓 All companions are now set to Uncensored!`);
}

setContentFilter().catch(console.error);
