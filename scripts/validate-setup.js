// Validation script for Selira AI setup
// Checks if all services are properly configured

const fetch = require('node-fetch');

async function validateSetup() {
  console.log('🔍 Validating Selira AI setup...\n');

  let allGood = true;

  // 1. Check environment variables
  console.log('📋 Environment Variables:');
  const requiredVars = [
    'AIRTABLE_BASE_ID_SELIRA',
    'AIRTABLE_TOKEN_SELIRA', 
    'AUTH0_DOMAIN',
    'AUTH0_CLIENT_ID',
    'OPENROUTER_API_KEY'
  ];

  requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      console.log(`  ✅ ${varName}: ${value.substring(0, 10)}...`);
    } else {
      console.log(`  ❌ ${varName}: MISSING`);
      allGood = false;
    }
  });

  // 2. Test Airtable connection
  console.log('\n🗄️ Airtable Database:');
  try {
    const airtableUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID_SELIRA}/Characters?maxRecords=1`;
    const airtableResponse = await fetch(airtableUrl, {
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN_SELIRA}`,
        'Content-Type': 'application/json'
      }
    });

    if (airtableResponse.ok) {
      const data = await airtableResponse.json();
      console.log(`  ✅ Airtable connected: ${data.records.length} characters found`);
    } else {
      console.log(`  ❌ Airtable error: ${airtableResponse.status}`);
      allGood = false;
    }
  } catch (error) {
    console.log(`  ❌ Airtable connection failed: ${error.message}`);
    allGood = false;
  }

  // 3. Test OpenRouter connection
  console.log('\n🤖 OpenRouter API:');
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
      console.log(`  ✅ OpenRouter connected: ${mistralModels.length} Mistral models available`);
      
      // Show available Mistral models
      console.log('  📋 Available Mistral models:');
      mistralModels.slice(0, 5).forEach(model => {
        console.log(`    - ${model.id} (${model.pricing?.prompt || 'free'})`);
      });
    } else {
      console.log(`  ❌ OpenRouter error: ${openrouterResponse.status}`);
      allGood = false;
    }
  } catch (error) {
    console.log(`  ❌ OpenRouter connection failed: ${error.message}`);
    allGood = false;
  }

  // 4. Check Auth0 configuration
  console.log('\n🔐 Auth0 Configuration:');
  const auth0Domain = process.env.AUTH0_DOMAIN;
  const auth0ClientId = process.env.AUTH0_CLIENT_ID;
  
  if (auth0Domain && auth0ClientId) {
    console.log(`  ✅ Auth0 Domain: ${auth0Domain}`);
    console.log(`  ✅ Auth0 Client ID: ${auth0ClientId.substring(0, 10)}...`);
    
    // Test Auth0 domain accessibility
    try {
      const auth0TestUrl = `https://${auth0Domain}/.well-known/jwks.json`;
      const auth0Response = await fetch(auth0TestUrl);
      
      if (auth0Response.ok) {
        console.log('  ✅ Auth0 domain accessible');
      } else {
        console.log('  ⚠️ Auth0 domain not accessible (may be normal)');
      }
    } catch (error) {
      console.log('  ⚠️ Auth0 domain test failed (may be normal)');
    }
  } else {
    console.log('  ❌ Auth0 configuration incomplete');
    allGood = false;
  }

  // 5. Summary
  console.log('\n📊 Setup Validation Summary:');
  if (allGood) {
    console.log('🎉 All systems ready for Selira AI!');
    console.log('\n📋 Next steps:');
    console.log('1. Duplicate Airtable base from Narrin AI');
    console.log('2. Run cleanup script: node scripts/cleanup-duplicated-base.js');
    console.log('3. Update Auth0 callback URLs in Auth0 dashboard');
    console.log('4. Test chat functionality');
    console.log('5. Configure selira.ai domain in Netlify');
  } else {
    console.log('❌ Some configurations are missing');
    console.log('Please check the items marked with ❌ above');
  }

  return allGood;
}

// Run validation
if (require.main === module) {
  validateSetup();
}

module.exports = { validateSetup };