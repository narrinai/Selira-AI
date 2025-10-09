/**
 * Netlify Function to add new tags to Airtable
 * Call: https://selira.ai/.netlify/functions/add-new-tags
 */

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN_SELIRA || process.env.AIRTABLE_TOKEN;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || 'appij4FrojvJ9m5wu';

const newTags = {
  female: [
    'mommy', 'wife', 'milf', 'sister', 'daughter', 'step-mom', 'step-sister',
    'dominatrix', 'princess', 'nurse', 'bunny girl'
  ],
  male: [
    'daddy', 'husband', 'dilf', 'brother', 'son', 'step-dad', 'step-brother',
    'gay', 'prince', 'warrior', 'knight', 'ceo', 'master'
  ],
  universal: [
    'dominant', 'switch', 'shy', 'confident', 'playful', 'mysterious', 'romantic',
    'jealous', 'childhood friend', 'roommate', 'neighbor', 'coworker', 'vampire',
    'demon', 'alien', 'celebrity', 'idol', 'gamer'
  ]
};

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  console.log('🏷️  Adding new tags to Airtable...');

  // Flatten all tags
  const allTags = [
    ...newTags.female,
    ...newTags.male,
    ...newTags.universal
  ];

  console.log(`📊 Total tags to add: ${allTags.length}`);

  // Add tags in batches of 10 (Airtable API limit)
  const batchSize = 10;
  let successCount = 0;
  let errorCount = 0;
  const results = [];

  for (let i = 0; i < allTags.length; i += batchSize) {
    const batch = allTags.slice(i, i + batchSize);

    const records = batch.map(tag => ({
      fields: {
        'Tag': tag,
        'Status': 'Active'
      }
    }));

    try {
      const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Tags`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ records })
      });

      if (response.ok) {
        const result = await response.json();
        successCount += result.records.length;
        const batchNum = Math.floor(i / batchSize) + 1;
        console.log(`✅ Batch ${batchNum}: Added ${result.records.length} tags`);

        result.records.forEach(record => {
          console.log(`   - ${record.fields.Tag}`);
          results.push({ tag: record.fields.Tag, status: 'success' });
        });
      } else {
        const error = await response.json();
        const batchNum = Math.floor(i / batchSize) + 1;
        console.error(`❌ Batch ${batchNum} failed:`, error.error?.message || error);
        errorCount += batch.length;

        batch.forEach(tag => {
          results.push({ tag, status: 'error', error: error.error?.message || 'Unknown error' });
        });
      }

      // Wait 200ms between batches to avoid rate limits
      if (i + batchSize < allTags.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }

    } catch (error) {
      console.error(`❌ Error adding batch:`, error.message);
      errorCount += batch.length;

      batch.forEach(tag => {
        results.push({ tag, status: 'error', error: error.message });
      });
    }
  }

  const summary = {
    total: allTags.length,
    success: successCount,
    failed: errorCount,
    breakdown: {
      female: newTags.female.length,
      male: newTags.male.length,
      universal: newTags.universal.length
    },
    results
  };

  console.log('📊 Summary:', summary);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(summary)
  };
};
