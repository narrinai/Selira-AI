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

    // Add warm, sexy background if not already in prompt
    const promptLower = prompt.toLowerCase();
    const hasBackground = promptLower.includes('bedroom') ||
                         promptLower.includes('hotel') ||
                         promptLower.includes('beach') ||
                         promptLower.includes('background') ||
                         promptLower.includes('room') ||
                         promptLower.includes('setting');

    let enhancedPrompt = prompt;
    if (!hasBackground) {
      const randomBackgrounds = [
        ', luxury bedroom with silk sheets, warm golden lighting, candles, rose petals, romantic intimate atmosphere',
        ', five-star hotel suite bedroom, floor-to-ceiling windows, city lights, king size bed, luxury decor',
        ', private jacuzzi suite, steam rising, warm water, candles, mood lighting, intimate spa atmosphere',
        ', tropical beach villa bedroom, ocean view, sunset lighting, open curtains, vacation paradise vibes',
        ', modern penthouse bedroom, exposed brick, designer furniture, warm ambient lighting, urban luxury',
        ', romantic cabin bedroom, fireplace crackling, cozy bed, warm glow, intimate mountain retreat',
        ', luxury yacht master bedroom, panoramic ocean views, white linens, nautical elegance, private luxury',
        ', boutique hotel suite, four-poster bed, silk curtains, chandelier, warm romantic lighting, opulent',
        ', desert resort bedroom, moroccan decor, colorful pillows, lantern lighting, exotic romantic atmosphere',
        ', beachfront bungalow bedroom, tropical breeze, gauze curtains, sunset glow, paradise island vibes',
        ', upscale loft bedroom, modern art, designer bed, floor lamps, industrial chic luxury',
        ', villa infinity pool bedroom, waterfront view, tropical paradise, warm lighting, luxury resort',
        ', countryside estate bedroom, vintage elegance, canopy bed, warm firelight, classic romance',
        ', rooftop suite bedroom, city skyline, neon lights reflecting, modern luxury, urban night vibes',
        ', private spa bedroom, massage table, essential oils, candles, zen atmosphere, sensual wellness',
        ', contemporary bedroom, minimalist luxury, designer furniture, natural light, sophisticated intimate space',
        ', tropical rainforest suite, jungle view, natural sounds, earthy tones, exotic paradise bedroom',
        ', parisian apartment bedroom, classic elegance, ornate details, warm lighting, romantic french vibes'
      ];
      const randomBg = randomBackgrounds[Math.floor(Math.random() * randomBackgrounds.length)];
      enhancedPrompt += randomBg;
      console.log('🎲 Added random warm background:', randomBg);
    }

    // Build input object - try to be compatible with different models
    // Most models use 'steps', some use 'num_inference_steps'
    // Most models use 'guidance' or 'guidance_scale', some don't have it
    const input = {
      prompt: enhancedPrompt,
      width: width || 512,
      height: height || 512,
      image_width: width || 512,   // Kaneko Gen uses image_width
      image_height: height || 512,  // Kaneko Gen uses image_height
      steps: num_inference_steps || 28,
      guidance: guidance_scale || 7,
      guidance_scale: guidance_scale || 7  // Some models use guidance_scale instead of guidance
    };

    // Override seed if provided, otherwise use -1 for random
    if (seed !== undefined && seed !== null && seed !== '') {
      input.seed = parseInt(seed);
    } else {
      input.seed = -1;
    }

    // Some models support scheduler parameter
    // Reliberate v3 uses standard schedulers like "Euler", "Euler A", "DPM++ 2M Karras"
    // For better compatibility, use "Euler" as default (works on most models)
    input.scheduler = 'Euler';

    // Add negative_prompt for better quality (Kaneko Gen and others support this)
    input.negative_prompt = 'low quality, blurry, distorted, deformed, ugly, bad anatomy, text, watermark';

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
