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
      style, // 'realistic' or 'anime'
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
      setting,
      style
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
    setting,
    style
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

  // Build full prompt based on style
  const isAnime = style === 'anime';

  let fullPrompt;

  if (isAnime) {
    // Anime-specific prompt structure
    fullPrompt = `
Anime art style, hentai aesthetic. ${appearance}. ${action || 'smiling at camera, gentle head movement'}.

Setting: ${setting || 'indoor lighting, soft background'}.

High quality anime video, smooth fluid animation, cel shaded, vibrant colors,
detailed anime facial features, expressive large eyes, stylized proportions,
anime line art, 2D animation style, explicit hentai content, uncensored,
smooth motion, professional anime quality.
    `.trim();
  } else {
    // Realistic prompt structure
    fullPrompt = `
Photorealistic style. ${appearance}. ${action || 'smiling at camera, gentle head movement'}.

Setting: ${setting || 'indoor lighting, soft background'}.

High quality, professional video, smooth motion, realistic skin texture,
detailed facial features, photorealistic, 8K quality, natural lighting,
cinematic camera movement, explicit NSFW content, uncensored.
    `.trim();
  }

  console.log('📝 Built prompt (style: ' + (isAnime ? 'anime' : 'realistic') + '):', fullPrompt);

  return fullPrompt;
}

// Generate with fal.ai - Async with job polling
async function generateWithFal(prompt, requestData) {
  const FAL_API_KEY = process.env.FAL_API_KEY_SELIRA || process.env.FAL_API_KEY;

  if (!FAL_API_KEY) {
    throw new Error('Fal.ai API key not configured. Set FAL_API_KEY_SELIRA in environment variables');
  }

  console.log('🎬 Starting Fal.ai Kling video generation...');

  // Submit the job
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
    const errorText = await response.text();
    console.error('❌ Fal.ai API error:', errorText);
    throw new Error(`fal.ai API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log('✅ Fal.ai job started:', data);

  // Fal.ai returns request_id for async polling
  const requestId = data.request_id;

  if (!requestId) {
    throw new Error('No request_id returned from Fal.ai');
  }

  // Return job ID immediately for async polling
  return {
    provider: 'Fal.ai (Kling AI)',
    status: 'processing',
    jobId: requestId,
    message: 'Video generation started. Poll for status with job ID.',
    estimatedTime: '1-3 minutes',
    cost: '$0.50'
  };
}

// Generate with Replicate (Hunyuan Video) - Async with job ID
async function generateWithReplicate(prompt, requestData) {
  const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN_SELIRA;

  if (!REPLICATE_API_TOKEN) {
    throw new Error('Replicate API token not configured. Set REPLICATE_API_TOKEN_SELIRA');
  }

  console.log('🎬 Starting Replicate Hunyuan video generation...');
  console.log('📊 Parameters:', {
    video_length: requestData.video_length || 129,
    infer_steps: requestData.infer_steps || 50,
    guidance_scale: requestData.guidance_scale || 6,
    fps: requestData.fps || 24
  });

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
        video_length: requestData.video_length || 129, // Now controllable from UI
        infer_steps: requestData.infer_steps || 50, // Now controllable from UI
        embedded_guidance_scale: requestData.guidance_scale || 6, // Now controllable from UI
        fps: requestData.fps || 24, // Now controllable from UI
        seed: requestData.seed || Math.floor(Math.random() * 1000000)
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Replicate API error:', errorText);
    throw new Error(`Replicate API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log('✅ Replicate job started:', data.id);

  // Return job ID immediately for async polling
  return {
    provider: 'Replicate (Hunyuan Video)',
    status: 'processing',
    jobId: data.id,
    predictionUrl: data.urls.get,
    message: 'Video generation started. Poll for status with job ID.',
    estimatedTime: '2-5 minutes',
    cost: '~$1.25'
  };
}

// Generate with RunPod (Two-step: Text-to-Image → Image-to-Video)
async function generateWithRunPod(prompt, requestData) {
  const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY_SELIRA || process.env.RUNPOD_API_KEY;
  const RUNPOD_ENDPOINT_ID = process.env.RUNPOD_ENDPOINT_ID_SELIRA || process.env.RUNPOD_ENDPOINT_ID || process.env.RUNPOD_ANIMATEDIFF_ENDPOINT_ID;

  console.log('🎨 Step 1: Generating image from companion traits...');

  // Step 1: Generate image using PromptChan
  const imagePrompt = prompt.replace(/video/gi, 'photo').replace(/motion/gi, 'pose').replace(/movement/gi, 'pose');

  // Build PromptChan request
  const promptchanRequest = {
    prompt: imagePrompt,
    negative_prompt: requestData.negative_prompt || 'low quality, blurry, distorted, deformed, clothes, clothing, censored',
    style: 'Photo XL+ v2', // Realistic style for companion images
    quality: 'Ultra',
    image_size: '512x512',
    creativity: 50,
    seed: -1,
    filter: 'None', // Fully uncensored
    emotion: 'Default',
    detail: 0
  };

  console.log('📝 PromptChan request:', JSON.stringify(promptchanRequest, null, 2));

  const imageResponse = await fetch('https://prod.aicloudnetservices.com/api/external/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.PROMPTCHAN_API_KEY_SELIRA
    },
    body: JSON.stringify(promptchanRequest)
  });

  if (!imageResponse.ok) {
    const errorText = await imageResponse.text();
    console.error('❌ PromptChan API error:', errorText);
    throw new Error(`Image generation failed: ${imageResponse.status} - ${errorText}`);
  }

  const imageData = await imageResponse.json();
  console.log('✅ PromptChan response:', JSON.stringify(imageData, null, 2));

  // PromptChan returns { image: "url", gems: number, ... }
  const imageUrl = imageData.image;

  if (!imageUrl) {
    console.error('❌ No image URL in response:', imageData);
    throw new Error('No image URL returned from PromptChan');
  }

  console.log('✅ Image generated:', imageUrl);
  console.log('🎬 Step 2: Converting image to video with RunPod...');

  if (!RUNPOD_API_KEY || !RUNPOD_ENDPOINT_ID) {
    throw new Error('RunPod credentials not configured. Set RUNPOD_API_KEY_SELIRA and RUNPOD_ENDPOINT_ID_SELIRA');
  }

  console.log('📡 RunPod Endpoint ID:', RUNPOD_ENDPOINT_ID);
  console.log('📡 RunPod API Key configured:', RUNPOD_API_KEY ? 'Yes' : 'No');

  // Step 2: Convert image to video using RunPod I2V
  const runpodInput = {
    input: {
      image_url: imageUrl,
      prompt: prompt,
      negative_prompt: requestData.negative_prompt || 'low quality, blurry, deformed',
      length: requestData.num_frames || 72,
      width: 512,
      height: 512,
      fps: requestData.fps || 24,
      motion_scale: requestData.motion_scale || 0.4,
      cfg: requestData.guidance_scale || 4.5,
      steps: requestData.steps || 100,
      seed: requestData.seed || Math.floor(Math.random() * 1000000)
    }
  };

  console.log('📝 RunPod input:', JSON.stringify(runpodInput, null, 2));

  const videoResponse = await fetch(`https://api.runpod.ai/v2/${RUNPOD_ENDPOINT_ID}/run`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RUNPOD_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(runpodInput)
  });

  console.log('📊 RunPod response status:', videoResponse.status);

  if (!videoResponse.ok) {
    const errorText = await videoResponse.text();
    console.error('❌ RunPod API error:', errorText);
    throw new Error(`RunPod video generation failed: ${videoResponse.status} - ${errorText}`);
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
