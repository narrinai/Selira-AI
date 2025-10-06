/**
 * Download Avatar from Replicate URL
 * Saves avatar to /avatars/ folder via GitHub commit
 */

const https = require('https');
const http = require('http');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

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

    // Save to /tmp first (Netlify functions have /tmp writable)
    const tmpPath = path.join('/tmp', filename);
    fs.writeFileSync(tmpPath, imageBuffer);
    console.log(`💾 Saved to temp: ${tmpPath}`);

    // Determine the avatars directory path
    // In build context, we want to write to the site's avatars folder
    const avatarsDir = path.join(process.cwd(), 'avatars');

    // Ensure avatars directory exists
    if (!fs.existsSync(avatarsDir)) {
      fs.mkdirSync(avatarsDir, { recursive: true });
    }

    // Copy to avatars directory
    const finalPath = path.join(avatarsDir, filename);
    fs.copyFileSync(tmpPath, finalPath);
    console.log(`✅ Saved to: ${finalPath}`);

    // Generate local URL
    const localUrl = `https://selira.ai/avatars/${filename}`;

    // Try to commit via git (if in local environment)
    try {
      // Check if we're in a git repository
      const isGitRepo = fs.existsSync(path.join(process.cwd(), '.git'));

      if (isGitRepo) {
        console.log('📦 Committing to git...');

        // Add the file
        execSync(`git add "${finalPath}"`, { stdio: 'inherit' });

        // Commit
        execSync(`git commit -m "Auto-save avatar: ${filename}"`, { stdio: 'inherit' });

        // Push (if configured)
        try {
          execSync('git push origin main', { stdio: 'inherit' });
          console.log('✅ Pushed to GitHub');
        } catch (pushError) {
          console.log('⚠️ Git push skipped (not configured or failed)');
        }
      } else {
        console.log('ℹ️ Not a git repository, skipping git commit');
      }
    } catch (gitError) {
      console.log('⚠️ Git operations failed (non-critical):', gitError.message);
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
