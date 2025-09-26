require('dotenv').config();
const fetch = require('node-fetch');

async function fillEmptyAvatars() {
  try {
    console.log('\x1b[94m🚀 Starting avatar generation for empty avatar_url fields in SELIRA AI database\x1b[0m');
    console.log('\x1b[96m📝 Processing in batches of 5 with 4s delay between requests\x1b[0m');
    console.log('');

    // Use Selira AI database environment variables
    const baseId = process.env.AIRTABLE_BASE_ID_SELIRA;
    const token = process.env.AIRTABLE_TOKEN_SELIRA;

    if (!baseId || !token) {
      console.error('❌ Missing AIRTABLE_BASE_ID_SELIRA or AIRTABLE_TOKEN_SELIRA environment variables');
      return;
    }

    console.log(`📊 Using Selira AI Base ID: ${baseId.substring(0, 10)}...`);

    // Step 1: Get all characters from Airtable
    console.log('\x1b[94m📋 Fetching characters with empty avatar_url from Airtable...\x1b[0m');

    let allRecords = [];
    let offset = null;

    do {
      const url = `https://api.airtable.com/v0/${baseId}/Characters?maxRecords=100${offset ? `&offset=${offset}` : ''}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      allRecords = allRecords.concat(data.records);
      offset = data.offset;

      console.log(`\x1b[96m   📊 Fetched ${allRecords.length} characters so far...\x1b[0m`);

    } while (offset);

    // Filter for characters with empty Avatar_URL
    const emptyAvatarChars = allRecords.filter(record => {
      const avatarUrl = record.fields.Avatar_URL;
      return !avatarUrl || avatarUrl.trim() === '';
    });

    console.log(`\x1b[92m✅ Found ${emptyAvatarChars.length} characters with empty avatar_url\x1b[0m`);

    if (emptyAvatarChars.length === 0) {
      console.log('🎉 All characters already have avatars!');
      return;
    }

    // Process in batches
    const batchSize = 5;
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < emptyAvatarChars.length; i += batchSize) {
      const batch = emptyAvatarChars.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;

      console.log(`\x1b[95m\n🔄 Processing batch ${batchNumber} (${batch.length} characters)\x1b[0m`);

      for (let j = 0; j < batch.length; j++) {
        const record = batch[j];
        const fields = record.fields;
        const characterName = fields.Name;
        const recordId = record.id;

        console.log(`\x1b[94m\n[${j+1}/${batch.length}] Processing: ${characterName} (${recordId})\x1b[0m`);

        // Default attributes - you can customize these based on your character data
        const attributes = {
          sex: fields.Gender || 'female',
          ethnicity: fields.Ethnicity || 'white',
          artStyle: 'realistic',
          hairLength: fields.HairLength || 'medium',
          hairColor: fields.HairColor || 'brown'
        };

        console.log(`\x1b[96m   Attributes: ${attributes.sex}, ${attributes.ethnicity}, ${attributes.artStyle}, ${attributes.hairLength} ${attributes.hairColor} hair\x1b[0m`);

        try {
          // Step 2: Generate avatar using Netlify function
          console.log(`\x1b[93m🎨 Generating avatar for: ${characterName}\x1b[0m`);

          const payload = {
            characterName: characterName,
            artStyle: attributes.artStyle,
            sex: attributes.sex,
            ethnicity: attributes.ethnicity,
            hairLength: attributes.hairLength,
            hairColor: attributes.hairColor
          };

          console.log(`\x1b[96m   📝 Payload: ${JSON.stringify(payload)}\x1b[0m`);

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
            console.log(`\x1b[92m   ✅ Avatar generated: ${avatarUrl}\x1b[0m`);

            // Step 3: Update Airtable with the new avatar URL
            const updateResponse = await fetch(`https://api.airtable.com/v0/${baseId}/Characters/${recordId}`, {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                fields: {
                  Avatar_URL: avatarUrl
                }
              })
            });

            if (updateResponse.ok) {
              console.log(`\x1b[92m   ✅ Updated Airtable with avatar URL\x1b[0m`);
              console.log(`\x1b[92m   ✅ Successfully processed ${characterName}\x1b[0m`);
              successCount++;
            } else {
              const errorText = await updateResponse.text();
              console.log(`\x1b[91m   ❌ Failed to update Airtable for ${characterName}: ${errorText}\x1b[0m`);
              failCount++;
            }
          } else {
            const errorText = await avatarResponse.text();
            console.log(`\x1b[91m   ❌ Failed to generate avatar for ${characterName}: ${errorText}\x1b[0m`);
            console.log(`\x1b[91m   ❌ Skipped ${characterName} due to avatar generation failure\x1b[0m`);
            failCount++;
          }
        } catch (error) {
          console.log(`\x1b[91m   ❌ Error processing ${characterName}: ${error.message}\x1b[0m`);
          failCount++;
        }

        // Wait between characters to avoid rate limiting
        if (j < batch.length - 1) {
          console.log(`\x1b[93m   ⏳ Waiting 4s before next character...\x1b[0m`);
          await new Promise(resolve => setTimeout(resolve, 4000));
        }
      }

      console.log(`\x1b[95m\n📊 Batch ${batchNumber} completed: ${batch.filter((_, idx) => idx < successCount - (batchNumber-1)*batchSize && idx >= 0).length} successful, ${batch.length - batch.filter((_, idx) => idx < successCount - (batchNumber-1)*batchSize && idx >= 0).length} failed\x1b[0m`);

      // Wait between batches
      if (i + batchSize < emptyAvatarChars.length) {
        console.log(`\x1b[93m⏳ Waiting 5s before next batch...\x1b[0m`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    console.log(`\x1b[92m\n🎉 Avatar generation completed!\x1b[0m`);
    console.log(`\x1b[92m✅ Successfully processed: ${successCount} characters\x1b[0m`);
    console.log(`\x1b[91m❌ Failed to process: ${failCount} characters\x1b[0m`);
    console.log(`\x1b[94m📊 Total characters processed: ${emptyAvatarChars.length}\x1b[0m`);

  } catch (error) {
    console.error('❌ Script error:', error.message);
  }
}

// Run the function
fillEmptyAvatars();