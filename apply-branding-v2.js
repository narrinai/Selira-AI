const fs = require('fs');

// Branding configuration
const NEW_ACCENT = '#ce93d8';
const NEW_ACCENT_HOVER = '#ba68c8';

// SVG Icons (18x18px)
const ICONS = {
  home: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>',
  message: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>',
  plus: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>',
  image: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>',
  user: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>',
  dollar: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>',
  users: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>',
  login: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>',
  menu: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>',
  search: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>',
  close: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>'
};

function applyBranding(filePath) {
  console.log(`\n📄 Processing: ${filePath}`);

  let content = fs.readFileSync(filePath, 'utf8');
  let changes = 0;

  // 1. Update CSS accent colors
  const accentRegex = /(--accent:\s*)(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}|rgb\([^)]+\)|#d4a574)/g;
  if (content.match(accentRegex)) {
    content = content.replace(accentRegex, `$1${NEW_ACCENT}`);
    changes++;
    console.log('  ✓ Updated --accent color');
  }

  const accentHoverRegex = /(--accent-hover:\s*)(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}|rgb\([^)]+\)|#c19456)/g;
  if (content.match(accentHoverRegex)) {
    content = content.replace(accentHoverRegex, `$1${NEW_ACCENT_HOVER}`);
    changes++;
    console.log('  ✓ Updated --accent-hover color');
  }

  // 2. Fix nav-item-icon alignment - ensure flexbox properties
  if (content.includes('.nav-item-icon')) {
    // Check if already has flexbox
    if (!content.match(/\.nav-item-icon[^}]*display:\s*flex/s)) {
      // Replace the entire .nav-item-icon block
      const navItemIconRegex = /(\.nav-item-icon\s*\{[^}]*\})/s;
      if (content.match(navItemIconRegex)) {
        const replacement = `.nav-item-icon {
      font-size: 14px;
      width: 18px;
      height: 18px;
      text-align: center;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }`;
        content = content.replace(navItemIconRegex, replacement);
        changes++;
        console.log('  ✓ Fixed nav-item-icon alignment');
      }
    }

    // Add or update SVG icon styling
    if (!content.includes('.nav-item-icon svg')) {
      const navItemIconEndRegex = /(\.nav-item-icon\s*\{[^}]*\})/s;
      if (content.match(navItemIconEndRegex)) {
        content = content.replace(navItemIconEndRegex, `$1

    .nav-item-icon svg {
      width: 18px;
      height: 18px;
      stroke: var(--accent);
    }`);
        changes++;
        console.log('  ✓ Added SVG icon styling');
      }
    }
  }

  // 3. Replace emoji icons with SVG
  const emojiReplacements = [
    { emoji: '👥', icon: ICONS.home },
    { emoji: '💬', icon: ICONS.message },
    { emoji: '➕', icon: ICONS.plus },
    { emoji: '📸', icon: ICONS.image },
    { emoji: '👤', icon: ICONS.user },
    { emoji: '💎', icon: ICONS.dollar },
    { emoji: '🤝', icon: ICONS.users },
    { emoji: '🔑', icon: ICONS.login },
    { emoji: '☰', icon: ICONS.menu },
    { emoji: '🔍', icon: ICONS.search },
    { emoji: '✕', icon: ICONS.close },
    { emoji: '❌', icon: ICONS.close }
  ];

  emojiReplacements.forEach(({ emoji, icon }) => {
    const matches = (content.match(new RegExp(emoji, 'g')) || []).length;
    if (matches > 0) {
      content = content.replace(new RegExp(emoji, 'g'), icon);
      changes++;
      console.log(`  ✓ Replaced ${emoji} (${matches} occurrences)`);
    }
  });

  // 4. Remove emojis from tags in JavaScript code
  // Find tag generation code and remove emojis
  if (content.includes('tag.emoji')) {
    const tagMapRegex = /return `<a[^>]*class="tag-pill"[^>]*>[^<]*<span class="tag-emoji">[^<]+<\/span>\s*\$\{tag\}/g;
    if (content.match(tagMapRegex)) {
      content = content.replace(tagMapRegex, 'return `<a href="#" class="tag-pill" data-tag="${tag}">${tag}');
      changes++;
      console.log('  ✓ Removed emojis from tag generation');
    }
  }

  // Also handle simpler tag patterns
  const tagEmojiPattern = /<span class="tag-emoji">([^<]+)<\/span>\s*/g;
  const tagEmojiMatches = (content.match(tagEmojiPattern) || []).length;
  if (tagEmojiMatches > 0) {
    content = content.replace(tagEmojiPattern, '');
    changes++;
    console.log(`  ✓ Removed ${tagEmojiMatches} tag emoji span(s)`);
  }

  // 5. Fix style-filter-btn (Realistic dropdown) - change from green to purple
  if (content.includes('style-filter-btn')) {
    // Remove green background and make it purple
    const greenStyleRegex = /(\.style-filter-btn\s*\{[^}]*background:\s*)(#10b981|#0d9488|rgb\(16,\s*185,\s*129\)|linear-gradient[^;]+)([^}]*\})/gs;
    if (content.match(greenStyleRegex)) {
      content = content.replace(greenStyleRegex, '$1var(--accent) !important$3');
      changes++;
      console.log('  ✓ Changed style-filter-btn to purple');
    }

    // Ensure it has active state
    if (!content.match(/\.style-filter-btn[^}]*\.active/s)) {
      const styleBtnEndRegex = /(\.style-filter-btn\s*\{[^}]*\})/s;
      content = content.replace(styleBtnEndRegex, `$1

    .style-filter-btn.active {
      background: var(--accent) !important;
      color: white !important;
    }`);
      changes++;
      console.log('  ✓ Added style-filter-btn active state');
    }
  }

  // 6. Update dropdown-btn span alignment
  if (!content.includes('.dropdown-btn span')) {
    const dropdownBtnRegex = /(\.dropdown-btn[^}]*\})/s;
    if (content.match(dropdownBtnRegex)) {
      content = content.replace(dropdownBtnRegex, `$1

    .dropdown-btn span {
      line-height: 1;
      display: inline;
    }`);
      changes++;
      console.log('  ✓ Added dropdown-btn span styling');
    }
  }

  // 7. Remove gradients
  const gradientRegex = /linear-gradient\(135deg,\s*#[0-9a-fA-F]{6},\s*#[0-9a-fA-F]{6}\)/g;
  const gradientMatches = (content.match(gradientRegex) || []).length;
  if (gradientMatches > 0) {
    content = content.replace(gradientRegex, 'var(--accent)');
    changes++;
    console.log(`  ✓ Replaced ${gradientMatches} gradient(s)`);
  }

  // Write back
  if (changes > 0) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Applied ${changes} change(s) to ${filePath}`);
    return true;
  } else {
    console.log(`⏭️  No changes needed`);
    return false;
  }
}

// Main execution
const args = process.argv.slice(2);
const testMode = args.includes('--test');

if (testMode) {
  console.log('🧪 TEST MODE: Applying branding to index.html only\n');
  applyBranding('index.html');
  console.log('\n✨ Test done! Check index.html');
  console.log('If good, run: node apply-branding-v2.js --all');
} else if (args.includes('--all')) {
  console.log('🎨 Applying branding fixes to all pages\n');

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

  let totalChanges = 0;
  pages.forEach(page => {
    if (fs.existsSync(page)) {
      const changed = applyBranding(page);
      if (changed) totalChanges++;
    } else {
      console.log(`⚠️  Skipping ${page} (not found)`);
    }
  });

  console.log(`\n✨ Done! Updated ${totalChanges} pages.`);
} else {
  console.log('Usage:');
  console.log('  node apply-branding-v2.js --test    # Test on index.html');
  console.log('  node apply-branding-v2.js --all     # Apply to all pages');
}
