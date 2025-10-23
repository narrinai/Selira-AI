#!/usr/bin/env node
// scripts/regenerate-sitemap.js
// Run this script to regenerate the sitemap.xml with all character URLs
// Usage: node scripts/regenerate-sitemap.js

const fs = require('fs');
const path = require('path');

async function regenerateSitemap() {
  console.log('🗺️ Regenerating sitemap.xml...');

  try {
    // Call the Netlify function (works both locally and in production)
    const url = process.env.SITEMAP_URL || 'https://selira.ai/.netlify/functions/generate-sitemap';

    console.log(`📡 Fetching from: ${url}`);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const xml = await response.text();

    // Write to sitemap.xml
    const sitemapPath = path.join(__dirname, '..', 'sitemap.xml');
    fs.writeFileSync(sitemapPath, xml, 'utf8');

    // Count URLs in sitemap
    const urlCount = (xml.match(/<url>/g) || []).length;

    console.log(`✅ Sitemap regenerated successfully!`);
    console.log(`📊 Total URLs: ${urlCount}`);
    console.log(`💾 Saved to: ${sitemapPath}`);

    return true;
  } catch (error) {
    console.error('❌ Error regenerating sitemap:', error);
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  regenerateSitemap()
    .then(success => {
      process.exit(success ? 0 : 1);
    });
}

module.exports = { regenerateSitemap };
