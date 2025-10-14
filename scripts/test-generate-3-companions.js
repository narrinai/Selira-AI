#!/usr/bin/env node

// Test generation for 3 companions using live API
const fetch = require('node-fetch');
require('dotenv').config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY_SELIRA || process.env.OPENAI_API_KEY;
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN_SELIRA || process.env.AIRTABLE_TOKEN;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID_SELIRA;

// Debug env vars
if (!OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY_SELIRA or OPENAI_API_KEY not found in environment');
  process.exit(1);
}
if (!AIRTABLE_TOKEN) {
  console.error('❌ AIRTABLE_TOKEN not found in environment');
  process.exit(1);
}
if (!AIRTABLE_BASE_ID) {
  console.error('❌ AIRTABLE_BASE_ID_SELIRA not found in environment');
  console.error('   Please add AIRTABLE_BASE_ID_SELIRA to .env file');
  process.exit(1);
}

console.log('✅ Environment variables loaded');
console.log(`   OpenAI Key: ${OPENAI_API_KEY.substring(0, 10)}...`);
console.log(`   Airtable Base: ${AIRTABLE_BASE_ID.substring(0, 8)}...`);
console.log('🚀 Testing greeting & description generation for 3 companions...\n');

async function fetchCompanions() {
  const response = await fetch('https://selira.ai/.netlify/functions/selira-characters-fetch?limit=100');
  const data = await response.json();

  if (!data.success) {
    throw new Error('Failed to fetch companions');
  }

  return data.characters;
}

async function generateContent(character) {
  const name = character.Name || 'Unknown';
  const category = character.Category || 'General';
  const sex = character.sex || character.Sex || 'female';
  const ethnicity = character.ethnicity || character.Ethnicity || 'white';
  const hairLength = character.hair_length || character.Hair_Length || 'long';
  const hairColor = character.hair_color || character.Hair_Color || 'brown';
  const age = character.age || character.Age || '25';
  const bodyType = character.body_type || character.Body_Type || 'athletic';
  const companionType = character.companion_type || character.Companion_Type || 'realistic';
  const contentFilter = character.content_filter || character.Content_Filter || 'Censored';

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
- CRITICAL: 14-20 words maximum, ONLY 1 sentence
- Focus on personality OR one unique trait
- Optional: ONE subtle hint about desire/fear/secret
- Engaging and concise
- Match tone: ${tone}
- Third person
- NO greetings or meta information`;

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
    const errorText = await response.text();
    throw new Error(`OpenAI request failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const result = JSON.parse(data.choices[0].message.content);

  return {
    greetings: result.greetings.join('|||'),
    description: result.description
  };
}

async function updateAirtable(recordId, greetings, description) {
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Characters/${recordId}`;

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

  if (!response.ok) {
    const errorText = await response.text();
    console.log(`     Airtable error: ${response.status} - ${errorText}`);
  }

  return response.ok;
}

async function main() {
  try {
    // Fetch companions
    console.log('📡 Fetching companions from API...');
    const companions = await fetchCompanions();
    console.log(`✅ Found ${companions.length} companions\n`);

    // Filter those needing updates
    const needsUpdate = companions.filter(c => {
      const desc = c.Character_Description || '';
      const greetings = c.Greetings || '';
      return !greetings || desc.includes('A companion ready to chat') || desc.includes('A realistic companion');
    });

    console.log(`📊 ${needsUpdate.length} companions need updates`);

    // Take first 3
    const toProcess = needsUpdate.slice(0, 3);
    console.log(`🎯 Processing first 3 companions...\n`);

    for (let i = 0; i < toProcess.length; i++) {
      const companion = toProcess[i];
      const name = companion.Name || 'Unknown';

      console.log(`\n[${i + 1}/3] ${name}`);
      console.log(`  Category: ${companion.Category || 'N/A'}`);
      console.log(`  Sex: ${companion.sex || 'N/A'}, Ethnicity: ${companion.ethnicity || 'N/A'}`);

      try {
        // Generate content
        console.log(`  🤖 Generating content...`);
        const { greetings, description } = await generateContent(companion);

        console.log(`\n  📝 Description:`);
        console.log(`     "${description}"`);

        console.log(`\n  👋 Greetings (${greetings.split('|||').length}):`);
        greetings.split('|||').forEach((g, idx) => {
          console.log(`     ${idx + 1}. "${g}"`);
        });

        // Update Airtable
        console.log(`\n  💾 Updating Airtable...`);
        const success = await updateAirtable(companion.Character_ID, greetings, description);

        if (success) {
          console.log(`  ✅ Successfully updated!`);
        } else {
          console.log(`  ❌ Failed to update Airtable`);
        }

        // Wait 2 seconds between requests
        if (i < toProcess.length - 1) {
          console.log(`\n  ⏳ Waiting 2 seconds...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

      } catch (error) {
        console.log(`  ❌ Error: ${error.message}`);
      }
    }

    console.log(`\n\n✨ Done! Check the companions in Airtable to see the results.`);

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

main();
