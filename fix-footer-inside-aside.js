const fs = require('fs');
const path = require('path');

const files = [
  'create.html',
  'my-companions.html',
  'profile.html',
  'pricing.html',
  'contact.html',
  'free-nsfw-image-generator.html',
  'search-results.html',
  'affiliate-program.html'
];

files.forEach(file => {
  const filePath = path.join(__dirname, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Remove footer links that are OUTSIDE aside
  // Pattern: </aside> followed by footer links and then another </aside>
  const outsidePattern = /(<\/aside>\s*)<!-- Footer Links \(Desktop only\) -->\s*<div class="sidebar-footer-links">[\s\S]*?<\/div>\s*<\/aside>/;

  if (outsidePattern.test(content)) {
    // First, extract the footer links HTML
    const match = content.match(/<!-- Footer Links \(Desktop only\) -->\s*<div class="sidebar-footer-links">([\s\S]*?)<\/div>/);
    const footerLinksContent = match ? match[1] : '';

    // Remove the incorrectly placed footer links (outside aside)
    content = content.replace(
      /(<\/aside>\s*)<!-- Footer Links \(Desktop only\) -->\s*<div class="sidebar-footer-links">[\s\S]*?<\/div>\s*<\/aside>/,
      '$1'
    );

    // Now add footer links INSIDE aside, before the closing </nav> tag
    content = content.replace(
      /(      <\/nav>\s*)<\/aside>/,
      `$1      <!-- Footer Links (Desktop only) -->
      <div class="sidebar-footer-links">${footerLinksContent}</div>
    </aside>`
    );

    console.log(`✅ Fixed ${file} - moved footer links inside aside`);
  } else {
    console.log(`⚠️  ${file} - footer links already correctly placed or not found`);
  }

  fs.writeFileSync(filePath, content);
});

console.log('\n✨ Done! All footer links are now inside aside tags');
