#!/usr/bin/env node

// Script to download Replicate avatars locally and update Selira database with local URLs

const fetch = require('node-fetch');
const fs = require('fs').promises;
const path = require('path');

async function downloadAvatar(url, filename) {
  try {
    console.log(`   📥 Downloading: ${url}`);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const buffer = await response.buffer();
    const avatarPath = path.join(__dirname, 'avatars', filename);

    await fs.writeFile(avatarPath, buffer);

    console.log(`   ✅ Downloaded: ${filename}`);
    return `/avatars/${filename}`;
  } catch (error) {
    console.log(`   ❌ Download failed: ${error.message}`);
    return null;
  }
}

async function downloadSeliraAvatars() {
  console.log('🚀 Starting local avatar download for Selira AI...');

  try {
    // Create avatars directory if it doesn't exist
    const avatarsDir = path.join(__dirname, 'avatars');
    try {
      await fs.access(avatarsDir);
    } catch {
      console.log('📁 Creating avatars directory...');
      await fs.mkdir(avatarsDir, { recursive: true });
    }

    // Fetch all characters from Selira AI
    console.log('📋 Fetching characters with Replicate URLs...');

    const response = await fetch('https://selira.ai/.netlify/functions/selira-characters?limit=100');

    if (!response.ok) {
      throw new Error(`Failed to fetch characters: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success || !data.characters) {
      throw new Error('Failed to get character data');
    }

    // Filter characters with Replicate URLs
    const charactersWithReplicate = data.characters.filter(char => {
      return char.avatar_url && char.avatar_url.includes('replicate.delivery');
    });

    console.log(`📊 Found ${charactersWithReplicate.length} characters with Replicate URLs`);

    if (charactersWithReplicate.length === 0) {
      console.log('✅ No Replicate avatars to download!');
      return;
    }

    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < charactersWithReplicate.length; i++) {
      const character = charactersWithReplicate[i];
      console.log(`\n[${i + 1}/${charactersWithReplicate.length}] Processing: ${character.name}`);
      console.log(`   URL: ${character.avatar_url}`);

      try {
        // Generate filename based on character slug
        const filename = `${character.slug}.webp`;

        // Download the avatar
        const localUrl = await downloadAvatar(character.avatar_url, filename);

        if (localUrl) {
          // Update the character in Selira database with local URL
          console.log(`   🔄 Updating database with local URL: ${localUrl}`);

          const updateResponse = await fetch('https://selira.ai/.netlify/functions/selira-update-avatar', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              recordId: character.id,
              avatarUrl: localUrl
            })
          });

          if (updateResponse.ok) {
            console.log(`   ✅ Successfully updated ${character.name}`);
            successCount++;
            results.push({
              name: character.name,
              slug: character.slug,
              originalUrl: character.avatar_url,
              localUrl: localUrl,
              status: 'success'
            });
          } else {
            const errorText = await updateResponse.text();
            console.log(`   ❌ Database update failed: ${errorText}`);
            failCount++;
            results.push({
              name: character.name,
              slug: character.slug,
              originalUrl: character.avatar_url,
              error: `Database update failed: ${errorText}`,
              status: 'failed'
            });
          }
        } else {
          failCount++;
          results.push({
            name: character.name,
            slug: character.slug,
            originalUrl: character.avatar_url,
            error: 'Download failed',
            status: 'failed'
          });
        }

        // Small delay between downloads
        if (i < charactersWithReplicate.length - 1) {
          console.log('   ⏳ Waiting 2s before next download...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

      } catch (error) {
        console.log(`   ❌ Error processing ${character.name}: ${error.message}`);
        failCount++;
        results.push({
          name: character.name,
          slug: character.slug,
          originalUrl: character.avatar_url,
          error: error.message,
          status: 'failed'
        });
      }
    }

    // Summary
    console.log(`\n🎉 Avatar download completed!`);
    console.log(`✅ Successfully processed: ${successCount} avatars`);
    console.log(`❌ Failed to process: ${failCount} avatars`);
    console.log(`📊 Total processed: ${charactersWithReplicate.length} avatars`);
    console.log(`📈 Success rate: ${Math.round((successCount / charactersWithReplicate.length) * 100)}%`);

    if (failCount > 0) {
      console.log(`\n❌ Failed avatars:`);
      results.filter(r => r.status === 'failed').forEach(result => {
        console.log(`   - ${result.name}: ${result.error}`);
      });
    }

    console.log('\n🎊 All Replicate avatars have been downloaded to /avatars/ and database updated!');

  } catch (error) {
    console.error('❌ Script error:', error.message);
  }
}

// Run the script
if (require.main === module) {
  downloadSeliraAvatars().catch(console.error);
}

module.exports = { downloadSeliraAvatars };