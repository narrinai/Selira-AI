require('dotenv').config();
const fetch = require('node-fetch');

async function checkAllRecords() {
  try {
    console.log('🔍 Fetching ALL records from Characters table...');

    let allRecords = [];
    let offset = null;

    // Fetch all records with pagination
    do {
      const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Characters?maxRecords=100${offset ? `&offset=${offset}` : ''}`;

      console.log(`📋 Fetching batch from: ${url.substring(0, 80)}...`);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      allRecords = allRecords.concat(data.records);
      offset = data.offset;

      console.log(`   📊 Got ${data.records.length} records, total so far: ${allRecords.length}`);

    } while (offset);

    console.log(`\n📊 Total records fetched: ${allRecords.length}`);

    // Look for specific characters from screenshot
    const screenshotChars = [
      'kai-nakamura',
      'emma-heartwell',
      'zara',
      'kat',
      'test',
      'luna'
    ];

    console.log('\n🔍 Looking for screenshot characters in ALL records:');

    const foundChars = [];
    const missingChars = [];

    screenshotChars.forEach(targetSlug => {
      const found = allRecords.find(record => {
        const slug = record.fields.Slug;
        return slug === targetSlug;
      });

      if (found) {
        foundChars.push({
          name: found.fields.Name,
          slug: found.fields.Slug,
          avatarUrl: found.fields.Avatar_URL,
          status: found.fields.Status || 'NO STATUS FIELD',
          visibility: found.fields.Visibility || 'NO VISIBILITY FIELD',
          public: found.fields.Public || 'NO PUBLIC FIELD',
          recordId: found.id
        });
      } else {
        missingChars.push(targetSlug);
      }
    });

    if (foundChars.length > 0) {
      console.log('\n✅ Found characters:');
      foundChars.forEach(char => {
        console.log(`- ${char.name} (${char.slug})`);
        console.log(`  Avatar: ${char.avatarUrl || 'EMPTY'}`);
        console.log(`  Status: ${char.status}`);
        console.log(`  Visibility: ${char.visibility}`);
        console.log(`  Public: ${char.public}`);
        console.log(`  Record ID: ${char.recordId}`);
        console.log('');
      });
    }

    if (missingChars.length > 0) {
      console.log('\n❌ Missing characters:');
      missingChars.forEach(slug => console.log(`- ${slug}`));
    }

    // Check for characters with empty Avatar_URL regardless of status
    console.log('\n🔍 Checking for ALL characters with empty Avatar_URL...');

    const emptyAvatarChars = allRecords.filter(record => {
      const avatarUrl = record.fields.Avatar_URL;
      return !avatarUrl || avatarUrl.trim() === '';
    });

    console.log(`📊 Found ${emptyAvatarChars.length} characters with empty Avatar_URL:`);

    if (emptyAvatarChars.length > 0) {
      emptyAvatarChars.forEach((record, index) => {
        const fields = record.fields;
        console.log(`${index + 1}. ${fields.Name || 'NO NAME'} (${fields.Slug || 'NO SLUG'})`);
        console.log(`   Status: ${fields.Status || 'NO STATUS'}`);
        console.log(`   Visibility: ${fields.Visibility || 'NO VISIBILITY'}`);
        console.log(`   Public: ${fields.Public || 'NO PUBLIC'}`);
        console.log(`   Avatar_URL: "${fields.Avatar_URL || 'EMPTY'}"`);
        console.log(`   Record ID: ${record.id}`);
        console.log('');
      });

      // Generate avatars for these characters
      console.log('🎨 Starting avatar generation for empty Avatar_URL characters...');

      for (let i = 0; i < emptyAvatarChars.length; i++) {
        const record = emptyAvatarChars[i];
        const fields = record.fields;
        const name = fields.Name;

        console.log(`\n[${i+1}/${emptyAvatarChars.length}] Processing: ${name} (${record.id})`);

        try {
          // Generate avatar using Netlify function
          const payload = {
            characterName: name,
            artStyle: 'realistic',
            sex: 'female',
            ethnicity: 'white',
            hairLength: 'medium',
            hairColor: 'brown'
          };

          console.log(`   📝 Payload:`, JSON.stringify(payload));

          const avatarResponse = await fetch('https://selira.ai/.netlify/functions/selira-generate-companion-avatar', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
          });

          if (avatarResponse.ok) {
            const avatarData = await avatarResponse.json();
            const avatarUrl = avatarData.avatarUrl;
            console.log(`   ✅ Avatar generated: ${avatarUrl}`);

            // Update Airtable with the new avatar URL
            const updateResponse = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Characters/${record.id}`, {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                fields: {
                  Avatar_URL: avatarUrl
                }
              })
            });

            if (updateResponse.ok) {
              console.log(`   ✅ Updated Airtable with avatar URL`);
              console.log(`   ✅ Successfully processed ${name}`);
            } else {
              const errorText = await updateResponse.text();
              console.log(`   ❌ Failed to update Airtable for ${name}:`, errorText);
            }
          } else {
            const errorText = await avatarResponse.text();
            console.log(`   ❌ Failed to generate avatar for ${name}: ${errorText}`);
          }
        } catch (error) {
          console.log(`   ❌ Error processing ${name}:`, error.message);
        }

        // Wait between requests
        if (i < emptyAvatarChars.length - 1) {
          console.log(`   ⏳ Waiting 4s before next character...`);
          await new Promise(resolve => setTimeout(resolve, 4000));
        }
      }

      console.log('\n🎉 Completed processing all characters with empty Avatar_URL!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkAllRecords();