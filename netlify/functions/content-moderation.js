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
    const { message, user_email, user_id, status_check_only } = JSON.parse(event.body);

    if (!user_email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing user_email' })
      };
    }

    console.log('🔍 Moderating message from:', user_email, status_check_only ? '(status check only)' : '');

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

    // If this is just a status check (no message), return OK
    if (status_check_only || !message) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ allowed: true, status: 'active' })
      };
    }

    // Step 2: Rule-based extreme content detection (FAST - runs first)
    const ruleBasedResult = detectProhibitedContent(message);

    if (ruleBasedResult.blocked) {
      console.log('🚨 PROHIBITED CONTENT DETECTED (Rule-based):', ruleBasedResult.category);

      // Flag user immediately and check if they got banned
      const flagResult = await flagUser(user_email, ruleBasedResult, AIRTABLE_BASE_ID, AIRTABLE_TOKEN);

      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          blocked: true,
          banned: flagResult?.banned || false,
          ban_reason: flagResult?.ban_reason || '',
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

        // Flag user and check if they got banned
        const flagResult = await flagUser(user_email, aiResult, AIRTABLE_BASE_ID, AIRTABLE_TOKEN);

        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({
            blocked: true,
            banned: flagResult?.banned || false,
            ban_reason: flagResult?.ban_reason || '',
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
// Returns { banned: true/false, ban_reason: string } so caller can include in response
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
      return { banned: false };
    }

    const userRecord = userData.records[0];
    const currentViolations = userRecord.fields.content_violations || 0;
    const newViolations = currentViolations + 1;

    // Auto-ban after 3 violations OR if violation has auto_ban flag (e.g., CSAM)
    const shouldBan = newViolations >= 3 || violation.auto_ban === true;

    const updatePayload = {
      fields: {
        content_violations: newViolations,
        flagged_at: new Date().toISOString(),
        last_violation_reason: violation.category || violation.categories?.join(', ') || 'Unknown'
      }
    };

    let banReason = '';
    if (shouldBan) {
      updatePayload.fields.is_banned = true;
      if (violation.auto_ban) {
        banReason = `Immediate ban: ${violation.category || 'Severe policy violation'}`;
        updatePayload.fields.ban_reason = banReason;
        console.log('🔨 IMMEDIATE BAN for severe violation:', violation.category);
      } else {
        banReason = `Auto-banned after ${newViolations} content violations: ${violation.category || 'Multiple violations'}`;
        updatePayload.fields.ban_reason = banReason;
        console.log('🔨 AUTO-BANNING USER after', newViolations, 'violations');
      }
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
      return { banned: shouldBan, ban_reason: banReason };
    } else {
      console.error('❌ Failed to update user record');
      return { banned: false };
    }

  } catch (error) {
    console.error('❌ Error flagging user:', error);
  }
}

// Rule-based detection for extreme prohibited content
function detectProhibitedContent(message) {
  const lowerMessage = message.toLowerCase();

  // CRITICAL: Child safety - ZERO TOLERANCE
  // Enhanced patterns based on real abuse analysis from chat history
  const csam_patterns = [
    // Original patterns
    /\b(child|kid|minor|young|underage|teen|preteen|loli|shota|cp|child porn)\b.*\b(porn|sex|nude|naked|explicit|nsfw)/i,
    /\b(sex|fuck|rape|molest|abuse)\b.*\b(child|kid|minor|young|underage|teen|preteen)/i,
    /\b(pedo|pedoph|child abuse|child sexual|csam|csem)\b/i,

    // Age + explicit content (any order) - catches "11 year old tits", "fuck 12 year old"
    /\b\d{1,2}\s*(year|yr|yo)s?\b.*\b(fuck|sex|tits|pussy|cock|jugs|naked|nude|porn)/i,
    /\b(fuck|sex|tits|pussy|cock|naked|nude|porn).*\b\d{1,2}\s*(year|yr|yo)s?\b/i,

    // Family member + explicit - catches "fuck my daughter", "sister naked"
    /\b(daughter|son|sister|brother|niece|nephew|cousin)\b.*\b(fuck|sex|naked|nude|tits|pussy|cock|suck)/i,
    /\b(fuck|sex|naked|nude|suck).*\b(my\s+)?(daughter|son|sister|brother|niece|nephew|cousin)\b/i,

    // "kid/child/minor" + explicit (without age) - catches "fuck the kid"
    /\b(kid|child|minor|underage|little\s*(girl|boy))\b.*\b(fuck|sex|naked|nude|tits|pussy|cock|suck)/i,
    /\b(fuck|sex|naked|nude|suck).*\b(kid|child|minor|underage)\b/i,

    // Preteen always blocked
    /\b(preteen|pre-teen)\b/i,

    // Teen + explicit content
    /\bteen\b.*\b(fuck|sex|naked|nude|porn|pussy|cock|tits)/i,
    /\b(fuck|sex|naked|porn).*\bteen\b/i,

    // Specific body part references with age
    /\b\d{1,2}\s*(year|yr|yo)s?\s*(old\s*)?(tits|jugs|pussy|cock|ass|boobs)/i,
    /\b(tits|jugs|pussy|cock|boobs).*\b\d{1,2}\s*(year|yr|yo)/i,

    // "Young" in sexual context
    /\byoung\s*(girl|boy|one|teen)\b.*\b(fuck|sex|naked|nude|pussy|cock|tits)/i
  ];

  for (const pattern of csam_patterns) {
    if (pattern.test(message)) {
      return {
        blocked: true,
        category: 'CSAM',
        severity: 'CRITICAL',
        auto_ban: true,
        message: 'Content involving minors is strictly illegal and prohibited. This violation has been logged.'
      };
    }
  }

  // JAILBREAK/PROMPT INJECTION DETECTION - Block attempts to bypass safety
  const jailbreak_patterns = [
    /forget\s*(your\s*)?(previous\s*)?(programming|instructions|rules)/i,
    /ignore\s*(your\s*)?(previous\s*)?(instructions|rules|guidelines)/i,
    /you\s+are\s+now\s+(a\s+)?\d{1,2}\s*(year|yr)/i,  // "you are now 15 year old"
    /pretend\s*(you\s*)?(have\s+no|don'?t\s+have)\s*(rules|limits|restrictions)/i,
    /override\s*(your\s*)?(safety|content)?\s*(rules|filters|restrictions)/i,
    /bypass\s*(the\s*)?(safety|content)?\s*(filter|rules|restrictions)/i,
    /disable\s*(your\s*)?(safety|content)?\s*(features|filters|rules)/i,
    /act\s*(like|as\s+if)\s*(you\s*)?(have\s+no|can|don'?t\s+have)\s*(rules|limits)/i,
    /from\s+now\s+on\s*(you\s*)?(are|can|will|have\s+no)/i,
    /new\s+rule[s]?\s*[:.]?\s*(you\s*)?(can|will|must|are)/i
  ];

  for (const pattern of jailbreak_patterns) {
    if (pattern.test(message)) {
      return {
        blocked: true,
        category: 'Jailbreak Attempt',
        severity: 'HIGH',
        auto_ban: false,
        message: 'Attempts to bypass safety features are not allowed.'
      };
    }
  }

  // CRITICAL: Requests for underage roleplay or interaction - BLOCK IMMEDIATELY
  // This catches users trying to make AI pretend to be underage or requesting underage characters
  const underageRequestPatterns = [
    // Direct age requests under 18
    /\b(pretend|act|roleplay|be|play)\b.{0,30}\b(1[0-7]|[1-9])\s*(year|yr)s?\s*old\b/i,
    /\b(pretend|act|roleplay|be|play)\b.{0,30}\b(underage|minor|child|kid|teen|preteen)\b/i,
    // "I want to talk to a X year old"
    /\b(talk|chat|speak|message)\s*(to|with)\s*(a\s*)?\b(1[0-7]|[1-9])\s*(year|yr)s?\s*old\b/i,
    /\b(talk|chat|speak|message)\s*(to|with)\s*(a\s*)?\b(underage|minor|child|kid|teen|preteen)\b/i,
    // Direct underage requests
    /\b(want|looking for|need|give me)\s*(a\s*)?\b(1[0-7]|[1-9])\s*(year|yr)s?\s*old\b/i,
    /\b(want|looking for|need|give me)\s*(a\s*)?\b(underage|minor|child|kid|preteen)\s*(girl|boy|person)?\b/i,
    // Age-specific patterns (13-17)
    /\b(be|act like|pretend)\s*(you'?re?|to be)\s*(a\s*)?(1[3-7])\b/i,
    /\byou'?re?\s*(now\s*)?(a\s*)?(1[3-7])\s*(year|yr)/i,
    // High school student in sexual context on adult platform
    /\b(high\s*school|middle\s*school|junior\s*high)\s*(student|girl|boy)\b/i
  ];

  for (const pattern of underageRequestPatterns) {
    if (pattern.test(message)) {
      return {
        blocked: true,
        category: 'Underage Request',
        severity: 'CRITICAL',
        auto_ban: false, // First offense = warning, but flag user
        message: 'Requests involving minors or underage characters are strictly prohibited on this platform.'
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

  // INCEST - Zero Tolerance (immediate ban)
  // Blocks requests to roleplay as family members or incest content
  const incest_patterns = [
    // Roleplay requests: "pretend you are my daughter/sister/mom"
    /\b(pretend|act|roleplay|be|play)\b.{0,30}\b(my\s+)?(daughter|son|sister|brother|mother|father|mom|dad|mommy|daddy|cousin|aunt|uncle|niece|nephew|stepdaughter|stepson|stepsister|stepbrother|stepmother|stepfather|stepmom|stepdad)\b/i,
    // "You are my daughter/sister" type requests
    /\byou\s+(are|will\s+be|be)\s+(my\s+)?(daughter|son|sister|brother|mother|father|mom|dad|mommy|daddy|cousin|aunt|uncle|niece|nephew|stepdaughter|stepson|stepsister|stepbrother|stepmother|stepfather|stepmom|stepdad)\b/i,
    // Explicit + family member (any order)
    /\b(fuck|sex|naked|nude|suck|lick|finger|penetrate)\b.{0,30}\b(my\s+)?(daughter|son|sister|brother|mother|father|mom|dad|mommy|daddy|cousin|aunt|uncle|niece|nephew)\b/i,
    /\b(my\s+)?(daughter|son|sister|brother|mother|father|mom|dad|mommy|daddy|cousin|aunt|uncle|niece|nephew)\b.{0,30}\b(fuck|sex|naked|nude|suck|lick|finger|penetrate)\b/i,
    // Direct incest keywords
    /\b(incest|family\s*sex|incestuous)\b/i,
    // "I'm your father/brother and I want to..."
    /\bi'?m\s+(your\s+)?(daughter|son|sister|brother|father|mother|dad|mom|daddy|mommy|cousin)\b/i
  ];

  for (const pattern of incest_patterns) {
    if (pattern.test(message)) {
      return {
        blocked: true,
        category: 'Incest',
        severity: 'CRITICAL',
        auto_ban: true,
        message: 'Incest content and family roleplay requests are strictly prohibited.'
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
