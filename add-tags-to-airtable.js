/**
 * Add new tags to Airtable Tags table
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

async function addTagsToAirtable() {
  console.log('🏷️  Adding new tags to Airtable...\n');

  // Flatten all tags
  const allTags = [
    ...newTags.female,
    ...newTags.male,
    ...newTags.universal
  ];

  console.log(`📊 Total tags to add: ${allTags.length}`);
  console.log('Female-only:', newTags.female.length);
  console.log('Male-only:', newTags.male.length);
  console.log('Universal:', newTags.universal.length);
  console.log('');

  // Add tags in batches of 10 (Airtable API limit)
  const batchSize = 10;
  let successCount = 0;
  let errorCount = 0;

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
        console.log(`✅ Batch ${Math.floor(i / batchSize) + 1}: Added ${result.records.length} tags`);
        result.records.forEach(record => {
          console.log(`   - ${record.fields.Tag}`);
        });
      } else {
        const error = await response.json();
        console.error(`❌ Batch ${Math.floor(i / batchSize) + 1} failed:`, error.error.message);
        errorCount += batch.length;
      }

      // Wait 200ms between batches to avoid rate limits
      if (i + batchSize < allTags.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }

    } catch (error) {
      console.error(`❌ Error adding batch:`, error.message);
      errorCount += batch.length;
    }
  }

  console.log('\n📊 Summary:');
  console.log(`✅ Successfully added: ${successCount} tags`);
  console.log(`❌ Failed: ${errorCount} tags`);
  console.log('\n🎉 Done!');
}

addTagsToAirtable().catch(console.error);
