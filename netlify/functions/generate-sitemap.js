// netlify/functions/generate-sitemap.js
// This function generates the complete sitemap including all character chat URLs
exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/xml'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    console.log('🗺️ Generating sitemap...');

    const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN_SELIRA;
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID_SELIRA;

    if (!AIRTABLE_TOKEN || !AIRTABLE_BASE_ID) {
      throw new Error('Missing Airtable credentials');
    }

    // Fetch all public characters
    let allRecords = [];
    let offset = null;

    do {
      let url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Characters`;
      const params = new URLSearchParams();

      // Only include public characters with a Slug
      params.set('filterByFormula', `AND(OR({Visibility} = "public", {Visibility} = "", NOT({Visibility})), {Slug} != "")`);

      if (offset) {
        params.set('offset', offset);
      }

      url += `?${params.toString()}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Airtable API error: ${response.status}`);
      }

      const data = await response.json();
      if (data.records) {
        allRecords = allRecords.concat(data.records);
      }

      offset = data.offset;
    } while (offset);

    console.log(`✅ Retrieved ${allRecords.length} characters for sitemap`);

    // Current date in ISO format for lastmod
    const today = new Date().toISOString().split('T')[0];

    // Start building XML
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">

  <!-- Homepage -->
  <url>
    <loc>https://selira.ai/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>

  <!-- Main Pages -->
  <url>
    <loc>https://selira.ai/chat</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>

  <url>
    <loc>https://selira.ai/create</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>

  <url>
    <loc>https://selira.ai/free-nsfw-image-generator</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>

  <url>
    <loc>https://selira.ai/search-results</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>

  <url>
    <loc>https://selira.ai/tags</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>

  <!-- Popular Tag Pages -->
  <url>
    <loc>https://selira.ai/tags/angel</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>

  <url>
    <loc>https://selira.ai/tags/boss</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>

  <url>
    <loc>https://selira.ai/tags/boyfriend</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>

  <url>
    <loc>https://selira.ai/tags/cute</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>

  <url>
    <loc>https://selira.ai/tags/ex</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>

  <url>
    <loc>https://selira.ai/tags/fantasy</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>

  <url>
    <loc>https://selira.ai/tags/flirty</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>

  <url>
    <loc>https://selira.ai/tags/girlfriend</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>

  <url>
    <loc>https://selira.ai/tags/lesbian</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>

  <url>
    <loc>https://selira.ai/tags/maid</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>

  <url>
    <loc>https://selira.ai/tags/monster</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>

  <url>
    <loc>https://selira.ai/tags/romance</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>

  <url>
    <loc>https://selira.ai/tags/secretary</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>

  <url>
    <loc>https://selira.ai/tags/seductive</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>

  <url>
    <loc>https://selira.ai/tags/student</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>

  <url>
    <loc>https://selira.ai/tags/submissive</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>

  <url>
    <loc>https://selira.ai/tags/teacher</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>

  <url>
    <loc>https://selira.ai/tags/tsundere</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>

  <url>
    <loc>https://selira.ai/tags/yandere</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>

  <url>
    <loc>https://selira.ai/tags/romantic</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>

  <url>
    <loc>https://selira.ai/pricing</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>

  <url>
    <loc>https://selira.ai/profile</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>

  <url>
    <loc>https://selira.ai/my-companions</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>

  <!-- Content Pages -->
  <url>
    <loc>https://selira.ai/news</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>

  <!-- News Articles -->
  <url>
    <loc>https://selira.ai/news/adult-ai-conversations-ethics.html</loc>
    <lastmod>2025-09-25T12:00:00+00:00</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>

  <url>
    <loc>https://selira.ai/news/ai-chatbot-personalization.html</loc>
    <lastmod>2025-09-25T12:00:00+00:00</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>

  <url>
    <loc>https://selira.ai/news/ai-companions-emotional-intelligence.html</loc>
    <lastmod>2025-09-25T12:00:00+00:00</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>

  <url>
    <loc>https://selira.ai/news/character-chat-psychology.html</loc>
    <lastmod>2025-09-25T12:00:00+00:00</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>

  <url>
    <loc>https://selira.ai/news/chatbot-revolution-2025.html</loc>
    <lastmod>2025-09-25T12:00:00+00:00</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>

  <url>
    <loc>https://selira.ai/news/my-ai-companion-journey.html</loc>
    <lastmod>2025-09-25T12:00:00+00:00</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>

  <url>
    <loc>https://selira.ai/news/rise-of-ai-companions-selira.html</loc>
    <lastmod>2025-09-25T12:00:00+00:00</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>

  <url>
    <loc>https://selira.ai/news/ai-companions-mental-clarity.html</loc>
    <lastmod>2025-09-25T12:00:00+00:00</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>

  <url>
    <loc>https://selira.ai/news/digital-minimalism-mental-clarity.html</loc>
    <lastmod>2025-09-25T12:00:00+00:00</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>

  <url>
    <loc>https://selira.ai/news/companionguide-ai-platform-review.html</loc>
    <lastmod>2025-09-25T12:00:00+00:00</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>

  <url>
    <loc>https://selira.ai/news/future-ai-companions-mental-wellness.html</loc>
    <lastmod>2025-09-25T12:00:00+00:00</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>

  <url>
    <loc>https://selira.ai/news/from-anxiety-to-clarity-user-journey.html</loc>
    <lastmod>2025-09-25T12:00:00+00:00</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>

  <url>
    <loc>https://selira.ai/news/science-behind-thought-organization.html</loc>
    <lastmod>2025-09-25T12:00:00+00:00</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>

  <url>
    <loc>https://selira.ai/news/daily-habits-mental-clarity.html</loc>
    <lastmod>2025-09-25T12:00:00+00:00</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>

  <url>
    <loc>https://selira.ai/news/research-ai-conversations-emotional-processing.html</loc>
    <lastmod>2025-09-25T12:00:00+00:00</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>

  <!-- Support Pages -->
  <url>
    <loc>https://selira.ai/contact</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>

  <!-- Legal Pages -->
  <url>
    <loc>https://selira.ai/privacy-policy</loc>
    <lastmod>${today}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>

  <url>
    <loc>https://selira.ai/terms-and-conditions</loc>
    <lastmod>${today}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>

  <!-- Individual Character Chat Pages -->
`;

    // Add all character URLs
    allRecords.forEach(record => {
      const fields = record.fields || {};
      const slug = fields.Slug;
      const name = fields.Name || 'Unknown';

      if (slug) {
        xml += `  <url>
    <loc>https://selira.ai/chat?companion=${slug}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>

`;
      }
    });

    xml += `</urlset>`;

    console.log(`✅ Sitemap generated with ${allRecords.length} character URLs`);

    return {
      statusCode: 200,
      headers,
      body: xml
    };

  } catch (error) {
    console.error('💥 Sitemap generation error:', error);

    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};
