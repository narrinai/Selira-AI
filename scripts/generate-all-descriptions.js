#!/usr/bin/env node

// Batch generate descriptions for all companions
// Usage: node scripts/generate-all-descriptions.js [--dry-run] [--limit=10]

const fetch = require('node-fetch');
require('dotenv').config();

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Parse command line args
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const limitArg = args.find(arg => arg.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : null;

console.log('🚀 Starting description generation...');
console.log(`Mode: ${isDryRun ? 'DRY RUN (no updates)' : 'LIVE (will update Airtable)'}`);
if (limit) console.log(`Limit: ${limit} characters`);

async function fetchAllCharacters() {
  console.log('\n📡 Fetching characters from Airtable...');

  let allRecords = [];
  let offset = null;

  do {
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Characters?pageSize=100${offset ? `&offset=${offset}` : ''}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`
      }
    });

    const data = await response.json();
    allRecords = allRecords.concat(data.records);
    offset = data.offset;

  } while (offset);

  console.log(`✅ Fetched ${allRecords.length} characters`);
  return allRecords;
}

async function generateDescription(character) {
  const fields = character.fields;
  const name = fields.Name || 'Unknown';
  const category = fields.Category || 'General';
  const sex = fields.sex || fields.Sex || 'female';
  const ethnicity = fields.ethnicity || fields.Ethnicity || 'white';
  const hairLength = fields.hair_length || fields.Hair_Length || 'long';
  const hairColor = fields.hair_color || fields.Hair_Color || 'brown';
  const age = fields.age || fields.Age || '25';
  const bodyType = fields.body_type || fields.Body_Type || 'athletic';
  const companionType = fields.companion_type || fields.Companion_Type || 'realistic';

  const systemPrompt = `You are a creative writer specializing in character backstories and descriptions. Create engaging, immersive character descriptions that tell a story and make the reader curious to interact with the character.

Guidelines:
- Write 3-5 sentences (100-150 words max)
- Focus on WHO they are, their personality, background, and what makes them unique
- Include subtle hints about their desires, fears, or secrets
- Make it engaging and mysterious - leave room for discovery
- Use vivid, sensory language
- Match the tone to the category (romance = intimate/flirty, fantasy = epic/mysterious, etc)
- DO NOT include greetings, instructions, or meta information
- Write in third person narrative style`;

  const userPrompt = `Create a compelling character description for:

Name: ${name}
Category: ${category}
Gender: ${sex}
Ethnicity: ${ethnicity}
Hair: ${hairLength}, ${hairColor}
Age: ${age}
Body Type: ${bodyType}
Style: ${companionType}

Make it engaging, mysterious, and make readers want to chat with ${name}. Focus on personality, background, and what makes them unique.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.8,
      max_tokens: 250
    })
  });

  if (!response.ok) {
    throw new Error('OpenAI request failed');
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

async function updateCharacterDescription(characterId, description) {
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Characters/${characterId}`;

  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      fields: {
        Character_Description: description
      }
    })
  });

  return response.ok;
}

async function main() {
  try {
    // Fetch all characters
    const characters = await fetchAllCharacters();

    // Filter characters that need new descriptions
    const needsUpdate = characters.filter(char => {
      const desc = char.fields.Character_Description || '';
      // Update if description is empty or just "A companion ready to chat"
      return !desc || desc.includes('A companion ready to chat') || desc.includes('A realistic companion') || desc.includes('An anime companion');
    });

    console.log(`\n📊 Found ${needsUpdate.length} characters needing description updates`);

    // Apply limit if specified
    const toProcess = limit ? needsUpdate.slice(0, limit) : needsUpdate;
    console.log(`\n🎯 Processing ${toProcess.length} characters...\n`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < toProcess.length; i++) {
      const char = toProcess[i];
      const name = char.fields.Name || 'Unknown';

      try {
        console.log(`[${i + 1}/${toProcess.length}] Generating for ${name}...`);

        // Generate description
        const description = await generateDescription(char);
        console.log(`  ✍️  "${description.substring(0, 80)}..."`);

        // Update Airtable (unless dry run)
        if (!isDryRun) {
          const updated = await updateCharacterDescription(char.id, description);
          if (updated) {
            console.log(`  ✅ Updated in Airtable`);
            successCount++;
          } else {
            console.log(`  ❌ Failed to update Airtable`);
            errorCount++;
          }
        } else {
          console.log(`  🏷️  DRY RUN - would update`);
          successCount++;
        }

        // Rate limiting - wait 1 second between requests
        if (i < toProcess.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (error) {
        console.log(`  ❌ Error: ${error.message}`);
        errorCount++;
      }
    }

    console.log(`\n📈 Summary:`);
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`\n✨ Done!`);

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

main();
