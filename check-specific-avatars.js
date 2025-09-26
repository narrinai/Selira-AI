require('dotenv').config();
const fetch = require('node-fetch');

// Characters visible in the screenshot that appear to have empty avatar_url
const charactersToCheck = [
  'kai-nakamura',
  'emma-heartwell',
  'zara',
  'kat', // there might be two
  'test',
  'luna'
];

async function checkAndFillAvatars() {
  try {
    console.log('🔍 Checking specific characters from screenshot...');

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

    // Find characters that match our list and have empty Avatar_URL
    const emptyAvatarChars = [];

    for (const record of data.records) {
      const fields = record.fields;
      const slug = fields.Slug;
      const avatarUrl = fields.Avatar_URL;

      if (charactersToCheck.includes(slug) && (!avatarUrl || avatarUrl.trim() === '')) {
        emptyAvatarChars.push({
          id: record.id,
          name: fields.Name,
          slug: slug,
          avatarUrl: avatarUrl || 'EMPTY'
        });
      }
    }

    console.log(`\n📋 Found ${emptyAvatarChars.length} characters from screenshot with empty Avatar_URL:`);
    emptyAvatarChars.forEach(char => {
      console.log(`- ${char.name} (${char.slug}) - ${char.avatarUrl}`);
    });

    // Also check for any other characters with empty Avatar_URL
    const allEmptyChars = [];
    for (const record of data.records) {
      const fields = record.fields;
      const avatarUrl = fields.Avatar_URL;

      if (!avatarUrl || avatarUrl.trim() === '') {
        allEmptyChars.push({
          id: record.id,
          name: fields.Name,
          slug: fields.Slug,
          avatarUrl: avatarUrl || 'EMPTY'
        });
      }
    }

    console.log(`\n📊 Total characters with empty Avatar_URL: ${allEmptyChars.length}`);
    if (allEmptyChars.length > 0) {
      console.log('All characters without avatars:');
      allEmptyChars.forEach(char => {
        console.log(`- ${char.name} (${char.slug}) - Record: ${char.id}`);
      });
    }

    // Now generate avatars for the empty ones
    if (emptyAvatarChars.length > 0) {
      console.log('\n🎨 Starting avatar generation for screenshot characters...');

      for (let i = 0; i < emptyAvatarChars.length; i++) {
        const char = emptyAvatarChars[i];
        console.log(`\n[${i+1}/${emptyAvatarChars.length}] Processing: ${char.name} (${char.id})`);

        try {
          // Generate avatar using Netlify function
          const avatarResponse = await fetch('https://selira.ai/.netlify/functions/selira-generate-companion-avatar', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              characterName: char.name,
              artStyle: 'realistic',
              sex: 'female',
              ethnicity: 'white',
              hairLength: 'medium',
              hairColor: 'brown'
            })
          });

          if (avatarResponse.ok) {
            const avatarData = await avatarResponse.json();
            const avatarUrl = avatarData.avatarUrl;
            console.log(`   ✅ Avatar generated: ${avatarUrl}`);

            // Update Airtable with the new avatar URL
            const updateResponse = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Characters/${char.id}`, {
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
              console.log(`   ✅ Successfully processed ${char.name}`);
            } else {
              console.log(`   ❌ Failed to update Airtable for ${char.name}`);
            }
          } else {
            const errorText = await avatarResponse.text();
            console.log(`   ❌ Failed to generate avatar for ${char.name}: ${errorText}`);
          }
        } catch (error) {
          console.log(`   ❌ Error processing ${char.name}:`, error.message);
        }

        // Wait between requests to avoid rate limiting
        if (i < emptyAvatarChars.length - 1) {
          console.log(`   ⏳ Waiting 4s before next character...`);
          await new Promise(resolve => setTimeout(resolve, 4000));
        }
      }

      console.log('\n🎉 Completed processing screenshot characters!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkAndFillAvatars();