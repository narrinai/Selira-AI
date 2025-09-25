#!/usr/bin/env node

// Script to update Airtable records with local avatar URLs

const companionsToUpdate = [
  // Female companions with downloaded avatars
  {
    name: "Emma Thompson",
    localFile: "emma-thompson.webp"
  },
  {
    name: "Victoria Rose",
    localFile: "victoria-rose.webp"
  },
  {
    name: "Mia Rodriguez",
    localFile: "mia-rodriguez.webp"
  },
  {
    name: "Carmen Delacroix",
    localFile: "carmen-delacroix.webp"
  },
  {
    name: "Lisa Park",
    localFile: "lisa-park.webp"
  },
  {
    name: "Dr. Sarah Mitchell",
    localFile: "dr-sarah-mitchell.webp"
  },

  // Male companions with downloaded avatars
  {
    name: "Marcus Thompson",
    localFile: "marcus-thompson.webp"
  },
  {
    name: "Diego Ramirez",
    localFile: "diego-ramirez.webp"
  },
  {
    name: "Jin Park",
    localFile: "jin-park.webp"
  },
  {
    name: "Raj Patel",
    localFile: "raj-patel.webp"
  },
  {
    name: "Chen Wei",
    localFile: "chen-wei.webp"
  },
  {
    name: "Akio Tanaka",
    localFile: "akio-tanaka.webp"
  },
  {
    name: "Kenji Watanabe",
    localFile: "kenji-watanabe.webp"
  }
];

// Function to update companion avatar URL in Airtable
async function updateCompanionAvatar(companionName, localFileName) {
  console.log(`📝 Updating avatar URL for ${companionName}...`);

  const newLocalUrl = `https://selira.ai/avatars/${localFileName}`;

  try {
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
      const result = await response.json();
      console.log(`✅ Updated ${companionName}: ${newLocalUrl}`);
      return true;
    } else {
      const error = await response.text();
      console.error(`❌ Failed to update ${companionName}:`, error);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error updating ${companionName}:`, error.message);
    return false;
  }
}

async function updateAllAvatarUrls() {
  console.log('🔄 Updating all Airtable records with local avatar URLs\n');

  const results = {
    updated: [],
    failed: []
  };

  for (let i = 0; i < companionsToUpdate.length; i++) {
    const companion = companionsToUpdate[i];
    console.log(`\n[${i + 1}/${companionsToUpdate.length}] Processing ${companion.name}...`);

    try {
      const success = await updateCompanionAvatar(companion.name, companion.localFile);

      if (success) {
        results.updated.push(companion.name);
      } else {
        results.failed.push(companion.name);
      }

      // Small delay between updates
      if (i < companionsToUpdate.length - 1) {
        console.log('⏳ Waiting 2 seconds before next update...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

    } catch (error) {
      console.error(`❌ Error processing ${companion.name}:`, error.message);
      results.failed.push(companion.name);
    }
  }

  console.log(`\n🎉 Avatar URL update process completed!`);
  console.log(`\n📊 Summary:`);
  console.log(`   Records updated: ${results.updated.length}/${companionsToUpdate.length}`);
  console.log(`   Failed: ${results.failed.length}`);

  if (results.updated.length > 0) {
    console.log(`\n✅ Successfully updated:`);
    results.updated.forEach(name => {
      console.log(`   - ${name}`);
    });
  }

  if (results.failed.length > 0) {
    console.log(`\n❌ Failed to update:`);
    results.failed.forEach(name => {
      console.log(`   - ${name}`);
    });
  }

  console.log(`\n🔗 All avatars now use permanent local URLs: https://selira.ai/avatars/[filename].webp`);
  console.log(`🎯 Images will never expire and load faster from local storage!`);
}

// Check if we're running this script directly
if (require.main === module) {
  updateAllAvatarUrls().catch(console.error);
}

module.exports = { updateAllAvatarUrls, companionsToUpdate };