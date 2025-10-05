const fetch = require('node-fetch');

async function check() {
  console.log('🔍 Checking for companions without avatars...\n');

  // Get ALL companions with pagination
  let allCompanions = [];
  let offset = null;
  let batchNumber = 1;

  while (true) {
    let url = 'https://selira.ai/.netlify/functions/selira-characters?limit=200&includePrivate=true';
    if (offset) {
      url += `&offset=${offset}`;
    }

    const response = await fetch(url);
    if (!response.ok) {
      console.log(`❌ HTTP error: ${response.status}`);
      break;
    }

    const data = await response.json();
    console.log(`Batch ${batchNumber}: ${data.characters.length} companions, offset: ${data.offset || 'null'}`);

    if (!data.characters || data.characters.length === 0) {
      break;
    }

    allCompanions.push(...data.characters);

    if (!data.offset) {
      break;
    }

    offset = data.offset;
    batchNumber++;
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`\nTotal companions: ${allCompanions.length}`);

  const withoutAvatar = allCompanions.filter(c => !c.avatar_url || c.avatar_url === '' || c.avatar_url === null);
  console.log('Without avatar_url:', withoutAvatar.length);

  if (withoutAvatar.length > 0) {
    console.log('\nCompanions without avatar:');
    withoutAvatar.forEach((c, i) => {
      console.log(`  ${i+1}. ${c.name} (${c.slug})`);
      console.log(`     avatar_url: "${c.avatar_url}"`);
    });
  }

  const withPlaceholder = allCompanions.filter(c => c.avatar_url && c.avatar_url.includes('placeholder'));
  console.log('\nWith placeholder:', withPlaceholder.length);

  const withReplicate = allCompanions.filter(c => c.avatar_url && c.avatar_url.includes('replicate.delivery'));
  console.log('With replicate URL:', withReplicate.length);
}

check().catch(console.error);
