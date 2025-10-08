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

    // Upload to ImgBB (instant availability, free API key)
    console.log(`📦 Uploading to ImgBB for instant availability...`);

    const IMGBB_API_KEY = process.env.IMGBB_API_KEY;
    let finalUrl = null;

    if (IMGBB_API_KEY) {
      try {
        const base64Image = imageBuffer.toString('base64');

        // ImgBB requires form data
        const formData = new URLSearchParams();
        formData.append('key', IMGBB_API_KEY);
        formData.append('image', base64Image);
        formData.append('name', filename);

        const imgbbResponse = await fetch('https://api.imgbb.com/1/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData
        });

        if (imgbbResponse.ok) {
          const imgbbData = await imgbbResponse.json();
          if (imgbbData.success && imgbbData.data && imgbbData.data.url) {
            finalUrl = imgbbData.data.url;
            console.log('✅ Uploaded to ImgBB successfully:', finalUrl);
          } else {
            console.log('⚠️ ImgBB upload succeeded but no URL returned');
          }
        } else {
          const errorText = await imgbbResponse.text();
          console.log(`⚠️ ImgBB upload failed: ${imgbbResponse.status}`);
          console.log(`   Error: ${errorText.substring(0, 200)}`);
        }
      } catch (imgbbError) {
        console.log('⚠️ ImgBB upload failed:', imgbbError.message);
      }
    } else {
      console.log('⚠️ IMGBB_API_KEY not configured');
    }

    // Fallback: also upload to GitHub for backup (async, non-blocking)
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN_SELIRA || process.env.GITHUB_TOKEN;
    const GITHUB_OWNER = process.env.GITHUB_OWNER || 'narrinai';
    const GITHUB_REPO = process.env.GITHUB_REPO || 'Selira-AI';

    if (GITHUB_TOKEN) {
      // Upload to GitHub in background (don't wait for it)
      fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/avatars/${filename}`, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Backup avatar: ${filename}`,
          content: imageBuffer.toString('base64'),
          branch: 'main'
        })
      }).then(() => console.log('✅ Backup to GitHub complete')).catch(e => console.log('⚠️ GitHub backup failed'));
    }

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        localUrl: finalUrl || `https://selira.ai/avatars/${filename}`,
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
