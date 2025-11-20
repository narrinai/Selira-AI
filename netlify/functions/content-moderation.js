// Extreme Content Moderation System for Selira AI
// Blocks illegal content and flags/bans violating users

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID_SELIRA;
  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN_SELIRA;
  const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY; // Optional - falls back to rule-based
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

  try {
    const { message, user_email, user_id } = JSON.parse(event.body);

    if (!message || !user_email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing message or user_email' })
      };
    }

    console.log('🔍 Moderating message from:', user_email);

    // Step 1: Check if user is already banned
    const userStatus = await checkUserStatus(user_email, AIRTABLE_BASE_ID, AIRTABLE_TOKEN);

    if (userStatus.is_banned) {
      console.log('🚫 User is BANNED:', user_email);
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          blocked: true,
          banned: true,
          reason: 'Account restricted due to content policy violations',
          ban_reason: userStatus.ban_reason
        })
      };
    }

    // Step 2: Rule-based extreme content detection (FAST - runs first)
    const ruleBasedResult = detectProhibitedContent(message);

    if (ruleBasedResult.blocked) {
      console.log('🚨 PROHIBITED CONTENT DETECTED (Rule-based):', ruleBasedResult.category);

      // Flag user immediately
      await flagUser(user_email, ruleBasedResult, AIRTABLE_BASE_ID, AIRTABLE_TOKEN);

      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          blocked: true,
          banned: false,
          reason: 'Message blocked due to content policy violation',
          category: ruleBasedResult.category,
          user_flagged: true
        })
      };
    }

    // Step 3: AI-based moderation (if available)
    if (MISTRAL_API_KEY || OPENROUTER_API_KEY) {
      const aiResult = await moderateWithAI(message, MISTRAL_API_KEY, OPENROUTER_API_KEY);

      if (aiResult.blocked) {
        console.log('🚨 PROHIBITED CONTENT DETECTED (AI):', aiResult.categories);

        // Flag user
        await flagUser(user_email, aiResult, AIRTABLE_BASE_ID, AIRTABLE_TOKEN);

        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({
            blocked: true,
            banned: false,
            reason: 'Message blocked due to content policy violation',
            categories: aiResult.categories,
            user_flagged: true
          })
        };
      }
    }

    // Content is SAFE
    console.log('✅ Content passed moderation');
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        blocked: false,
        safe: true,
        message: 'Content approved'
      })
    };

  } catch (error) {
    console.error('❌ Moderation error:', error);

    // FAIL OPEN for technical errors (don't block legitimate users)
    // But log the error for investigation
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        blocked: false,
        safe: true,
        error: 'Moderation check failed - allowing message',
        details: error.message
      })
    };
  }
};

// Check user ban status in Airtable
async function checkUserStatus(user_email, baseId, token) {
  try {
    const url = `https://api.airtable.com/v0/${baseId}/Users?filterByFormula=${encodeURIComponent(`{Email}='${user_email}'`)}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user');
    }

    const data = await response.json();

    if (data.records.length === 0) {
      return { is_banned: false, violations: 0 };
    }

    const user = data.records[0].fields;

    return {
      record_id: data.records[0].id,
      is_banned: user.is_banned || false,
      ban_reason: user.ban_reason || '',
      violations: user.content_violations || 0
    };
  } catch (error) {
    console.error('⚠️ User status check failed:', error);
    // Fail open - don't block if we can't check status
    return { is_banned: false, violations: 0 };
  }
}

// Flag user and auto-ban after 3 violations
async function flagUser(user_email, violation, baseId, token) {
  try {
    console.log('🚩 Flagging user:', user_email);

    // Get user record
    const userUrl = `https://api.airtable.com/v0/${baseId}/Users?filterByFormula=${encodeURIComponent(`{Email}='${user_email}'`)}`;

    const userResponse = await fetch(userUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!userResponse.ok) {
      throw new Error('Failed to fetch user for flagging');
    }

    const userData = await userResponse.json();

    if (userData.records.length === 0) {
      console.error('❌ User not found for flagging:', user_email);
      return;
    }

    const userRecord = userData.records[0];
    const currentViolations = userRecord.fields.content_violations || 0;
    const newViolations = currentViolations + 1;

    // Auto-ban after 3 violations
    const shouldBan = newViolations >= 3;

    const updatePayload = {
      fields: {
        content_violations: newViolations,
        flagged_at: new Date().toISOString(),
        last_violation_reason: violation.category || violation.categories?.join(', ') || 'Unknown'
      }
    };

    if (shouldBan) {
      updatePayload.fields.is_banned = true;
      updatePayload.fields.ban_reason = `Auto-banned after ${newViolations} content violations: ${violation.category || 'Multiple violations'}`;
      console.log('🔨 AUTO-BANNING USER after', newViolations, 'violations');
    }

    // Update user record
    const updateResponse = await fetch(`https://api.airtable.com/v0/${baseId}/Users/${userRecord.id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatePayload)
    });

    if (updateResponse.ok) {
      console.log(`✅ User flagged: ${user_email} (${newViolations} violations${shouldBan ? ' - BANNED' : ''})`);
    } else {
      console.error('❌ Failed to update user record');
    }

  } catch (error) {
    console.error('❌ Error flagging user:', error);
  }
}

// Rule-based detection for extreme prohibited content
function detectProhibitedContent(message) {
  const lowerMessage = message.toLowerCase();

  // CRITICAL: Child safety - ZERO TOLERANCE
  const csam_patterns = [
    /\b(child|kid|minor|young|underage|teen|preteen|loli|shota|cp|child porn)\b.*\b(porn|sex|nude|naked|explicit|nsfw)/i,
    /\b(sex|fuck|rape|molest|abuse)\b.*\b(child|kid|minor|young|underage|teen|preteen)/i,
    /\b(pedo|pedoph|child abuse|child sexual|csam|csem)\b/i,
    /\b\d{1,2}\s*(year|yr)s?\s*old\b.*\b(sex|porn|nude|naked|fuck)/i
  ];

  for (const pattern of csam_patterns) {
    if (pattern.test(message)) {
      return {
        blocked: true,
        category: 'CSAM',
        severity: 'CRITICAL',
        auto_ban: true
      };
    }
  }

  // Human trafficking / illegal content
  const trafficking_patterns = [
    /\b(buy|sell|trade|purchase)\b.*\b(child|kid|slave|human|person|woman|girl|boy)\b/i,
    /\b(trafficking|smuggl|slave|forced)\b/i
  ];

  for (const pattern of trafficking_patterns) {
    if (pattern.test(message)) {
      return {
        blocked: true,
        category: 'Human Trafficking',
        severity: 'CRITICAL',
        auto_ban: true
      };
    }
  }

  // Extreme violence / terrorism
  const violence_patterns = [
    /\b(bomb|terrorist|terrorism|mass murder|school shooting|kill.*people)\b/i,
    /\b(make.*bomb|build.*weapon|attack.*school)\b/i,
    /\b(suicide.*bomb|mass.*shooting|terrorist.*attack)\b/i
  ];

  for (const pattern of violence_patterns) {
    if (pattern.test(message)) {
      return {
        blocked: true,
        category: 'Terrorism/Violence',
        severity: 'CRITICAL',
        auto_ban: false
      };
    }
  }

  // Illegal drug manufacturing/distribution
  const drugs_patterns = [
    /\b(make|manufacture|produce|cook)\b.*\b(meth|heroin|fentanyl|cocaine)\b/i,
    /\b(sell|distribute|deal)\b.*\b(drugs|narcotics|meth|heroin)\b/i
  ];

  for (const pattern of drugs_patterns) {
    if (pattern.test(message)) {
      return {
        blocked: true,
        category: 'Illegal Drugs',
        severity: 'HIGH',
        auto_ban: false
      };
    }
  }

  // Self-harm (block but don't auto-ban - user may need help)
  const selfharm_patterns = [
    /\b(kill myself|suicide|end my life|want to die)\b/i,
    /\b(cut myself|self harm|hurt myself)\b/i
  ];

  for (const pattern of selfharm_patterns) {
    if (pattern.test(message)) {
      return {
        blocked: true,
        category: 'Self-harm',
        severity: 'HIGH',
        auto_ban: false,
        provide_resources: true
      };
    }
  }

  // Content is safe (from rule-based perspective)
  return {
    blocked: false,
    safe: true
  };
}

// AI-based moderation using Mistral or Mistral via OpenRouter
async function moderateWithAI(message, mistralKey, openrouterKey) {
  try {
    // Try direct Mistral API first (if available)
    if (mistralKey) {
      return await moderateWithMistralDirect(message, mistralKey);
    }

    // Fall back to OpenRouter with Mistral moderation model
    if (openrouterKey) {
      return await moderateWithMistralViaOpenRouter(message, openrouterKey);
    }

    // No AI moderation available
    return { blocked: false, safe: true, method: 'none' };

  } catch (error) {
    console.error('❌ AI moderation error:', error);
    // Fail open - don't block if AI check fails
    return { blocked: false, safe: true, error: error.message };
  }
}

// Direct Mistral Moderation API
async function moderateWithMistralDirect(message, apiKey) {
  const response = await fetch('https://api.mistral.ai/v1/chat/moderations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'mistral-moderation-latest',
      input: [message]
    })
  });

  if (!response.ok) {
    throw new Error(`Mistral moderation failed: ${response.status}`);
  }

  const data = await response.json();
  const result = data.results[0];

  // Check for critical categories
  const criticalCategories = ['sexual', 'hate_and_discrimination', 'violence_and_threats', 'dangerous_and_criminal_content', 'self_harm'];
  const flaggedCategories = [];

  for (const category of criticalCategories) {
    if (result.categories[category]) {
      flaggedCategories.push(category);
    }
  }

  const blocked = flaggedCategories.length > 0;

  return {
    blocked,
    safe: !blocked,
    categories: flaggedCategories,
    method: 'mistral_direct',
    scores: result.category_scores
  };
}

// Mistral via OpenRouter (as fallback)
async function moderateWithMistralViaOpenRouter(message, apiKey) {
  // Use Mistral model via OpenRouter to check for harmful content
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://selira.ai',
      'X-Title': 'Selira AI Moderation'
    },
    body: JSON.stringify({
      model: 'mistralai/mistral-nemo',
      messages: [
        {
          role: 'system',
          content: `You are a content moderation AI for an ADULT NSFW chat platform. Only flag ILLEGAL content, NOT adult content between consenting adults.

IMPORTANT CONTEXT:
- This is an 18+ adult platform - explicit sexual content between adults is ALLOWED
- Words like "baby", "girl", "boy" are often terms of endearment between adults - NOT indicators of minors
- "shy girl/boy" refers to adult personality traits, NOT age
- ONLY flag if there are EXPLICIT references to: actual children, minors, ages under 18, "child", "kid", "underage", "teen", "preteen"

ONLY block if you detect:
1. CSAM - EXPLICIT references to children/minors in sexual contexts (ages, "child", "kid", "minor", "underage")
2. Human trafficking - buying/selling people
3. Terrorism - planning attacks, making weapons
4. Illegal drug manufacturing - making meth, heroin, etc
5. Self-harm - suicide plans, self-injury

DO NOT block:
- Adult roleplay with terms like "baby", "daddy", "mommy" (common adult terms)
- Adult sexual content (this is an NSFW platform)
- "Girl" or "boy" when referring to adults

Respond ONLY with valid JSON:
{
  "blocked": true/false,
  "categories": ["category1"],
  "severity": "CRITICAL/HIGH/MEDIUM/LOW",
  "confidence": 0-100
}

ONLY set blocked=true if you are 90%+ confident it's ILLEGAL content, not just adult content.`
        },
        {
          role: 'user',
          content: `Moderate this message:\n\n"${message}"`
        }
      ],
      max_tokens: 150,
      temperature: 0.1
    })
  });

  if (!response.ok) {
    throw new Error(`OpenRouter moderation failed: ${response.status}`);
  }

  const data = await response.json();
  const aiResponse = data.choices[0].message.content;

  try {
    const result = JSON.parse(aiResponse);
    return {
      ...result,
      method: 'mistral_via_openrouter'
    };
  } catch (parseError) {
    console.error('❌ Failed to parse AI moderation response:', aiResponse);
    // Fail open
    return { blocked: false, safe: true, error: 'parse_error' };
  }
}
