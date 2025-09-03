// Debug Airtable connection for Selira AI
// Lists all tables and their info to help diagnose issues

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

  const SELIRA_BASE_ID = process.env.AIRTABLE_BASE_ID_SELIRA;
  const SELIRA_TOKEN = process.env.AIRTABLE_TOKEN_SELIRA;

  console.log('🔍 Debug Airtable connection...');
  console.log('Base ID:', SELIRA_BASE_ID);
  console.log('Token starts with:', SELIRA_TOKEN?.substring(0, 8));

  try {
    // Test 1: Get base schema/metadata
    const metaUrl = `https://api.airtable.com/v0/meta/bases/${SELIRA_BASE_ID}/tables`;
    console.log('Testing meta URL:', metaUrl);
    
    const metaResponse = await fetch(metaUrl, {
      headers: {
        'Authorization': `Bearer ${SELIRA_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Meta response status:', metaResponse.status);

    if (metaResponse.ok) {
      const metaData = await metaResponse.json();
      console.log('✅ Base metadata retrieved');
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          base_id: SELIRA_BASE_ID,
          tables: metaData.tables.map(table => ({
            id: table.id,
            name: table.name,
            fields: table.fields.map(field => ({
              name: field.name,
              type: field.type
            }))
          }))
        })
      };
    } else {
      console.log('❌ Meta request failed');
      
      // Test 2: Try listing tables without meta API
      const tableNames = ['Characters', 'Character', 'users', 'Users'];
      const tableTests = {};
      
      for (const tableName of tableNames) {
        try {
          const testUrl = `https://api.airtable.com/v0/${SELIRA_BASE_ID}/${tableName}?maxRecords=1`;
          const testResponse = await fetch(testUrl, {
            headers: {
              'Authorization': `Bearer ${SELIRA_TOKEN}`,
              'Content-Type': 'application/json'
            }
          });
          
          tableTests[tableName] = {
            status: testResponse.status,
            ok: testResponse.ok,
            error: testResponse.ok ? null : await testResponse.text()
          };
          
        } catch (error) {
          tableTests[tableName] = {
            status: 'ERROR',
            ok: false,
            error: error.message
          };
        }
      }
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: false,
          base_id: SELIRA_BASE_ID,
          meta_error: await metaResponse.text(),
          table_tests: tableTests,
          debug_info: {
            base_url: `https://api.airtable.com/v0/${SELIRA_BASE_ID}/`,
            token_length: SELIRA_TOKEN?.length,
            token_format: SELIRA_TOKEN?.startsWith('pat') ? 'Personal Access Token' : 'Legacy API Key'
          }
        })
      };
    }

  } catch (error) {
    console.error('❌ Debug error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Debug failed',
        details: error.message,
        base_id: SELIRA_BASE_ID,
        token_info: {
          exists: !!SELIRA_TOKEN,
          length: SELIRA_TOKEN?.length
        }
      })
    };
  }
};