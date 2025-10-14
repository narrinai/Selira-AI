#!/usr/bin/env node

// Generate both greetings and descriptions for companions
// Usage: node scripts/generate-greetings-and-descriptions.js [--dry-run] [--limit=3]

const fetch = require('node-fetch');
require('dotenv').config();

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN_SELIRA || process.env.AIRTABLE_TOKEN;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID_SELIRA;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY_SELIRA || process.env.OPENAI_API_KEY;

// Parse command line args
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const limitArg = args.find(arg => arg.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : null;

console.log('🚀 Starting greetings & descriptions generation...');
console.log(`Mode: ${isDryRun ? 'DRY RUN (no updates)' : 'LIVE (will update Airtable)'}`);
if (limit) console.log(`Limit: ${limit} characters`);

async function fetchCharacters(maxRecords = 100) {
  console.log('\n📡 Fetching characters from Airtable...');

  let allRecords = [];
  let offset = null;
  let requestCount = 0;

  do {
    requestCount++;
    let url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Characters`;
    const params = new URLSearchParams();

    // Filter only public characters
    params.set('filterByFormula', `OR({Visibility} = "public", {Visibility} = "", NOT({Visibility}))`);

    // Add offset for pagination
    if (offset) {
      params.set('offset', offset);
    }

    const fullUrl = `${url}?${params.toString()}`;

    const response = await fetch(fullUrl, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Airtable fetch failed: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    allRecords = allRecords.concat(data.records);
    offset = data.offset;

    console.log(`  Batch ${requestCount}: ${data.records.length} characters (total: ${allRecords.length})`);

    // Respect limit if set
    if (maxRecords && allRecords.length >= maxRecords) {
      allRecords = allRecords.slice(0, maxRecords);
      break;
    }

  } while (offset);

  console.log(`✅ Fetched ${allRecords.length} characters total`);
  return allRecords;
}

async function generateGreetingsAndDescription(character) {
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
  const contentFilter = fields.content_filter || fields.Content_Filter || 'Censored';

  // Determine tone based on category and content filter
  let tone = 'friendly and engaging';
  if (category.toLowerCase().includes('romance')) tone = 'flirty and intimate';
  if (category.toLowerCase().includes('fantasy')) tone = 'mysterious and epic';
  if (contentFilter === 'Uncensored') tone += ', with subtle sensuality';

  const systemPrompt = `You are a creative writer specializing in character creation. You'll generate both greetings and a backstory for a character.

Output format - return ONLY valid JSON with no markdown formatting:
{
  "greetings": ["greeting1", "greeting2", "greeting3", "greeting4"],
  "description": "backstory here"
}

Guidelines for GREETINGS:
- Create 4 different greetings that the character would say when meeting someone
- IMPORTANT: Put actions in asterisks AFTER the dialogue, not before
- Format: "Dialogue text here *action here*" NOT "*action here* Dialogue text"
- Example: "Hey there, I'm ${name} *smiles playfully*" ✓
- Example: "*smiles playfully* Hey there, I'm ${name}" ✗
- Make each greeting unique and showing different moods/approaches
- Keep greetings 1-2 sentences, conversational and in character
- Vary between playful, mysterious, confident, shy, seductive (based on character)
- Use first person ("I'm ${name}")

Guidelines for DESCRIPTION:
- Write 25-50 words max (2-3 sentences)
- Focus on WHO they are, personality, and what makes them unique
- Include one subtle hint about desires, fears, or secrets
- Make it engaging and mysterious - leave room for discovery
- Use vivid, concise language
- Match tone: ${tone}
- Third person narrative style
- NO greetings, instructions, or meta information`;

  const userPrompt = `Create 4 greetings and a compelling backstory for:

Name: ${name}
Category: ${category}
Gender: ${sex}
Ethnicity: ${ethnicity}
Hair: ${hairLength}, ${hairColor}
Age: ${age}
Body Type: ${bodyType}
Style: ${companionType}
Content: ${contentFilter}

Return as JSON with "greetings" array and "description" string.`;

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
      temperature: 0.9,
      max_tokens: 500,
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI request failed: ${error}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;

  // Parse JSON response
  const result = JSON.parse(content);

  return {
    greetings: result.greetings.join('|||'),
    description: result.description
  };
}

async function updateCharacter(characterId, greetings, description) {
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Characters/${characterId}`;

  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      fields: {
        Greetings: greetings,
        Character_Description: description
      }
    })
  });

  return response.ok;
}

async function main() {
  try {
    // Fetch characters
    const characters = await fetchCharacters(limit || 100);

    // Filter characters that need updates
    const needsUpdate = characters.filter(char => {
      if (!char || !char.fields) return false;
      const desc = char.fields.Character_Description || '';
      const greetings = char.fields.Greetings || '';

      // Update if missing greetings or has generic description
      const needsGreetings = !greetings;
      const needsDescription = !desc ||
        desc.includes('A companion ready to chat') ||
        desc.includes('A realistic companion') ||
        desc.includes('An anime companion');

      return needsGreetings || needsDescription;
    });

    console.log(`\n📊 Found ${needsUpdate.length} characters needing updates`);
    console.log(`   - Missing greetings: ${needsUpdate.filter(c => !c.fields.Greetings).length}`);
    console.log(`   - Generic descriptions: ${needsUpdate.filter(c => {
      const d = c.fields.Character_Description || '';
      return !d || d.includes('A companion ready to chat') || d.includes('realistic companion') || d.includes('anime companion');
    }).length}`);

    // Apply limit
    const toProcess = limit ? needsUpdate.slice(0, limit) : needsUpdate;
    console.log(`\n🎯 Processing ${toProcess.length} characters...\n`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < toProcess.length; i++) {
      const char = toProcess[i];
      const name = char.fields.Name || 'Unknown';

      try {
        console.log(`\n[${i + 1}/${toProcess.length}] Processing ${name}...`);

        // Generate content
        const { greetings, description } = await generateGreetingsAndDescription(char);

        console.log(`  📝 Description: "${description.substring(0, 100)}..."`);
        console.log(`  👋 Greetings (${greetings.split('|||').length}):`);
        greetings.split('|||').forEach((g, idx) => {
          console.log(`     ${idx + 1}. ${g.substring(0, 80)}${g.length > 80 ? '...' : ''}`);
        });

        // Update Airtable (unless dry run)
        if (!isDryRun) {
          const updated = await updateCharacter(char.id, greetings, description);
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

        // Rate limiting - wait 2 seconds between requests
        if (i < toProcess.length - 1) {
          console.log(`  ⏳ Waiting 2 seconds...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

      } catch (error) {
        console.log(`  ❌ Error: ${error.message}`);
        errorCount++;
      }
    }

    console.log(`\n\n📈 Summary:`);
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`\n✨ Done!`);

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

main();
