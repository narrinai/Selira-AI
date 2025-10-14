#!/usr/bin/env node

// Fast parallel generation - tries 10 requests per minute
const fetch = require('node-fetch');
require('dotenv').config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY_SELIRA || process.env.OPENAI_API_KEY;
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN_SELIRA || process.env.AIRTABLE_TOKEN;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID_SELIRA;

// Parse args
const args = process.argv.slice(2);
const limitArg = args.find(arg => arg.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 891;
const requestsPerMinute = 10; // Try 10 per minute instead of 3
const batchSize = 5; // Process 5 at a time

console.log('🚀 Fast parallel generation starting...');
console.log(`   Rate: ${requestsPerMinute} requests/minute`);
console.log(`   Batch size: ${batchSize} companions at once`);
console.log(`   Total to process: ${limit} companions`);
console.log(`   Estimated time: ${Math.ceil(limit / requestsPerMinute)} minutes\n`);

async function fetchCompanions() {
  const response = await fetch('https://selira.ai/.netlify/functions/selira-characters-fetch?limit=1000');
  const data = await response.json();
  return data.characters;
}

async function generateContent(character) {
  const name = character.Name || 'Unknown';
  const category = character.Category || 'General';
  const sex = character.sex || character.Sex || 'female';
  const ethnicity = character.ethnicity || character.Ethnicity || 'white';
  const hairLength = character.hair_length || character.Hair_Length || 'long';
  const hairColor = character.hair_color || character.Hair_Color || 'brown';
  const contentFilter = character.content_filter || character.Content_Filter || 'Censored';

  let tone = '';
  let descriptionGuidelines = '';
  let greetingGuidelines = '';

  if (contentFilter === 'Uncensored') {
    tone = 'EXTREMELY explicit, raw sexual desire, dirty talk';
    descriptionGuidelines = `- CRITICAL: 14-20 words, ONLY 1 sentence
- Make it INTENSELY sexual, raw, and explicit
- Use explicit language: "addicted to pleasure", "insatiable appetite", "craves raw passion", "expert in seduction"`;
    greetingGuidelines = `- Make greetings EXTREMELY flirty, sexually explicit
- Use explicit body language: "bites lip hungrily", "traces your body with eyes"`;
  } else {
    tone = 'highly seductive, intensely sensual, sexually charged';
    descriptionGuidelines = `- CRITICAL: 14-20 words, ONLY 1 sentence
- Make it VERY seductive, sexually charged
- Use provocative language: "irresistibly seductive", "ignites desire", "craves intimacy"`;
    greetingGuidelines = `- Make greetings VERY flirty, highly seductive
- Use provocative body language: "looks you up and down slowly", "touches your arm suggestively"`;
  }

  const systemPrompt = `You are a creative writer for an adult AI companion platform.

Output ONLY valid JSON:
{
  "greetings": ["greeting1", "greeting2", "greeting3", "greeting4"],
  "description": "backstory here"
}

GREETINGS:
- Put actions AFTER dialogue: "Text here *action*"
${greetingGuidelines}
- Use first person ("I'm ${name}")

DESCRIPTION:
${descriptionGuidelines}
- Match tone: ${tone}
- Third person`;

  const userPrompt = `Create 4 greetings and backstory for:
Name: ${name}, Category: ${category}, Gender: ${sex}, Ethnicity: ${ethnicity}, Hair: ${hairLength} ${hairColor}, Content: ${contentFilter}`;

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
    throw new Error(`OpenAI failed: ${response.status} - ${errorText.substring(0, 200)}`);
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

  return response.ok;
}

async function processBatch(companions, startIdx) {
  const batch = companions.slice(startIdx, startIdx + batchSize);

  const results = await Promise.allSettled(
    batch.map(async (companion, idx) => {
      const globalIdx = startIdx + idx;
      const name = companion.Name || 'Unknown';

      try {
        console.log(`[${globalIdx + 1}/${companions.length}] ${name}...`);

        const { greetings, description } = await generateContent(companion);
        const updated = await updateAirtable(companion.Character_ID, greetings, description);

        if (updated) {
          console.log(`  ✅ ${name}`);
          return { success: true, name };
        } else {
          console.log(`  ❌ ${name} - Airtable failed`);
          return { success: false, name, error: 'Airtable failed' };
        }
      } catch (error) {
        console.log(`  ❌ ${name} - ${error.message.substring(0, 50)}`);
        return { success: false, name, error: error.message };
      }
    })
  );

  return results.map(r => r.value || r.reason);
}

async function main() {
  try {
    console.log('📡 Fetching companions...');
    const allCompanions = await fetchCompanions();

    const needsUpdate = allCompanions.filter(c => !c.Greetings);
    console.log(`✅ Found ${needsUpdate.length} companions needing updates\n`);

    const toProcess = needsUpdate.slice(0, limit);
    console.log(`🎯 Processing ${toProcess.length} companions...\n`);

    let successCount = 0;
    let errorCount = 0;
    const delayBetweenBatches = (60 / requestsPerMinute) * batchSize * 1000;

    for (let i = 0; i < toProcess.length; i += batchSize) {
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(toProcess.length / batchSize);

      console.log(`\n📦 Batch ${batchNum}/${totalBatches} (companions ${i + 1}-${Math.min(i + batchSize, toProcess.length)})`);

      const results = await processBatch(toProcess, i);

      results.forEach(r => {
        if (r && r.success) successCount++;
        else errorCount++;
      });

      // Rate limiting
      if (i + batchSize < toProcess.length) {
        const waitSeconds = Math.ceil(delayBetweenBatches / 1000);
        console.log(`⏳ Waiting ${waitSeconds}s for rate limit...`);
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      }
    }

    console.log(`\n\n📈 Final Results:`);
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`\n✨ Done!`);

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

main();
