// Cleanup script for duplicated Airtable base
// Removes old Narrin user data but keeps characters

const fetch = require('node-fetch');

const SELIRA_BASE_ID = process.env.AIRTABLE_BASE_ID_SELIRA;
const SELIRA_TOKEN = process.env.AIRTABLE_TOKEN_SELIRA;

async function cleanupDuplicatedBase() {
  console.log('🧹 Starting cleanup of duplicated Airtable base...');

  try {
    // 1. Clear Users table (old Narrin users)
    await clearTable('Users', 'Auth0ID');
    
    // 2. Clear Messages table (old conversations)
    await clearTable('Messages', 'UserID');
    
    // 3. Clear Memories table (old memories)  
    await clearTable('Memories', 'UserID');
    
    // 4. Clear User_Characters table (old relationships)
    await clearTable('User_Characters', 'UserID');
    
    // 5. Keep Characters table - these are reusable!
    console.log('✅ Keeping Characters table - these will be shared');

    console.log('\n🎉 Base cleanup complete!');
    console.log('📋 Summary:');
    console.log('  ✅ Users cleared (ready for Auth0 users)');
    console.log('  ✅ Messages cleared (fresh chat history)');  
    console.log('  ✅ Memories cleared (fresh memory system)');
    console.log('  ✅ Characters kept (reusable across platforms)');
    console.log('\n🚀 Base is ready for Selira AI!');

  } catch (error) {
    console.error('💥 Cleanup failed:', error);
  }
}

async function clearTable(tableName, fieldToCheck) {
  console.log(`🗑️ Clearing ${tableName} table...`);

  try {
    // Get all records
    const url = `https://api.airtable.com/v0/${SELIRA_BASE_ID}/${tableName}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${SELIRA_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${tableName}: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.records.length === 0) {
      console.log(`  ℹ️ ${tableName} already empty`);
      return;
    }

    // Delete in batches of 10 (Airtable limit)
    const batchSize = 10;
    let deletedCount = 0;

    for (let i = 0; i < data.records.length; i += batchSize) {
      const batch = data.records.slice(i, i + batchSize);
      const recordIds = batch.map(record => record.id);

      const deleteUrl = `https://api.airtable.com/v0/${SELIRA_BASE_ID}/${tableName}?${recordIds.map(id => `records[]=${id}`).join('&')}`;

      const deleteResponse = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${SELIRA_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      if (deleteResponse.ok) {
        deletedCount += recordIds.length;
        console.log(`  🗑️ Deleted ${deletedCount}/${data.records.length} records from ${tableName}`);
      } else {
        console.error(`  ❌ Failed to delete batch from ${tableName}`);
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log(`  ✅ ${tableName} cleared: ${deletedCount} records deleted`);

  } catch (error) {
    console.error(`❌ Failed to clear ${tableName}:`, error.message);
  }
}

// Run if called directly
if (require.main === module) {
  if (!SELIRA_BASE_ID || !SELIRA_TOKEN) {
    console.error('❌ Missing environment variables:');
    console.error('   AIRTABLE_BASE_ID_SELIRA');
    console.error('   AIRTABLE_TOKEN_SELIRA');
    process.exit(1);
  }
  
  cleanupDuplicatedBase();
}

module.exports = { cleanupDuplicatedBase };