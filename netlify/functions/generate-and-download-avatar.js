// Generate avatar via Replicate API and immediately download to GitHub
// This function is called immediately after companion creation
const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { companionId, slug, name, traits } = JSON.parse(event.body);

    if (!companionId || !slug || !name || !traits) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }

    console.log(`🎨 Generating avatar for ${name} (${slug})`);

    // 1. Generate avatar via selira-generate-custom-image
    const { style, sex, ethnicity, hairLength, hairColor } = traits;

    const clothing = style === 'anime'
      ? 'revealing school uniform'
      : 'ultra-revealing lingerie';

    const avatarPrompt = style === 'anime'
      ? `very attractive face, extremely seductive expression, detailed anime art, wearing ${clothing}, vibrant colors, high quality anime artwork, single character, solo, bedroom background, intimate setting, seductive atmosphere`
      : `attractive face, seductive expression, alluring pose, wearing ${clothing}, photorealistic, professional photography, soft romantic lighting, glamour photography style, eye contact, sharp focus, attractive model, single person, solo, bedroom background, intimate atmosphere`;

    const genResponse = await fetch('https://selira.ai/.netlify/functions/selira-generate-custom-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customPrompt: avatarPrompt,
        characterName: name,
        category: style === 'anime' ? 'anime-manga' : 'realistic',
        style: style,
        shotType: 'portrait',
        sex: sex,
        ethnicity: ethnicity,
        hairLength: hairLength,
        hairColor: hairColor,
        skipAutoDownload: true
      })
    });

    if (!genResponse.ok) {
      throw new Error(`Avatar generation failed: ${genResponse.status}`);
    }

    const genResult = await genResponse.json();
    if (!genResult.success || !genResult.imageUrl) {
      throw new Error('No image URL returned from generator');
    }

    const replicateUrl = genResult.imageUrl;
    console.log(`✅ Generated Replicate URL: ${replicateUrl.substring(0, 60)}...`);

    // 2. Download image immediately
    console.log('📥 Downloading image...');
    const imageResponse = await fetch(replicateUrl);

    if (!imageResponse.ok) {
      throw new Error(`Download failed: ${imageResponse.status}`);
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const timestamp = Date.now();
    const extension = replicateUrl.includes('.webp') ? 'webp' : 'png';
    const filename = `${slug}-${timestamp}.${extension}`;

    // 3. Upload to GitHub immediately
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const GITHUB_OWNER = process.env.GITHUB_OWNER || 'narrinai';
    const GITHUB_REPO = process.env.GITHUB_REPO || 'Selira-AI';

    if (!GITHUB_TOKEN) {
      throw new Error('GITHUB_TOKEN not configured');
    }

    console.log('📤 Uploading to GitHub...');
    const base64Image = Buffer.from(imageBuffer).toString('base64');
    const githubUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/avatars/${filename}`;

    const githubResponse = await fetch(githubUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `Add avatar for ${name}`,
        content: base64Image,
        branch: 'main'
      })
    });

    if (!githubResponse.ok) {
      const errorText = await githubResponse.text();
      throw new Error(`GitHub upload failed: ${githubResponse.status} - ${errorText}`);
    }

    console.log(`✅ Uploaded to GitHub: avatars/${filename}`);

    // 4. Update Airtable with local URL
    const localUrl = `https://selira.ai/avatars/${filename}`;

    const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN_SELIRA || process.env.AIRTABLE_TOKEN;
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID_SELIRA || process.env.AIRTABLE_BASE_ID;

    const updateResponse = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Characters/${companionId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: {
          Avatar_URL: localUrl,
          Visibility: 'public' // Make visible now that avatar is ready
        }
      })
    });

    if (!updateResponse.ok) {
      throw new Error(`Airtable update failed: ${updateResponse.status}`);
    }

    console.log(`✅ Updated Airtable with local URL`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        companionId: companionId,
        slug: slug,
        localUrl: localUrl,
        message: 'Avatar generated and downloaded successfully'
      })
    };

  } catch (error) {
    console.error('❌ Generate and download error:', error);
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
