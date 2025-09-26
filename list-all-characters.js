require('dotenv').config();
const fetch = require('node-fetch');

async function listAllCharacters() {
  try {
    console.log('📋 Listing all characters in Airtable...');

    // Get all characters from Airtable
    const response = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Characters?maxRecords=1000`, {
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`📊 Total characters in Airtable: ${data.records.length}`);

    console.log('\n📋 All characters with their slugs and avatar status:');

    let hasAvatar = 0;
    let noAvatar = 0;

    data.records.forEach((record, index) => {
      const fields = record.fields;
      const name = fields.Name || 'NO NAME';
      const slug = fields.Slug || 'NO SLUG';
      const avatarUrl = fields.Avatar_URL;

      const hasAvatarUrl = avatarUrl && avatarUrl.trim() !== '';
      if (hasAvatarUrl) {
        hasAvatar++;
      } else {
        noAvatar++;
      }

      console.log(`${index + 1}. ${name}`);
      console.log(`   Slug: ${slug}`);
      console.log(`   Avatar: ${hasAvatarUrl ? '✅' : '❌'} ${avatarUrl || 'EMPTY'}`);
      console.log(`   Record ID: ${record.id}`);
      console.log('');
    });

    console.log(`\n📊 Summary:`);
    console.log(`✅ Characters with avatars: ${hasAvatar}`);
    console.log(`❌ Characters without avatars: ${noAvatar}`);
    console.log(`📊 Total: ${hasAvatar + noAvatar}`);

    // Look specifically for characters that might match the screenshot
    console.log('\n🔍 Looking for characters that might match screenshot names...');
    const possibleMatches = [];

    data.records.forEach(record => {
      const fields = record.fields;
      const name = (fields.Name || '').toLowerCase();
      const slug = (fields.Slug || '').toLowerCase();

      if (name.includes('kai') || name.includes('nakamura') ||
          name.includes('emma') || name.includes('heartwell') ||
          name.includes('zara') || name.includes('kat') ||
          name.includes('test') || name.includes('luna')) {
        possibleMatches.push({
          name: fields.Name,
          slug: fields.Slug,
          avatarUrl: fields.Avatar_URL,
          recordId: record.id
        });
      }
    });

    if (possibleMatches.length > 0) {
      console.log('Possible matches found:');
      possibleMatches.forEach(match => {
        console.log(`- ${match.name} (${match.slug}) - Avatar: ${match.avatarUrl ? '✅' : '❌'}`);
      });
    } else {
      console.log('No possible matches found for screenshot characters.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

listAllCharacters();