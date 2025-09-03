// Character Migration Script: Narrin → Selira
const fetch = require('node-fetch');

// Environment variables
const NARRIN_BASE_ID = process.env.AIRTABLE_BASE_ID; // Old Narrin base
const NARRIN_TOKEN = process.env.AIRTABLE_TOKEN;     // Old Narrin token

const SELIRA_BASE_ID = process.env.AIRTABLE_BASE_ID_SELIRA; // New Selira base  
const SELIRA_TOKEN = process.env.AIRTABLE_TOKEN_SELIRA;     // New Selira token

async function migrateCharacters() {
  console.log('🚀 Starting character migration from Narrin to Selira...');
  
  try {
    // 1. Fetch all characters from Narrin
    const narrinUrl = `https://api.airtable.com/v0/${NARRIN_BASE_ID}/Characters`;
    const narrinResponse = await fetch(narrinUrl, {
      headers: {
        'Authorization': `Bearer ${NARRIN_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!narrinResponse.ok) {
      throw new Error(`Failed to fetch Narrin characters: ${narrinResponse.status}`);
    }
    
    const narrinData = await narrinResponse.json();
    console.log(`📊 Found ${narrinData.records.length} characters in Narrin`);
    
    // 2. Transform and upload to Selira
    let successCount = 0;
    let errorCount = 0;
    
    for (const record of narrinData.records) {
      try {
        const characterData = {
          fields: {
            Name: record.fields.Name,
            Slug: record.fields.Slug,
            Title: record.fields.Title,
            Description: record.fields.Description,
            Personality: record.fields.Personality,
            Category: record.fields.Category,
            Tags: record.fields.Tags || [],
            IsActive: record.fields.IsActive !== false, // Default true
            CreatedAt: record.fields.CreatedAt || new Date().toISOString(),
            // Avatar will be copied separately if needed
          }
        };
        
        // Upload to Selira
        const seliraUrl = `https://api.airtable.com/v0/${SELIRA_BASE_ID}/Characters`;
        const seliraResponse = await fetch(seliraUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SELIRA_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(characterData)
        });
        
        if (seliraResponse.ok) {
          successCount++;
          console.log(`✅ Migrated: ${record.fields.Name}`);
        } else {
          errorCount++;
          console.log(`❌ Failed: ${record.fields.Name}`);
        }
        
        // Rate limiting - Airtable allows 5 requests/second
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        errorCount++;
        console.error(`❌ Error migrating ${record.fields.Name}:`, error.message);
      }
    }
    
    console.log(`\n📊 Migration Complete!`);
    console.log(`✅ Success: ${successCount} characters`);
    console.log(`❌ Errors: ${errorCount} characters`);
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
  }
}

// Run if called directly
if (require.main === module) {
  migrateCharacters();
}

module.exports = { migrateCharacters };