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
  const accentRegex = /(--accent:\s*)(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}|rgb\([^)]+\))/g;
  if (content.match(accentRegex)) {
    content = content.replace(accentRegex, `$1${NEW_ACCENT}`);
    changes++;
    console.log('  ✓ Updated --accent color');
  }

  const accentHoverRegex = /(--accent-hover:\s*)(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}|rgb\([^)]+\))/g;
  if (content.match(accentHoverRegex)) {
    content = content.replace(accentHoverRegex, `$1${NEW_ACCENT_HOVER}`);
    changes++;
    console.log('  ✓ Updated --accent-hover color');
  }

  // 2. Update nav-item-icon styling for proper alignment
  if (content.includes('.nav-item-icon')) {
    // Update existing .nav-item-icon to include flexbox properties
    const navItemIconRegex = /(\.nav-item-icon\s*\{)([^}]*)(width:\s*)(\d+px)([^}]*\})/;
    if (content.match(navItemIconRegex) && !content.includes('display: flex')) {
      content = content.replace(navItemIconRegex,
        '$1$2$3 18px;\n      height: 18px;\n      text-align: center;\n      display: flex;\n      align-items: center;\n      justify-content: center;\n      flex-shrink: 0;$5');
      changes++;
      console.log('  ✓ Updated nav-item-icon with flexbox alignment');
    }

    // Add SVG icon styling if not present
    if (!content.includes('.nav-item-icon svg')) {
      const navItemIconEndRegex = /(\.nav-item-icon\s*\{[^}]*\})/;
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

  // 3. Replace emoji icons in sidebar with SVG (common patterns)
  const emojiReplacements = [
    { emoji: '👥', icon: ICONS.home, text: 'Discover' },
    { emoji: '💬', icon: ICONS.message, text: 'My Companions' },
    { emoji: '➕', icon: ICONS.plus, text: 'Create' },
    { emoji: '📸', icon: ICONS.image, text: 'Image Generator' },
    { emoji: '👤', icon: ICONS.user, text: 'Profile' },
    { emoji: '💎', icon: ICONS.dollar, text: 'Pricing' },
    { emoji: '🤝', icon: ICONS.users, text: 'Affiliate' },
    { emoji: '🔑', icon: ICONS.login, text: 'Login' },
    { emoji: '☰', icon: ICONS.menu, text: 'menu' },
    { emoji: '🔍', icon: ICONS.search, text: 'search' },
    { emoji: '✕', icon: ICONS.close, text: 'close' },
    { emoji: '❌', icon: ICONS.close, text: 'error' }
  ];

  emojiReplacements.forEach(({ emoji, icon }) => {
    const emojiPattern = new RegExp(emoji, 'g');
    const matches = (content.match(emojiPattern) || []).length;
    if (matches > 0) {
      // Replace in nav-item-icon context
      const navIconPattern = new RegExp(`(<span class="nav-item-icon">)${emoji}(</span>)`, 'g');
      content = content.replace(navIconPattern, `$1${icon}$2`);

      // Replace standalone in buttons
      const standalonePattern = new RegExp(`>${emoji}<`, 'g');
      content = content.replace(standalonePattern, `>${icon}<`);

      if (matches > 0) {
        changes++;
        console.log(`  ✓ Replaced ${emoji} with SVG icon (${matches} occurrences)`);
      }
    }
  });

  // 4. Update tag pill styling (make inverted by default)
  if (content.includes('.tag-pill')) {
    // Check if already has the inverted styling
    if (!content.includes('tag-pill,') && content.includes('.tag-pill {')) {
      // Find and update tag-pill styling
      const tagPillRegex = /(\.tag-pill\s*\{[^}]*background:\s*)([^;]+)(;[^}]*\})/;
      if (content.match(tagPillRegex) && !content.includes('var(--bg-secondary)')) {
        content = content.replace(tagPillRegex, '$1var(--bg-secondary)$3');
        changes++;
        console.log('  ✓ Updated tag-pill to inverted styling');
      }
    }
  }

  // 5. Remove gradient buttons and use solid colors
  const gradientRegex = /linear-gradient\(135deg,\s*#[0-9a-fA-F]{6},\s*#[0-9a-fA-F]{6}\)/g;
  const gradientMatches = (content.match(gradientRegex) || []).length;
  if (gradientMatches > 0) {
    content = content.replace(gradientRegex, 'var(--accent)');
    changes++;
    console.log(`  ✓ Replaced ${gradientMatches} gradient(s) with solid color`);
  }

  // Write back to file
  if (changes > 0) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Applied ${changes} branding change(s) to ${filePath}`);
    return true;
  } else {
    console.log(`⏭️  No changes needed for ${filePath}`);
    return false;
  }
}

// Main execution
const args = process.argv.slice(2);
const testMode = args.includes('--test');

if (testMode) {
  console.log('🧪 TEST MODE: Applying branding to pricing.html only\n');
  const success = applyBranding('pricing.html');

  if (success) {
    console.log('\n✨ Test completed! Check pricing.html to verify the changes.');
    console.log('If everything looks good, run: node apply-branding.js --all');
  }
} else if (args.includes('--all')) {
  console.log('🎨 Applying branding to all pages\n');

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
      console.log(`⚠️  Skipping ${page} (file not found)`);
    }
  });

  console.log(`\n✨ Done! Updated ${totalChanges} out of ${pages.length} pages.`);
} else {
  console.log('Usage:');
  console.log('  node apply-branding.js --test    # Test on pricing.html first');
  console.log('  node apply-branding.js --all     # Apply to all 11 pages');
}
