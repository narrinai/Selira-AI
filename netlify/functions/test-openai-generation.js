// Test endpoint to debug OpenAI generation
// Call this with: POST https://selira.ai/.netlify/functions/test-openai-generation
// Body: { "name": "TestChar", "sex": "female", "tags": ["Flirty"] }

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

  try {
    const { name, sex, tags, contentFilter } = JSON.parse(event.body || '{}');

    console.log('🔑 API Key check:', {
      hasKey: !!OPENAI_API_KEY,
      keyPrefix: OPENAI_API_KEY ? OPENAI_API_KEY.substring(0, 10) + '...' : 'NONE'
    });

    if (!OPENAI_API_KEY) {
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'No OpenAI API key found',
          checked: ['OPENAI_API_KEY_SELIRA', 'OPENAI_API_KEY']
        })
      };
    }

    const isMale = sex && sex.toLowerCase() === 'male';
    const genderNoun = isMale ? 'man/god/stud/hunk' : 'woman/goddess';
    const filter = contentFilter || 'Censored';

    const tone = filter === 'Uncensored' ? 'EXTREMELY explicit, raw sexual desire' : 'highly seductive, intensely sensual';
    const descGuidelines = `14-20 words, ONLY 1 sentence, ${filter === 'Uncensored' ? 'INTENSELY sexual' : 'VERY seductive'}. Use "${genderNoun}"`;

    const systemPrompt = `You are a creative writer for an adult AI companion platform.

CRITICAL: You MUST output ONLY valid JSON in this EXACT format:
{
  "greetings": ["greeting1", "greeting2", "greeting3", "greeting4"],
  "description": "backstory here"
}

DO NOT include any other text, explanations, or formatting. ONLY output the JSON object above.

GREETINGS FORMAT:
- Create 4 DIFFERENT greetings
- Put actions AFTER dialogue: "Text here *action*"
- Use first person ("I'm ${name || 'TestChar'}")
- Each greeting should be unique and varied

DESCRIPTION FORMAT:
- ${descGuidelines}
- Match tone: ${tone}
- Write in third person
- DO NOT use {{char}} or any placeholders
- DO NOT include greetings in the description
- ONLY include the character backstory/description`;

    const userPrompt = `Create 4 greetings and backstory for:
Name: ${name || 'TestChar'}, Gender: ${sex || 'female'}, Tags: ${(tags || ['Flirty']).join(', ')}, Content: ${filter}`;

    console.log('📤 Calling OpenAI with:', { name, sex, tags, contentFilter: filter });

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
        max_tokens: 500,
        response_format: { type: "json_object" }
      })
    });

    console.log('📥 OpenAI response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ OpenAI API failed:', response.status, errorText);
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'OpenAI API failed',
          status: response.status,
          details: errorText.substring(0, 500)
        })
      };
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    console.log('📨 Raw OpenAI response:', content);

    const result = JSON.parse(content);

    // Run validation checks
    const validationResults = {
      hasGreetings: !!result.greetings,
      isArray: Array.isArray(result.greetings),
      greetingCount: result.greetings ? result.greetings.length : 0,
      hasDescription: !!result.description,
      isString: typeof result.description === 'string',
      descriptionLength: result.description ? result.description.length : 0,
      containsCharPlaceholder: result.description ? result.description.includes('{{char}}') : false,
      containsGreetingSeparator: result.description ? result.description.includes('|||') : false,
      actionMarkerCount: result.description ? (result.description.match(/\*/g) || []).length : 0,
      splitLength: result.description ? result.description.split('*').length : 0
    };

    const wouldPass = validationResults.isArray &&
                      validationResults.greetingCount === 4 &&
                      validationResults.isString &&
                      !validationResults.containsCharPlaceholder &&
                      !validationResults.containsGreetingSeparator &&
                      validationResults.splitLength <= 3;

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        rawContent: content,
        parsed: result,
        validation: validationResults,
        wouldPass: wouldPass,
        apiKeyFound: true
      })
    };

  } catch (error) {
    console.error('❌ Test error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: error.message,
        stack: error.stack
      })
    };
  }
};
