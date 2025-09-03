// Import characters from CSV to Selira Airtable
// Much faster than API-to-API migration

const fs = require('fs');
const fetch = require('node-fetch');

const SELIRA_BASE_ID = process.env.AIRTABLE_BASE_ID_SELIRA;
const SELIRA_TOKEN = process.env.AIRTABLE_TOKEN_SELIRA;

async function importCharactersFromCSV(limit = 10) {
  console.log(`🚀 Importing first ${limit} characters from CSV to Selira...`);
  
  if (!SELIRA_BASE_ID || !SELIRA_TOKEN) {
    console.error('❌ Missing environment variables');
    console.error('Need: AIRTABLE_BASE_ID_SELIRA and AIRTABLE_TOKEN_SELIRA');
    return;
  }

  try {
    // Read CSV file
    const csvData = fs.readFileSync('Characters.csv', 'utf-8');
    const lines = csvData.split('\n');
    const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));
    
    console.log('📊 CSV Headers:', headers);
    
    let successCount = 0;
    let errorCount = 0;
    
    // Process limited number of lines
    for (let i = 1; i <= Math.min(limit, lines.length - 1); i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      
      try {
        // Simple CSV parsing (handles quoted values)
        const values = parseCSVLine(line);
        
        if (values.length < headers.length) {
          console.log(`⚠️ Skipping malformed line ${i}`);
          continue;
        }
        
        // Map CSV to Airtable fields
        const character = {
          Name: cleanValue(values[0]),
          Title: cleanValue(values[1]), 
          Category: cleanValue(values[2]),
          Slug: cleanValue(values[3]),
          Description: cleanValue(values[4]),
          Tags: values[5] ? cleanValue(values[5]).split(',').map(t => t.trim()) : [],
          Visibility: cleanValue(values[6]) || 'public',
          Personality: cleanValue(values[7]) || 'Friendly AI assistant',
          IsActive: true,
          CreatedAt: new Date().toISOString()
        };
        
        console.log(`🔄 Importing: ${character.Name} (${character.Slug})`);
        
        // Upload to Selira
        const response = await fetch(`https://api.airtable.com/v0/${SELIRA_BASE_ID}/Characters`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SELIRA_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ fields: character })
        });
        
        if (response.ok) {
          successCount++;
          console.log(`✅ Success: ${character.Name}`);
        } else {
          errorCount++;
          const errorText = await response.text();
          console.log(`❌ Failed: ${character.Name} - Status: ${response.status}`);
          console.log(`   Error: ${errorText.substring(0, 200)}...`);
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 300));
        
      } catch (error) {
        errorCount++;
        console.error(`❌ Error processing line ${i}:`, error.message);
      }
    }
    
    console.log(`\n📊 Import Complete!`);
    console.log(`✅ Success: ${successCount} characters`);
    console.log(`❌ Errors: ${errorCount} characters`);
    
  } catch (error) {
    console.error('💥 Import failed:', error.message);
  }
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current); // Last field
  return result;
}

function cleanValue(value) {
  return value?.replace(/^"|"$/g, '').trim() || '';
}

// Run if called directly
if (require.main === module) {
  const limit = parseInt(process.argv[2]) || 10;
  importCharactersFromCSV(limit);
}

module.exports = { importCharactersFromCSV };