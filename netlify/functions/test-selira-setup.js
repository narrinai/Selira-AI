// Test function to validate Selira AI setup
// Tests all integrations: Airtable, OpenRouter, Auth0

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const results = {
    timestamp: new Date().toISOString(),
    tests: {},
    environment: {},
    summary: { passed: 0, failed: 0, total: 0 }
  };

  // Test 1: Environment Variables
  console.log('🔍 Testing environment variables...');
  const requiredVars = [
    'AIRTABLE_BASE_ID_SELIRA',
    'AIRTABLE_TOKEN_SELIRA',
    'AUTH0_DOMAIN', 
    'AUTH0_CLIENT_ID',
    'OPENROUTER_API_KEY'
  ];

  requiredVars.forEach(varName => {
    const exists = !!process.env[varName];
    results.environment[varName] = exists ? 'SET' : 'MISSING';
    results.tests[`env_${varName}`] = {
      status: exists ? 'PASS' : 'FAIL',
      message: exists ? 'Environment variable set' : 'Environment variable missing'
    };
    
    if (exists) results.summary.passed++;
    else results.summary.failed++;
    results.summary.total++;
  });

  // Test 2: Airtable Connection
  if (process.env.AIRTABLE_BASE_ID_SELIRA && process.env.AIRTABLE_TOKEN_SELIRA) {
    console.log('🗄️ Testing Airtable connection...');
    console.log('Base ID:', process.env.AIRTABLE_BASE_ID_SELIRA);
    console.log('Token starts with:', process.env.AIRTABLE_TOKEN_SELIRA.substring(0, 8));
    try {
      const airtableUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID_SELIRA}/Characters?maxRecords=3`;
      const airtableResponse = await fetch(airtableUrl, {
        headers: {
          'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN_SELIRA}`,
          'Content-Type': 'application/json'
        }
      });

      if (airtableResponse.ok) {
        const data = await airtableResponse.json();
        results.tests.airtable_connection = {
          status: 'PASS',
          message: `Connected successfully. Found ${data.records.length} characters.`,
          data: { character_count: data.records.length }
        };
        results.summary.passed++;
      } else {
        results.tests.airtable_connection = {
          status: 'FAIL',
          message: `HTTP ${airtableResponse.status}: ${airtableResponse.statusText}`,
          error: await airtableResponse.text()
        };
        results.summary.failed++;
      }
    } catch (error) {
      results.tests.airtable_connection = {
        status: 'FAIL',
        message: 'Connection error',
        error: error.message
      };
      results.summary.failed++;
    }
    results.summary.total++;
  }

  // Test 3: OpenRouter Connection  
  if (process.env.OPENROUTER_API_KEY) {
    console.log('🤖 Testing OpenRouter connection...');
    try {
      const openrouterResponse = await fetch('https://openrouter.ai/api/v1/models', {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (openrouterResponse.ok) {
        const models = await openrouterResponse.json();
        const mistralModels = models.data.filter(model => model.id.includes('mistral'));
        results.tests.openrouter_connection = {
          status: 'PASS',
          message: `Connected successfully. ${mistralModels.length} Mistral models available.`,
          data: { 
            total_models: models.data.length,
            mistral_models: mistralModels.length,
            recommended: 'mistralai/mistral-large'
          }
        };
        results.summary.passed++;
      } else {
        results.tests.openrouter_connection = {
          status: 'FAIL',
          message: `HTTP ${openrouterResponse.status}: ${openrouterResponse.statusText}`
        };
        results.summary.failed++;
      }
    } catch (error) {
      results.tests.openrouter_connection = {
        status: 'FAIL', 
        message: 'Connection error',
        error: error.message
      };
      results.summary.failed++;
    }
    results.summary.total++;
  }

  // Test 4: Auth0 Domain Check
  if (process.env.AUTH0_DOMAIN) {
    console.log('🔐 Testing Auth0 domain...');
    try {
      const auth0TestUrl = `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`;
      const auth0Response = await fetch(auth0TestUrl);
      
      results.tests.auth0_domain = {
        status: auth0Response.ok ? 'PASS' : 'WARN',
        message: auth0Response.ok ? 'Auth0 domain accessible' : 'Auth0 domain not accessible (may be normal)',
        data: { domain: process.env.AUTH0_DOMAIN }
      };
      
      if (auth0Response.ok) results.summary.passed++;
      else results.summary.failed++;
    } catch (error) {
      results.tests.auth0_domain = {
        status: 'WARN',
        message: 'Auth0 domain test failed (may be normal)', 
        error: error.message
      };
      results.summary.failed++;
    }
    results.summary.total++;
  }

  // Generate overall status
  const overallStatus = results.summary.failed === 0 ? 'SUCCESS' : 
                       results.summary.failed <= 2 ? 'PARTIAL' : 'FAILED';

  console.log('📊 Test Summary:', {
    passed: results.summary.passed,
    failed: results.summary.failed, 
    status: overallStatus
  });

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      platform: 'Selira AI',
      status: overallStatus,
      results: results,
      next_steps: overallStatus === 'SUCCESS' ? [
        'All systems operational!',
        'Ready for chat testing',
        'Configure selira.ai domain'
      ] : [
        'Fix failed integrations',
        'Check environment variables',
        'Verify API keys and permissions'
      ]
    })
  };
};