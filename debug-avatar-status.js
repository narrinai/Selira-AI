require('dotenv').config();
const fetch = require('node-fetch');

async function debugAvatarStatus() {
  try {
    console.log('🔍 Debugging avatar status for all characters...');

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

    // Characters from screenshot
    const screenshotChars = [
      'kai-nakamura',
      'emma-heartwell',
      'zara',
      'kat',
      'test',
      'luna'
    ];

    console.log('\n🔍 Checking characters from screenshot:');
    for (const slug of screenshotChars) {
      const record = data.records.find(r => r.fields.Slug === slug);
      if (record) {
        const avatarUrl = record.fields.Avatar_URL;
        console.log(`- ${record.fields.Name} (${slug}):`);
        console.log(`  Avatar_URL: "${avatarUrl}" (type: ${typeof avatarUrl})`);
        console.log(`  Is undefined: ${avatarUrl === undefined}`);
        console.log(`  Is null: ${avatarUrl === null}`);
        console.log(`  Is empty string: ${avatarUrl === ''}`);
        console.log(`  Is whitespace only: ${avatarUrl && avatarUrl.trim() === ''}`);
        console.log(`  Record ID: ${record.id}`);
        console.log('');
      } else {
        console.log(`- ${slug}: NOT FOUND`);
      }
    }

    // Check for various "empty" conditions
    const problematicChars = [];

    for (const record of data.records) {
      const fields = record.fields;
      const avatarUrl = fields.Avatar_URL;
      const name = fields.Name;
      const slug = fields.Slug;

      // Check for various "empty" states
      if (avatarUrl === undefined ||
          avatarUrl === null ||
          avatarUrl === '' ||
          (typeof avatarUrl === 'string' && avatarUrl.trim() === '') ||
          !avatarUrl) {

        problematicChars.push({
          id: record.id,
          name: name,
          slug: slug,
          avatarUrl: avatarUrl,
          avatarType: typeof avatarUrl,
          isScreenshotChar: screenshotChars.includes(slug)
        });
      }
    }

    console.log(`\n📊 Found ${problematicChars.length} characters with problematic Avatar_URL:`);
    problematicChars.forEach(char => {
      const marker = char.isScreenshotChar ? '📷' : '  ';
      console.log(`${marker} ${char.name} (${char.slug})`);
      console.log(`     Avatar_URL: "${char.avatarUrl}" (${char.avatarType})`);
      console.log(`     Record ID: ${char.id}`);
    });

    // Try to generate avatars for screenshot characters that have issues
    const screenshotProblematic = problematicChars.filter(char => char.isScreenshotChar);

    if (screenshotProblematic.length > 0) {
      console.log(`\n🎨 Generating avatars for ${screenshotProblematic.length} screenshot characters...`);

      for (let i = 0; i < screenshotProblematic.length; i++) {
        const char = screenshotProblematic[i];
        console.log(`\n[${i+1}/${screenshotProblematic.length}] Processing: ${char.name}`);

        try {
          // Generate avatar using Netlify function
          const payload = {
            characterName: char.name,
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
              const errorText = await updateResponse.text();
              console.log(`   ❌ Failed to update Airtable for ${char.name}:`, errorText);
            }
          } else {
            const errorText = await avatarResponse.text();
            console.log(`   ❌ Failed to generate avatar for ${char.name}: ${errorText}`);
          }
        } catch (error) {
          console.log(`   ❌ Error processing ${char.name}:`, error.message);
        }

        // Wait between requests
        if (i < screenshotProblematic.length - 1) {
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

debugAvatarStatus();