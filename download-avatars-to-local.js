#!/usr/bin/env node

// Script to download Replicate avatar images to local /avatars folder
// Updates Airtable records with local avatar URLs

const fs = require('fs');
const path = require('path');
const https = require('https');

// Create avatars directory if it doesn't exist
const avatarsDir = './avatars';
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
  console.log('📁 Created avatars directory');
}

// List of companions with their Replicate URLs (from our recent creations)
const companionsWithReplicateUrls = [
  // Female companions with generated avatars
  {
    name: "Emma Thompson",
    slug: "emma-thompson",
    replicateUrl: "https://replicate.delivery/xezq/W9Nyc6EXZeV0ekzzrKKeJ4Mkxa0z8uP2OAdj0j15qagyY8wqA/out-0.webp"
  },
  {
    name: "Victoria Rose",
    slug: "victoria-rose",
    replicateUrl: "https://replicate.delivery/xezq/HvMaId5T4PZ2JRNjP4hITO6MrxtemcEnIWDz0R9qa7MVGPsKA/out-0.webp"
  },
  {
    name: "Mia Rodriguez",
    slug: "mia-rodriguez",
    replicateUrl: "https://replicate.delivery/xezq/eFKdf0eeCoDuVRQlKux7RadhmKG5KWTf5w5fxOzXxy9gOjHWF/out-0.webp"
  },
  {
    name: "Carmen Delacroix",
    slug: "carmen-delacroix",
    replicateUrl: "https://replicate.delivery/xezq/e6PSISReg5rHUkocHoJC1DfBL9fwon1GLftRJ8xXGp8xtxDrC/out-0.webp"
  },
  {
    name: "Lisa Park",
    slug: "lisa-park",
    replicateUrl: "https://replicate.delivery/xezq/7nFo1To0yW7cMBMGSnJ9PGIZnjntnT8KDGHhYqgfYNyfNewqA/out-0.webp"
  },
  {
    name: "Dr. Sarah Mitchell",
    slug: "dr-sarah-mitchell",
    replicateUrl: "https://replicate.delivery/xezq/nyNdP56p287TGJoDrXDMKCr8QMEfRqIuQZSFHR1JsTjuGPsKA/out-0.webp"
  },

  // Male companions with generated avatars
  {
    name: "Marcus Thompson",
    slug: "marcus-thompson",
    replicateUrl: "https://replicate.delivery/xezq/oqmwPe6818V7K6Y0XdNZ0Zwzv3fHoHSRycgtWU7NJOqiUewqA/out-0.webp"
  },
  {
    name: "Diego Ramirez",
    slug: "diego-ramirez",
    replicateUrl: "https://replicate.delivery/xezq/lAu6XW8rYrJBFpdfw2EQsRrhMXEti9pwxARZXgf759gsUewqA/out-0.webp"
  },
  {
    name: "Jin Park",
    slug: "jin-park",
    replicateUrl: "https://replicate.delivery/xezq/giXoPjM2MrIABN8i1pKO54eufNUBoosOI7os22yp3vT9UewqA/out-0.webp"
  },
  {
    name: "Raj Patel",
    slug: "raj-patel",
    replicateUrl: "https://replicate.delivery/xezq/XqKRODl2rw6SKVG7J33Ng5nfKPkndd8B0bbDprEeHO6WVewqA/out-0.webp"
  },
  {
    name: "Chen Wei",
    slug: "chen-wei",
    replicateUrl: "https://replicate.delivery/xezq/IN5ofz73pBXZfUKQao7EYniAxgde9czJaXaTKeWj86e8tyDrC/out-0.webp"
  },
  {
    name: "Akio Tanaka",
    slug: "akio-tanaka",
    replicateUrl: "https://replicate.delivery/xezq/lb3jBqaaxz7hJha6UlRazbPOXdSLBfrgDQ8OwElgeQ9ZWewqA/out-0.webp"
  },
  {
    name: "Kenji Watanabe",
    slug: "kenji-watanabe",
    replicateUrl: "https://replicate.delivery/xezq/E2mV34ESSPq4I5NNOMR0NxqVBvXKee2XcEIfK6AITDZ0t8wqA/out-0.webp"
  }
];

// Function to download image from URL
function downloadImage(url, filePath) {
  return new Promise((resolve, reject) => {
    console.log(`🔽 Downloading: ${url}`);

    const file = fs.createWriteStream(filePath);

    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download image: ${response.statusCode}`));
        return;
      }

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        console.log(`✅ Downloaded: ${path.basename(filePath)}`);
        resolve(filePath);
      });

      file.on('error', (err) => {
        fs.unlink(filePath, () => {}); // Delete incomplete file
        reject(err);
      });

    }).on('error', (err) => {
      reject(err);
    });
  });
}

// Function to update companion avatar URL in Airtable
async function updateCompanionAvatar(companionName, newLocalUrl) {
  console.log(`📝 Updating avatar URL for ${companionName}...`);

  try {
    // Call the update function (we'll need to create this Netlify function)
    const response = await fetch('https://selira.ai/.netlify/functions/update-companion-avatar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        companionName: companionName,
        newAvatarUrl: newLocalUrl
      })
    });

    if (response.ok) {
      console.log(`✅ Updated avatar URL for ${companionName}`);
      return true;
    } else {
      console.error(`❌ Failed to update avatar URL for ${companionName}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error updating ${companionName}:`, error.message);
    return false;
  }
}

async function downloadAllAvatars() {
  console.log('🎨 Starting download of Replicate avatars to local storage\n');

  const results = {
    downloaded: [],
    failed: [],
    updated: []
  };

  for (let i = 0; i < companionsWithReplicateUrls.length; i++) {
    const companion = companionsWithReplicateUrls[i];
    console.log(`\n[${i + 1}/${companionsWithReplicateUrls.length}] Processing ${companion.name}...`);

    try {
      // Step 1: Download image to local avatars folder
      const fileName = `${companion.slug}.webp`;
      const localPath = path.join(avatarsDir, fileName);

      await downloadImage(companion.replicateUrl, localPath);
      results.downloaded.push(fileName);

      // Step 2: Update Airtable with new local URL
      const newLocalUrl = `https://selira.ai/avatars/${fileName}`;
      const updateSuccess = await updateCompanionAvatar(companion.name, newLocalUrl);

      if (updateSuccess) {
        results.updated.push(companion.name);
      }

      // Small delay between downloads
      if (i < companionsWithReplicateUrls.length - 1) {
        console.log('⏳ Waiting 1 second before next download...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

    } catch (error) {
      console.error(`❌ Failed to process ${companion.name}:`, error.message);
      results.failed.push(companion.name);
    }
  }

  // Summary
  console.log(`\n🎉 Download process completed!`);
  console.log(`\n📊 Summary:`);
  console.log(`   Images downloaded: ${results.downloaded.length}/${companionsWithReplicateUrls.length}`);
  console.log(`   Records updated: ${results.updated.length}/${companionsWithReplicateUrls.length}`);
  console.log(`   Failed: ${results.failed.length}`);

  if (results.downloaded.length > 0) {
    console.log(`\n✅ Successfully downloaded images:`);
    results.downloaded.forEach(fileName => {
      console.log(`   - ${fileName}`);
    });
  }

  if (results.failed.length > 0) {
    console.log(`\n❌ Failed to process:`);
    results.failed.forEach(name => {
      console.log(`   - ${name}`);
    });
  }

  console.log(`\n📁 All images saved to: ${path.resolve(avatarsDir)}`);
  console.log(`🔗 Images now accessible at: https://selira.ai/avatars/[filename].webp`);
}

// Create Netlify function to update companion avatars
async function createUpdateAvatarFunction() {
  console.log('📝 Creating Netlify function to update companion avatars...');

  const functionCode = `
// netlify/functions/update-companion-avatar.js
// Updates companion avatar URL in Airtable

exports.handler = async (event, context) => {
  console.log('🔄 update-companion-avatar function called');

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID_SELIRA;
  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN_SELIRA;

  if (!AIRTABLE_BASE_ID || !AIRTABLE_TOKEN) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Airtable credentials not found' })
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { companionName, companionId, newAvatarUrl } = body;

    if (!newAvatarUrl || (!companionName && !companionId)) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing required parameters' })
      };
    }

    let recordId = companionId;

    // If we only have name, find the record ID
    if (!recordId && companionName) {
      const findResponse = await fetch(\`https://api.airtable.com/v0/\${AIRTABLE_BASE_ID}/Characters?filterByFormula={Name}="\${companionName}"\`, {
        headers: {
          'Authorization': \`Bearer \${AIRTABLE_TOKEN}\`
        }
      });

      if (findResponse.ok) {
        const findResult = await findResponse.json();
        if (findResult.records && findResult.records.length > 0) {
          recordId = findResult.records[0].id;
        } else {
          return {
            statusCode: 404,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Companion not found' })
          };
        }
      }
    }

    // Update the avatar URL
    const updateResponse = await fetch(\`https://api.airtable.com/v0/\${AIRTABLE_BASE_ID}/Characters/\${recordId}\`, {
      method: 'PATCH',
      headers: {
        'Authorization': \`Bearer \${AIRTABLE_TOKEN}\`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: {
          Avatar_URL: newAvatarUrl
        }
      })
    });

    if (updateResponse.ok) {
      const result = await updateResponse.json();
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          message: 'Avatar URL updated successfully',
          recordId: recordId,
          newAvatarUrl: newAvatarUrl
        })
      };
    } else {
      const errorText = await updateResponse.text();
      throw new Error(\`Airtable update failed: \${errorText}\`);
    }

  } catch (error) {
    console.error('❌ Update avatar error:', error);

    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Avatar update failed',
        details: error.message
      })
    };
  }
};`;

  // Write the function file
  const functionsDir = './netlify/functions';
  if (!fs.existsSync(functionsDir)) {
    fs.mkdirSync(functionsDir, { recursive: true });
  }

  const functionPath = path.join(functionsDir, 'update-companion-avatar.js');
  fs.writeFileSync(functionPath, functionCode);

  console.log(`✅ Created Netlify function: ${functionPath}`);
}

// Main execution
async function main() {
  console.log('🚀 Avatar Download & Local Storage Setup\n');

  // Step 1: Create the update function
  await createUpdateAvatarFunction();

  console.log('\n⚠️  Please deploy the new Netlify function first:');
  console.log('   git add . && git commit -m "Add update-companion-avatar function" && git push\n');
  console.log('⏳ Waiting 10 seconds for you to deploy (or press Ctrl+C to cancel)...');

  // Wait for user to deploy
  await new Promise(resolve => setTimeout(resolve, 10000));

  // Step 2: Download all avatars
  await downloadAllAvatars();
}

// Check if we're running this script directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { downloadAllAvatars, companionsWithReplicateUrls };