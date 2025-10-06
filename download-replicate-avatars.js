// Download existing Replicate URLs and save them locally
// Does NOT generate new images - just downloads what's already there
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function downloadImage(url, filename) {
  try {
    console.log(`📥 Downloading: ${filename}`);
    const response = await fetch(url);

    if (!response.ok) {
      console.log(`❌ Download failed: ${response.status} ${response.statusText}`);
      return false;
    }

    const buffer = await response.buffer();
    const filepath = path.join('./avatars/', filename);

    // Ensure avatars directory exists
    const avatarsDir = path.join('./avatars/');
    if (!fs.existsSync(avatarsDir)) {
      fs.mkdirSync(avatarsDir, { recursive: true });
    }

    fs.writeFileSync(filepath, buffer);
    const sizeKB = (buffer.length / 1024).toFixed(1);
    console.log(`✅ Saved: ${filename} (${sizeKB} KB)`);
    return true;
  } catch (error) {
    console.log(`❌ Download error: ${error.message}`);
    return false;
  }
}

async function main() {
  try {
    console.log('📥 Starting Replicate URL download...\n');

    // Get ALL companions using pagination
    console.log('🔍 Fetching ALL companions using pagination...');
    let allCompanions = [];
    let offset = null;
    let batchNumber = 1;
    const MAX_BATCHES = 10;

    while (batchNumber <= MAX_BATCHES) {
      console.log(`📄 Batch ${batchNumber}/${MAX_BATCHES}: Fetching companions${offset ? ` with offset ${offset}` : ''}...`);

      let url = 'https://selira.ai/.netlify/functions/selira-characters?limit=100&includePrivate=true';
      if (offset) {
        url += `&offset=${offset}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        console.log(`❌ HTTP error: ${response.status}`);
        break;
      }

      const data = await response.json();
      console.log(`📦 Batch ${batchNumber}: ${data.characters.length} companions received`);

      if (!data.characters || data.characters.length === 0) {
        console.log('✅ No more companions to fetch');
        break;
      }

      allCompanions.push(...data.characters);
      offset = data.offset || null;

      if (!data.offset && data.characters.length < 100) {
        console.log('✅ Reached end of data');
        break;
      }

      batchNumber++;

      if (batchNumber <= MAX_BATCHES) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`📦 Total companions fetched: ${allCompanions.length}\n`);

    // Deduplicate by slug
    const uniqueCompanions = [];
    const seenSlugs = new Set();
    for (const companion of allCompanions) {
      if (!seenSlugs.has(companion.slug)) {
        seenSlugs.add(companion.slug);
        uniqueCompanions.push(companion);
      }
    }
    console.log(`📦 After deduplication: ${uniqueCompanions.length} unique companions\n`);

    // Filter companions with Replicate URLs ONLY
    const companionsToDownload = uniqueCompanions.filter(char =>
      char.avatar_url && char.avatar_url.includes('replicate.delivery')
    );

    if (companionsToDownload.length === 0) {
      console.log('🎉 No Replicate URLs found - all companions already have local avatars!');
      return;
    }

    console.log(`📊 Found ${companionsToDownload.length} companions with Replicate URLs to download:\n`);
    companionsToDownload.forEach((c, i) => {
      console.log(`   ${i + 1}. ${c.name} (${c.slug})`);
    });
    console.log();

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < companionsToDownload.length; i++) {
      const companion = companionsToDownload[i];

      console.log(`\n[${i + 1}/${companionsToDownload.length}] Processing: ${companion.name} (${companion.slug})`);
      console.log(`   Replicate URL: ${companion.avatar_url}`);

      try {
        const timestamp = Date.now();
        const filename = `${companion.slug}-${timestamp}.webp`;
        const downloaded = await downloadImage(companion.avatar_url, filename);

        if (!downloaded) {
          throw new Error('Download failed');
        }

        const localUrl = `https://selira.ai/avatars/${filename}`;
        console.log(`   Local URL: ${localUrl}`);

        const updateResponse = await fetch('https://selira.ai/.netlify/functions/selira-update-avatar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companionId: companion.id,
            avatarUrl: localUrl
          })
        });

        if (!updateResponse.ok) {
          const errorText = await updateResponse.text();
          throw new Error(`Update failed: ${updateResponse.status} - ${errorText}`);
        }

        console.log(`   ✅ Successfully updated in Airtable`);
        successCount++;

        if (i < companionsToDownload.length - 1) {
          console.log('   ⏳ Waiting 2 seconds...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

      } catch (error) {
        console.error(`   ❌ Failed: ${error.message}`);
        failCount++;

        if (i < companionsToDownload.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    console.log(`\n📊 Download Complete!`);
    console.log(`✅ Successfully downloaded: ${successCount} companions`);
    console.log(`❌ Failed: ${failCount} companions`);

    if (successCount > 0) {
      console.log(`\n💡 Tip: Don't forget to commit the new avatars to Git!`);
      console.log(`   git add avatars/`);
      console.log(`   git commit -m "Download Replicate avatars to local storage"`);
      console.log(`   git push`);
    }

  } catch (error) {
    console.error('❌ Error in main process:', error);
    process.exit(1);
  }
}

main().catch(console.error);
