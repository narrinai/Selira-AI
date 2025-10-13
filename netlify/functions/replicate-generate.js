const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Parse request body
    const requestData = JSON.parse(event.body);
    const { model, prompt, width, height, num_inference_steps, guidance_scale, seed, output_format } = requestData;

    // Get API key from environment variables
    const apiKey = process.env.REPLICATE_API_TOKEN_SELIRA;

    if (!apiKey) {
      console.error('❌ Replicate API key not configured');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'API key not configured' })
      };
    }

    if (!model || !prompt) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Model and prompt are required' })
      };
    }

    console.log('🎨 Generating image with Replicate API...');
    console.log('Model:', model);
    console.log('Prompt:', prompt);

    // Build input object - using Flux model parameter names
    const input = {
      prompt: prompt,
      width: width || 512,
      height: height || 512,
      steps: num_inference_steps || 20,
      cfg_scale: guidance_scale || 5,
      scheduler: 'default',
      seed: -1 // Default to random
    };

    // Override seed if provided
    if (seed !== undefined && seed !== null && seed !== '') {
      input.seed = parseInt(seed);
    }

    // Create prediction using model name in owner/name format
    const requestBody = {
      version: model,
      input: input
    };

    console.log('🔍 Request body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'wait'
      },
      body: JSON.stringify(requestBody)
    });

    const responseText = await response.text();
    console.log('API Response status:', response.status);
    console.log('API Response body:', responseText);

    if (!response.ok) {
      console.error('❌ Replicate API error:', response.status, responseText);

      // Try to parse error details
      let errorDetails = responseText;
      try {
        const errorJson = JSON.parse(responseText);
        errorDetails = errorJson.detail || errorJson.error || responseText;
      } catch (e) {
        // Keep as is
      }

      return {
        statusCode: response.status,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          error: 'Failed to generate image',
          details: errorDetails,
          status: response.status
        })
      };
    }

    const data = JSON.parse(responseText);
    console.log('API Response:', JSON.stringify(data, null, 2));

    // Check if prediction is complete immediately
    if (data.status === 'succeeded' && data.output) {
      const outputUrl = Array.isArray(data.output) ? data.output[0] : data.output;
      console.log('✅ Image generated immediately:', outputUrl);

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          success: true,
          output: outputUrl,
          status: data.status
        })
      };
    }

    // Poll for completion (max 20 seconds for Netlify Pro 26s timeout with 6s buffer)
    const predictionId = data.id;
    let prediction = data;
    let attempts = 0;
    const maxAttempts = 20; // 20 seconds max

    while (prediction.status !== 'succeeded' && prediction.status !== 'failed' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;

      const pollResponse = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
        headers: {
          'Authorization': `Token ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      prediction = await pollResponse.json();
      console.log(`Polling attempt ${attempts}: status = ${prediction.status}`);

      if (prediction.status === 'succeeded' && prediction.output) {
        const outputUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
        console.log('✅ Image generated after polling:', outputUrl);

        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            success: true,
            output: outputUrl,
            status: prediction.status
          })
        };
      }
    }

    // If we get here, it timed out or failed
    console.error('❌ Prediction failed or timed out:', prediction.status);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: 'Prediction timed out or failed',
        status: prediction.status,
        error_details: prediction.error || 'Generation took too long'
      })
    };

  } catch (error) {
    console.error('❌ Replicate function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};
