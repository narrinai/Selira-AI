const fs = require('fs');

function fixFooterPosition(filePath) {
  console.log(`\n📄 Processing: ${filePath}`);

  let content = fs.readFileSync(filePath, 'utf8');
  let changes = 0;

  // Check if footer links exist
  if (!content.includes('sidebar-footer-links')) {
    console.log('  ⏭️  No footer links found');
    return false;
  }

  // Check if already fixed (footer links outside nav)
  if (content.match(/sidebar-footer-links[^<]*<\/div>\s*<\/aside>/)) {
    console.log('  ⏭️  Footer links already positioned correctly');
    return false;
  }

  // Move footer links from inside </nav> to before </aside>
  // First, extract the footer links
  const footerLinksRegex = /(\s*<!-- Footer Links.*?<\/div>)/s;
  const footerLinksMatch = content.match(footerLinksRegex);

  if (!footerLinksMatch) {
    console.log('  ⚠️  Could not find footer links HTML');
    return false;
  }

  const footerLinksHTML = footerLinksMatch[1];

  // Remove footer links from current position (inside nav)
  content = content.replace(footerLinksRegex, '');
  changes++;
  console.log('  ✓ Removed footer links from inside <nav>');

  // Add footer links before </aside>
  const asideEndRegex = /(\s*<\/nav>\s*<\/aside>)/;
  if (content.match(asideEndRegex)) {
    content = content.replace(asideEndRegex, `$1${footerLinksHTML}\n    </aside>`);
    // Remove the duplicate </aside> we just created
    content = content.replace(/<\/aside>\s*<\/aside>/, '</aside>');
    changes++;
    console.log('  ✓ Added footer links before </aside>');
  }

  // Update sidebar-nav to not have margin-top: auto (so footer can use it)
  const sidebarNavRegex = /(\.sidebar-nav\s*\{[^}]*)\}/s;
  if (content.match(sidebarNavRegex)) {
    // Remove any margin-top: auto from sidebar-nav if present
    content = content.replace(/(\.sidebar-nav\s*\{[^}]*)margin-top:\s*auto;([^}]*\})/s, '$1$2');
  }

  if (changes > 0) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Applied ${changes} change(s)`);
    return true;
  } else {
    console.log('⏭️  No changes needed');
    return false;
  }
}

// Pages with footer links
const pages = [
  'index.html',
  'create.html',
  'my-companions.html',
  'profile.html',
  'pricing.html',
  'contact.html',
  'free-nsfw-image-generator.html',
  'search-results.html',
  'affiliate-program.html'
];

console.log('📍 Moving footer links to bottom of sidebar\n');

let totalFixed = 0;
pages.forEach(page => {
  if (fs.existsSync(page)) {
    const fixed = fixFooterPosition(page);
    if (fixed) totalFixed++;
  }
});

console.log(`\n✨ Done! Fixed ${totalFixed} pages.`);
