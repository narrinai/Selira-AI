const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const requestData = JSON.parse(event.body);
    console.log('🎬 Generating text-to-video with companion traits...');

    const {
      companionName,
      hairColor,
      hairLength,
      ethnicity,
      bodyType,
      age,
      action,
      setting,
      provider // 'fal', 'replicate', or 'runpod'
    } = requestData;

    // Build detailed prompt from companion traits
    const prompt = buildPromptFromTraits({
      companionName,
      hairColor,
      hairLength,
      ethnicity,
      bodyType,
      age,
      action,
      setting
    });

    console.log('📝 Generated prompt:', prompt);

    // Route to appropriate provider
    let result;
    if (provider === 'fal') {
      result = await generateWithFal(prompt, requestData);
    } else if (provider === 'replicate') {
      result = await generateWithReplicate(prompt, requestData);
    } else if (provider === 'runpod') {
      result = await generateWithRunPod(prompt, requestData);
    } else {
      throw new Error('Invalid provider. Choose: fal, replicate, or runpod');
    }

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        ...result,
        prompt: prompt
      })
    };

  } catch (error) {
    console.error('❌ Error:', error);
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Failed to generate video',
        message: error.message
      })
    };
  }
};

// Build detailed prompt from companion traits
function buildPromptFromTraits(traits) {
  const {
    companionName,
    hairColor,
    hairLength,
    ethnicity,
    bodyType,
    age,
    action,
    setting
  } = traits;

  // Map ethnicity to appearance description
  const ethnicityMap = {
    'caucasian': 'fair skin, European features',
    'asian': 'East Asian features, smooth skin',
    'black': 'dark skin, African features',
    'latina': 'tan skin, Latina features',
    'middle-eastern': 'olive skin, Middle Eastern features',
    'indian': 'brown skin, South Asian features',
    'mixed': 'mixed ethnicity features'
  };

  // Map body type to description
  const bodyTypeMap = {
    'slim': 'slender figure, thin build',
    'athletic': 'toned athletic body, fit physique',
    'curvy': 'curvy hourglass figure, voluptuous',
    'petite': 'petite small frame, delicate build',
    'average': 'average body type, normal build',
    'plus-size': 'full-figured, plus-size body'
  };

  // Build appearance description
  const appearance = [
    `Beautiful ${age || 25}-year-old woman`,
    `${hairLength || 'long'} ${hairColor || 'brown'} hair`,
    ethnicityMap[ethnicity] || ethnicityMap['caucasian'],
    bodyTypeMap[bodyType] || bodyTypeMap['average']
  ].join(', ');

  // Build full prompt with action and setting
  const fullPrompt = `
${appearance}. ${action || 'smiling at camera, gentle head movement'}.

Setting: ${setting || 'indoor lighting, soft background'}.

High quality, professional video, smooth motion, realistic skin texture,
detailed facial features, photorealistic, 8K quality, natural lighting,
cinematic camera movement, explicit NSFW content.
  `.trim();

  return fullPrompt;
}

// Generate with fal.ai
async function generateWithFal(prompt, requestData) {
  const FAL_API_KEY = process.env.PROMPTCHAN_API_KEY_SELIRA; // Using PromptChan key

  const response = await fetch('https://fal.run/fal-ai/kling-video/v1/standard/text-to-video', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${FAL_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prompt: prompt,
      duration: requestData.duration || '5',
      aspect_ratio: requestData.aspect_ratio || '16:9',
      negative_prompt: requestData.negative_prompt || 'low quality, blurry, distorted, deformed'
    })
  });

  if (!response.ok) {
    throw new Error(`fal.ai API error: ${response.status}`);
  }

  const data = await response.json();
  return {
    provider: 'fal.ai (Kling AI)',
    video: data.video?.url,
    jobId: data.request_id
  };
}

// Generate with Replicate (Hunyuan Video)
async function generateWithReplicate(prompt, requestData) {
  const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN_SELIRA;

  const response = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${REPLICATE_API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      version: 'tencent/hunyuan-video:847dfa8b01e739637fc76f480ede0c1d76408e1d694b830b5dfb8e547bf98405',
      input: {
        prompt: prompt,
        width: requestData.width || 864,
        height: requestData.height || 480,
        video_length: requestData.video_length || 129,
        infer_steps: requestData.infer_steps || 50,
        embedded_guidance_scale: requestData.guidance_scale || 6,
        fps: requestData.fps || 24,
        seed: requestData.seed || Math.floor(Math.random() * 1000000)
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Replicate API error: ${response.status}`);
  }

  const data = await response.json();

  // Poll for completion
  let prediction = data;
  while (prediction.status === 'starting' || prediction.status === 'processing') {
    await new Promise(resolve => setTimeout(resolve, 3000));

    const statusResponse = await fetch(prediction.urls.get, {
      headers: { 'Authorization': `Bearer ${REPLICATE_API_TOKEN}` }
    });
    prediction = await statusResponse.json();
  }

  if (prediction.status === 'succeeded') {
    return {
      provider: 'Replicate (Hunyuan Video)',
      video: prediction.output,
      cost: '~$0.15'
    };
  } else {
    throw new Error(`Prediction failed: ${prediction.error || 'Unknown error'}`);
  }
}

// Generate with RunPod (Two-step: Text-to-Image → Image-to-Video)
async function generateWithRunPod(prompt, requestData) {
  const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY_SELIRA;
  const RUNPOD_ENDPOINT_ID = process.env.RUNPOD_ENDPOINT_ID_SELIRA;

  console.log('🎨 Step 1: Generating image from companion traits...');

  // Step 1: Generate image using PromptChan or another T2I service
  const imagePrompt = prompt.replace(/video/gi, 'photo').replace(/motion/gi, 'pose');

  const imageResponse = await fetch('https://api.promptchan.ai/generate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PROMPTCHAN_API_KEY_SELIRA}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prompt: imagePrompt,
      model: 'sdxl',
      width: requestData.width || 512,
      height: requestData.height || 512,
      steps: 30,
      guidance_scale: 7.5
    })
  });

  if (!imageResponse.ok) {
    throw new Error(`Image generation failed: ${imageResponse.status}`);
  }

  const imageData = await imageResponse.json();
  const imageUrl = imageData.images?.[0]?.url;

  if (!imageUrl) {
    throw new Error('No image URL returned from image generation');
  }

  console.log('✅ Image generated:', imageUrl);
  console.log('🎬 Step 2: Converting image to video with RunPod...');

  // Step 2: Convert image to video using RunPod I2V
  const videoResponse = await fetch(`https://api.runpod.ai/v2/${RUNPOD_ENDPOINT_ID}/run`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RUNPOD_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      input: {
        image_url: imageUrl,
        prompt: prompt,
        negative_prompt: requestData.negative_prompt || 'low quality, blurry, deformed',
        length: requestData.num_frames || 72,
        width: requestData.width || 512,
        height: requestData.height || 512,
        fps: requestData.fps || 24,
        motion_scale: requestData.motion_scale || 0.4,
        cfg: requestData.guidance_scale || 4.5,
        steps: requestData.steps || 100,
        seed: requestData.seed || Math.floor(Math.random() * 1000000)
      }
    })
  });

  if (!videoResponse.ok) {
    throw new Error(`RunPod video generation failed: ${videoResponse.status}`);
  }

  const videoData = await videoResponse.json();
  const jobId = videoData.id;

  return {
    provider: 'RunPod Serverless (2-step: T2I → I2V)',
    jobId: jobId,
    message: 'Video generation started. Poll /runpod-check-status?jobId=' + jobId,
    sourceImage: imageUrl,
    estimatedTime: '1-3 minutes'
  };
}
