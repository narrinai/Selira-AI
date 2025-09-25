// Scheduled function to automatically download Replicate avatars
// Runs every hour to check for new Replicate URLs and download them

const { schedule } = require('@netlify/functions');

const downloadAvatars = async () => {
  console.log('⏰ Scheduled avatar download started');

  try {
    // Call our main download function
    const downloadUrl = `${process.env.URL || 'https://selira.ai'}/.netlify/functions/selira-auto-download-avatars`;

    const response = await fetch(downloadUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Add auth header if needed for internal calls
        'User-Agent': 'Netlify-Scheduled-Function'
      }
    });

    const result = await response.json();

    console.log('📊 Scheduled download result:', result);

    if (!result.success) {
      console.error('❌ Scheduled download failed:', result.error);
      return {
        statusCode: 500,
        body: JSON.stringify({
          success: false,
          error: 'Scheduled download failed',
          details: result.error
        })
      };
    }

    console.log(`✅ Scheduled download completed: ${result.stats?.successful || 0} avatars processed`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Scheduled avatar download completed',
        stats: result.stats
      })
    };

  } catch (error) {
    console.error('❌ Scheduled avatar download error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Scheduled function failed',
        details: error.message
      })
    };
  }
};

// Schedule to run every hour (0 * * * *)
// For testing, you could use every 5 minutes: */5 * * * *
const handler = schedule('0 * * * *', downloadAvatars);

module.exports = { handler };