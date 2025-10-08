/**
 * Download Avatar from Replicate URL
 * Saves avatar to /avatars/ folder via GitHub API
 */

const https = require('https');
const http = require('http');
const fetch = require('node-fetch');

async function downloadImage(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    protocol.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }

      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    }).on('error', reject);
  });
}

exports.handler = async (event, context) => {
  console.log('📥 Download avatar function called');

  // CORS headers
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
    const { imageUrl, filename } = JSON.parse(event.body || '{}');

    if (!imageUrl || !filename) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'imageUrl and filename are required' })
      };
    }

    console.log(`📥 Downloading: ${filename}`);
    console.log(`🔗 From: ${imageUrl.substring(0, 60)}...`);

    // Download image
    const imageBuffer = await downloadImage(imageUrl);
    console.log(`✅ Downloaded ${imageBuffer.length} bytes`);

    // We don't need to save locally - just upload to GitHub directly
    console.log(`📦 Image ready for GitHub upload`);

    // Generate local URL (will work after GitHub upload)
    const localUrl = `https://selira.ai/avatars/${filename}`;

    // Upload to GitHub via API (persistent storage)
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN_SELIRA || process.env.GITHUB_TOKEN;
    const GITHUB_OWNER = process.env.GITHUB_OWNER || 'narrinai';
    const GITHUB_REPO = process.env.GITHUB_REPO || 'Selira-AI';

    console.log('🔑 GitHub config check:', {
      hasToken: !!GITHUB_TOKEN,
      tokenPrefix: GITHUB_TOKEN ? GITHUB_TOKEN.substring(0, 4) + '...' : 'none',
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO
    });

    if (GITHUB_TOKEN) {
      try {
        console.log('📤 Uploading to GitHub via API...');

        // Convert buffer to base64
        const base64Image = imageBuffer.toString('base64');
        const githubUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/avatars/${filename}`;

        const githubResponse = await fetch(githubUrl, {
          method: 'PUT',
          headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: `Auto-save avatar: ${filename}`,
            content: base64Image,
            branch: 'main'
          })
        });

        if (githubResponse.ok) {
          console.log('✅ Uploaded to GitHub successfully');

          // Trigger Netlify deploy to make avatar available immediately
          const NETLIFY_BUILD_HOOK = process.env.NETLIFY_BUILD_HOOK;
          if (NETLIFY_BUILD_HOOK) {
            try {
              console.log('🚀 Triggering Netlify deploy...');
              await fetch(NETLIFY_BUILD_HOOK, { method: 'POST' });
              console.log('✅ Netlify deploy triggered');
            } catch (deployError) {
              console.log('⚠️ Failed to trigger deploy (non-critical):', deployError.message);
            }
          }
        } else {
          const errorText = await githubResponse.text();
          console.log(`⚠️ GitHub upload failed: ${githubResponse.status}`);
          console.log(`   Error: ${errorText.substring(0, 200)}`);
        }
      } catch (githubError) {
        console.log('⚠️ GitHub upload failed (non-critical):', githubError.message);
      }
    } else {
      console.log('⚠️ GITHUB_TOKEN not configured - avatar not saved persistently');
    }

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        localUrl: localUrl,
        filename: filename,
        size: imageBuffer.length
      })
    };

  } catch (error) {
    console.error('❌ Download error:', error);

    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: error.message || 'Failed to download avatar'
      })
    };
  }
};
