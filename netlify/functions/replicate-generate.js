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
      width: width || 1024,
      height: height || 1024,
      steps: num_inference_steps || 20,
      cfg_scale: guidance_scale || 3.5,
      output_format: output_format || 'webp',
      scheduler: 'default'
    };

    // Add seed if provided
    if (seed !== undefined && seed !== null && seed !== '') {
      input.seed = parseInt(seed);
    } else {
      input.seed = -1; // Random seed
    }

    // Create prediction using model name in owner/name format
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'wait'
      },
      body: JSON.stringify({
        version: model,
        input: input
      })
    });

    const responseText = await response.text();
    console.log('API Response status:', response.status);

    if (!response.ok) {
      console.error('❌ Replicate API error:', response.status, responseText);
      return {
        statusCode: response.status,
        body: JSON.stringify({
          error: 'Failed to generate image',
          details: responseText
        })
      };
    }

    const data = JSON.parse(responseText);
    console.log('API Response:', JSON.stringify(data, null, 2));

    // Check if prediction is complete
    if (data.status === 'succeeded' && data.output) {
      const outputUrl = Array.isArray(data.output) ? data.output[0] : data.output;
      console.log('✅ Image generated successfully:', outputUrl);

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
    } else if (data.status === 'starting' || data.status === 'processing') {
      // If not complete, poll for result
      const predictionId = data.id;
      let prediction = data;
      let attempts = 0;
      const maxAttempts = 60; // 60 seconds max wait

      while (prediction.status !== 'succeeded' && prediction.status !== 'failed' && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        attempts++;

        const pollResponse = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
          headers: {
            'Authorization': `Token ${apiKey}`,
            'Content-Type': 'application/json'
          }
        });

        prediction = await pollResponse.json();
        console.log(`Polling attempt ${attempts}: status = ${prediction.status}`);
      }

      if (prediction.status === 'succeeded' && prediction.output) {
        const outputUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
        console.log('✅ Image generated successfully after polling:', outputUrl);

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
      } else {
        console.error('❌ Prediction failed or timed out:', prediction.status);
        return {
          statusCode: 500,
          body: JSON.stringify({
            error: 'Prediction failed or timed out',
            status: prediction.status,
            error_details: prediction.error
          })
        };
      }
    } else {
      console.error('❌ Unexpected response:', data);
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'Unexpected API response',
          status: data.status
        })
      };
    }

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
