const fs = require('fs');
const path = require('path');

// Configuration
const TARGET_PLACEHOLDER = 'blonde';
const TARGET_FONT_SIZE = '14px';

// Get all HTML files in the current directory
const htmlFiles = fs.readdirSync('.')
  .filter(file => file.endsWith('.html'));

console.log(`🔍 Found ${htmlFiles.length} HTML files\n`);

let totalChanges = 0;

htmlFiles.forEach(file => {
  console.log(`Processing: ${file}`);
  let content = fs.readFileSync(file, 'utf8');
  let changes = 0;
  let originalContent = content;

  // Fix 1: Update search bar placeholders to "blonde"
  // Match desktop search inputs
  const desktopSearchRegex = /(<input[^>]*class="search-input"[^>]*placeholder=")[^"]*(")/g;
  content = content.replace(desktopSearchRegex, (match, p1, p2) => {
    if (!match.includes(`placeholder="${TARGET_PLACEHOLDER}"`)) {
      changes++;
      return p1 + TARGET_PLACEHOLDER + p2;
    }
    return match;
  });

  // Match mobile search inputs
  const mobileSearchRegex = /(<input[^>]*id="mobileSearchInput"[^>]*placeholder=")[^"]*(")/g;
  content = content.replace(mobileSearchRegex, (match, p1, p2) => {
    if (!match.includes(`placeholder="${TARGET_PLACEHOLDER}"`)) {
      changes++;
      return p1 + TARGET_PLACEHOLDER + p2;
    }
    return match;
  });

  // Fix 2: Update search-input font-size to 14px
  const searchInputStyleRegex = /(\.search-input\s*\{[^}]*font-size:\s*)[^;]*(;[^}]*\})/g;
  content = content.replace(searchInputStyleRegex, (match, p1, p2) => {
    if (!match.includes(`font-size: ${TARGET_FONT_SIZE}`)) {
      changes++;
      return p1 + TARGET_FONT_SIZE + p2;
    }
    return match;
  });

  // Alternative: inline font-size in search inputs
  const inlineSearchFontRegex = /(<input[^>]*class="search-input"[^>]*style="[^"]*font-size:\s*)[^;"]*(;?[^"]*")/g;
  content = content.replace(inlineSearchFontRegex, (match, p1, p2) => {
    if (!match.includes(`font-size: ${TARGET_FONT_SIZE}`)) {
      changes++;
      return p1 + TARGET_FONT_SIZE + p2;
    }
    return match;
  });

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`  ✅ Made ${changes} change(s)`);
    totalChanges += changes;
  } else {
    console.log(`  ⏭️  No changes needed`);
  }
  console.log('');
});

console.log(`\n✨ Done! Made ${totalChanges} total changes across ${htmlFiles.length} files`);
