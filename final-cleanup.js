const fs = require('fs');

function cleanupPage(filePath) {
  console.log(`\n📄 Processing: ${filePath}`);

  let content = fs.readFileSync(filePath, 'utf8');
  let changes = 0;

  // 1. Remove filter-dropdown and dropdown-btn font-size overrides
  const filterDropdownOverride = /\.filter-dropdown,\s*\.toggle-switch\s*\{\s*font-size:\s*12px;\s*\}/g;
  if (content.match(filterDropdownOverride)) {
    content = content.replace(filterDropdownOverride, '');
    changes++;
    console.log('  ✓ Removed filter-dropdown font-size override');
  }

  const dropdownBtnOverride = /\.dropdown-btn\s*\{\s*padding:\s*6px\s+12px;\s*font-size:\s*12px;\s*\}/g;
  if (content.match(dropdownBtnOverride)) {
    content = content.replace(dropdownBtnOverride, '');
    changes++;
    console.log('  ✓ Removed dropdown-btn font-size override');
  }

  // 2. Ensure dropdown-btn.active exists
  if (!content.includes('.dropdown-btn.active')) {
    const tagPillActiveRegex = /(\.tag-pill\.active\s*\{[^}]*\})/s;
    if (content.match(tagPillActiveRegex)) {
      content = content.replace(tagPillActiveRegex, `.tag-pill.active,
    .dropdown-btn.active {
      background: var(--accent);
      color: white;
      border-color: var(--accent);
    }`);
      changes++;
      console.log('  ✓ Added dropdown-btn.active styling');
    }
  }

  // 3. Ensure dropdown-arrow uses inherit color
  const dropdownArrowColorRegex = /(\.dropdown-arrow\s*\{[^}]*color:\s*)var\(--text-secondary\)([^}]*\})/s;
  if (content.match(dropdownArrowColorRegex)) {
    content = content.replace(dropdownArrowColorRegex, '$1inherit$2');
    changes++;
    console.log('  ✓ Changed dropdown-arrow color to inherit');
  }

  // 4. Add active class to styleDropdownBtn if missing
  const styleDropdownBtnRegex = /(<button\s+class="dropdown-btn\s+style-filter-btn)("\s+id="styleDropdownBtn")/;
  if (content.match(styleDropdownBtnRegex) && !content.includes('style-filter-btn active')) {
    content = content.replace(styleDropdownBtnRegex, '$1 active$2');
    changes++;
    console.log('  ✓ Added active class to styleDropdownBtn');
  }

  // 5. Remove style-filter-btn CSS rules (green/custom styling)
  const styleFilterBtnCSSRegex = /\/\*[^*]*style filter button[^*]*\*\/\s*\.style-filter-btn\s*\{[^}]*\}(\s*\.style-filter-btn[^}]*\{[^}]*\})*/gis;
  if (content.match(styleFilterBtnCSSRegex)) {
    content = content.replace(styleFilterBtnCSSRegex, '');
    changes++;
    console.log('  ✓ Removed style-filter-btn custom CSS');
  }

  // 6. Remove tag emoji generation from JavaScript
  const tagEmojiGenRegex = /const\s+emoji\s*=\s*getTagEmoji\(tag\);[\s\S]*?\$\{emoji\s*\?\s*emoji\s*\+\s*'\s*'\s*:\s*''\}/g;
  if (content.match(tagEmojiGenRegex)) {
    content = content.replace(tagEmojiGenRegex, '');
    changes++;
    console.log('  ✓ Removed tag emoji generation code');
  }

  // 7. Ensure dropdown-btn span styling exists
  if (!content.includes('.dropdown-btn span')) {
    const dropdownBtnEndRegex = /(\.dropdown-btn\.active\s*\{[^}]*\})/s;
    if (content.match(dropdownBtnEndRegex)) {
      content = content.replace(dropdownBtnEndRegex, `$1

    .dropdown-btn span {
      line-height: 1;
      display: inline;
    }`);
      changes++;
      console.log('  ✓ Added dropdown-btn span styling');
    }
  }

  if (changes > 0) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Applied ${changes} cleanup fix(es)`);
    return true;
  } else {
    console.log(`⏭️  Already clean`);
    return false;
  }
}

// Run on all main pages
const pages = [
  'index.html',
  'chat.html',
  'create.html',
  'my-companions.html',
  'profile.html',
  'pricing.html',
  'contact.html',
  'free-nsfw-image-generator.html',
  'tags.html',
  'search-results.html',
  'affiliate-program.html'
];

console.log('🧹 Final cleanup: ensuring consistent styling\n');

let totalFixed = 0;
pages.forEach(page => {
  if (fs.existsSync(page)) {
    const fixed = cleanupPage(page);
    if (fixed) totalFixed++;
  }
});

console.log(`\n✨ Done! Fixed ${totalFixed} pages.`);
