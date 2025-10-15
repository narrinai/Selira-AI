// Fix characters with incorrect Character_Description format
// Run this via: POST https://selira.ai/.netlify/functions/fix-character-descriptions
// Optional query params: ?dryRun=true (to preview), ?limit=10 (to process only N characters)

const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID_SELIRA || process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN_SELIRA || process.env.AIRTABLE_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY_SELIRA || process.env.OPENAI_API_KEY;

exports.handler = async (event, context) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const params = event.queryStringParameters || {};
    const dryRun = params.dryRun === 'true';
    const limit = parseInt(params.limit) || 1000;

    console.log('🔧 Starting character description fix...', { dryRun, limit });

    // Fetch all characters from Airtable
    let allRecords = [];
    let offset = null;

    do {
      const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Characters${offset ? `?offset=${offset}` : ''}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Airtable fetch failed: ${response.status}`);
      }

      const data = await response.json();
      allRecords = allRecords.concat(data.records);
      offset = data.offset;
    } while (offset);

    console.log(`📊 Fetched ${allRecords.length} total characters`);

    // Find characters with problematic descriptions
    const problematicCharacters = allRecords.filter(record => {
      const desc = record.fields.Character_Description || '';

      // Check for problematic patterns
      const hasCharPlaceholder = desc.includes('{{char}}');
      const hasGreetingSeparator = desc.includes('|||');
      const hasVisibilityMixed = desc.includes('    private    ') || desc.includes('    public    ');
      const hasTooManyActions = (desc.match(/\*/g) || []).length > 4; // More than 2 action pairs suggests mixed content
      const hasMultipleSpaces = /\s{4,}/.test(desc); // 4+ consecutive spaces

      return hasCharPlaceholder || hasGreetingSeparator || hasVisibilityMixed ||
             hasTooManyActions || hasMultipleSpaces;
    }).slice(0, limit);

    console.log(`🔍 Found ${problematicCharacters.length} characters with problematic descriptions`);

    if (problematicCharacters.length === 0) {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          message: 'No problematic characters found',
          total: allRecords.length,
          problematic: 0
        })
      };
    }

    // Preview mode - just return the list
    if (dryRun) {
      const preview = problematicCharacters.map(r => ({
        id: r.id,
        name: r.fields.Name,
        description: r.fields.Character_Description?.substring(0, 150) + '...',
        issues: detectIssues(r.fields.Character_Description)
      }));

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          dryRun: true,
          total: allRecords.length,
          problematic: problematicCharacters.length,
          preview: preview
        })
      };
    }

    // Fix mode - regenerate descriptions
    const results = {
      success: [],
      failed: [],
      skipped: []
    };

    for (const record of problematicCharacters) {
      const fields = record.fields;
      console.log(`\n🔧 Processing: ${fields.Name} (${record.id})`);

      try {
        // Extract description from mixed content if possible
        const desc = fields.Character_Description || '';
        let cleanDescription = desc;

        // Try to extract just the first sentence before any markers
        if (desc.includes('    private    ') || desc.includes('    public    ')) {
          cleanDescription = desc.split('    private    ')[0].split('    public    ')[0].trim();
        }
        if (cleanDescription.includes('|||')) {
          cleanDescription = cleanDescription.split('|||')[0].trim();
        }

        // If description is still problematic or too short, regenerate with OpenAI
        if (cleanDescription.length < 50 || cleanDescription.includes('{{char}}')) {
          console.log('   🤖 Regenerating description with OpenAI...');

          const newDescription = await generateDescriptionViaOpenAI(
            fields.Name,
            fields.sex || 'female',
            fields.ethnicity || 'white',
            fields.hair_length || 'long',
            fields.hair_color || 'brown',
            fields.companion_type || 'realistic',
            fields.Tags || [],
            fields.content_filter || 'Censored'
          );

          if (newDescription) {
            cleanDescription = newDescription;
          } else {
            console.log('   ⚠️ OpenAI generation failed, using cleaned version');
          }
        }

        // Update the character in Airtable
        const updateUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Characters/${record.id}`;
        const updateResponse = await fetch(updateUrl, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fields: {
              Character_Description: cleanDescription
            }
          })
        });

        if (updateResponse.ok) {
          console.log('   ✅ Updated successfully');
          results.success.push({
            id: record.id,
            name: fields.Name,
            oldDescription: desc.substring(0, 100),
            newDescription: cleanDescription.substring(0, 100)
          });
        } else {
          const errorText = await updateResponse.text();
          console.log('   ❌ Update failed:', errorText);
          results.failed.push({ id: record.id, name: fields.Name, error: errorText });
        }

      } catch (error) {
        console.log('   ❌ Error:', error.message);
        results.failed.push({ id: record.id, name: fields.Name, error: error.message });
      }

      // Rate limiting - wait 1 second between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        total: allRecords.length,
        problematic: problematicCharacters.length,
        fixed: results.success.length,
        failed: results.failed.length,
        results: results
      })
    };

  } catch (error) {
    console.error('❌ Error fixing descriptions:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};

// Helper function to detect specific issues
function detectIssues(description) {
  const issues = [];
  if (description.includes('{{char}}')) issues.push('has {{char}} placeholder');
  if (description.includes('|||')) issues.push('has greeting separator');
  if (description.includes('    private    ') || description.includes('    public    ')) {
    issues.push('has visibility mixed in');
  }
  if ((description.match(/\*/g) || []).length > 4) issues.push('too many action markers');
  if (/\s{4,}/.test(description)) issues.push('excessive spacing');
  return issues;
}

// Helper function to generate description via OpenAI
async function generateDescriptionViaOpenAI(name, sex, ethnicity, hairLength, hairColor, category, tags, contentFilter) {
  if (!OPENAI_API_KEY) {
    console.log('⚠️ No OpenAI API key found');
    return null;
  }

  let tone = contentFilter === 'Uncensored'
    ? 'EXTREMELY explicit, raw sexual desire'
    : 'highly seductive, intensely sensual';

  const descriptionGuidelines = contentFilter === 'Uncensored'
    ? '14-20 words, ONLY 1 sentence, INTENSELY sexual and explicit'
    : '14-20 words, ONLY 1 sentence, VERY seductive and sexually charged';

  const systemPrompt = `You are a creative writer. Generate ONLY a character description - nothing else.

CRITICAL RULES:
- EXACTLY 14-20 words, ONLY 1 sentence
- Third person (use "${name}")
- NO placeholders like {{char}}
- NO greetings or dialogue
- NO visibility settings (public/private)
- NO action markers like *smiles*
- Match tone: ${tone}
- ${descriptionGuidelines}`;

  const userPrompt = `Create description for: ${name}, ${sex}, ${ethnicity}, ${hairLength} ${hairColor} hair, ${category} style, tags: ${tags.join(', ')}`;

  try {
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
        temperature: 0.7,
        max_tokens: 100
      })
    });

    if (!response.ok) {
      console.log('❌ OpenAI API failed:', response.status);
      return null;
    }

    const data = await response.json();
    const description = data.choices[0].message.content.trim();

    // Validate the description
    if (description.includes('{{char}}') || description.includes('|||') || description.includes('*')) {
      console.log('❌ Generated description still has issues:', description);
      return null;
    }

    return description;

  } catch (error) {
    console.log('❌ Error generating description via OpenAI:', error.message);
    return null;
  }
}
