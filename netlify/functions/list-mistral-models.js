// List all available Mistral models from OpenRouter

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

  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Filter for Mistral models
    const mistralModels = data.data
      .filter(model => model.id.toLowerCase().includes('mistral'))
      .map(model => ({
        id: model.id,
        name: model.name,
        pricing: {
          prompt: model.pricing?.prompt,
          completion: model.pricing?.completion
        },
        context_length: model.context_length,
        architecture: model.architecture
      }))
      .sort((a, b) => a.id.localeCompare(b.id));

    // Look specifically for Nemo
    const nemoModels = mistralModels.filter(model => 
      model.id.toLowerCase().includes('nemo') || 
      model.name.toLowerCase().includes('nemo')
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        total_mistral_models: mistralModels.length,
        nemo_models: nemoModels,
        all_mistral_models: mistralModels,
        recommended_for_chat: [
          'mistralai/mistral-large',
          'mistralai/mistral-small', 
          'mistralai/mistral-nemo' // If available
        ].filter(id => mistralModels.some(m => m.id === id))
      })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message,
        available_models: 'Could not retrieve model list'
      })
    };
  }
};