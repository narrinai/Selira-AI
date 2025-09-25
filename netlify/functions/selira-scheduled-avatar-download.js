// Scheduled function to automatically download Replicate avatars
// Runs every 2 hours to check for new Replicate URLs and download them

const { schedule } = require('@netlify/functions');
const fetch = require('node-fetch');

const downloadAvatars = async () => {
  console.log('⏰ Scheduled avatar download started at:', new Date().toISOString());

  try {
    // Call our main download function internally (same logic)
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID_SELIRA || process.env.AIRTABLE_BASE_ID || process.env.AIRTABLE_BASE;
    const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN_SELIRA || process.env.AIRTABLE_TOKEN;

    if (!AIRTABLE_BASE_ID || !AIRTABLE_TOKEN) {
      throw new Error('Missing Airtable configuration');
    }

    // Find all characters with Replicate URLs
    console.log('🔍 Checking for Replicate URLs...');
    const filterFormula = encodeURIComponent("FIND('replicate.delivery', {Avatar_URL})");

    const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Characters?filterByFormula=${filterFormula}&fields[]=Name&fields[]=Slug&fields[]=Avatar_URL&maxRecords=10`, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Airtable fetch failed: ${response.statusText}`);
    }

    const data = await response.json();
    const charactersFound = data.records.length;

    console.log(`📊 Found ${charactersFound} characters with Replicate URLs`);

    if (charactersFound > 0) {
      // Trigger the download function if we found any
      console.log('🚀 Triggering avatar download process...');

      const downloadUrl = `${process.env.URL || 'https://selira.ai'}/.netlify/functions/selira-auto-download-avatars`;

      const downloadResponse = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Netlify-Scheduled-Function'
        }
      });

      const downloadResult = await downloadResponse.json();

      console.log('📊 Download process result:', downloadResult.stats);

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: `Scheduled avatar download completed - processed ${downloadResult.stats?.successful || 0} avatars`,
          stats: downloadResult.stats,
          timestamp: new Date().toISOString()
        })
      };
    } else {
      console.log('✅ No Replicate URLs found - nothing to download');
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: 'No new avatars to download',
          stats: { total: 0, successful: 0, failed: 0 },
          timestamp: new Date().toISOString()
        })
      };
    }

  } catch (error) {
    console.error('❌ Scheduled avatar download error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Scheduled function failed',
        details: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};

// Schedule to run every 2 hours (0 */2 * * *)
// This will automatically check for and download new avatars
const handler = schedule('0 */2 * * *', downloadAvatars);

module.exports = { handler };