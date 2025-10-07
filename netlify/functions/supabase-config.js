// Supabase Config Provider
// Returns public Supabase credentials (safe to expose)

exports.handler = async () => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  try {
    const config = {
      url: process.env.SUPABASE_URL_SELIRA,
      anonKey: process.env.SUPABASE_ANON_KEY_SELIRA
    };

    if (!config.url || !config.anonKey) {
      throw new Error('Supabase configuration missing');
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        config: config
      })
    };

  } catch (error) {
    console.error('❌ Supabase config error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};
