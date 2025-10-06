// Check companion data directly from Airtable
const fetch = require('node-fetch');
require('dotenv').config();

async function checkCompanion(slug) {
  console.log(`🔍 Checking companion via API: ${slug}`);

  const response = await fetch(`https://selira.ai/.netlify/functions/selira-characters?limit=100`);

  if (!response.ok) {
    console.error(`❌ API error: ${response.status}`);
    return;
  }

  const data = await response.json();
  const companion = data.characters.find(c => c.slug === slug || c.name.toLowerCase().includes(slug.toLowerCase()));

  if (!companion) {
    console.log(`❌ No companion found with slug/name: ${slug}`);
    return;
  }

  console.log(`\n📋 Companion Data (via selira-characters API):`);
  console.log(`   Name: "${companion.name}"`);
  console.log(`   Slug: "${companion.slug}"`);
  console.log(`   companion_type: "${companion.companion_type}" (type: ${typeof companion.companion_type})`);
  console.log(`   Category: "${companion.category}"`);
  console.log(`   sex: "${companion.sex}"`);
  console.log(`   ethnicity: "${companion.ethnicity}"`);
  console.log(`   hair_length: "${companion.hair_length}"`);
  console.log(`   hair_color: "${companion.hair_color}"`);
  console.log(`   avatar_url: "${companion.avatar_url ? companion.avatar_url.substring(0, 60) + '...' : 'NONE'}"`);
  console.log(`\n✅ Done!`);
}

// Check Mona Hirose
const slug = process.argv[2] || 'mona-hirose';
checkCompanion(slug).catch(console.error);
