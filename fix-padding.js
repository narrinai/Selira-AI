const fs = require('fs');
const path = require('path');

const files = [
  'pricing.html',
  'profile.html',
  'create.html',
  'my-companions.html',
  'contact.html',
  'free-nsfw-image-generator.html',
  'tags.html',
  'search-results.html',
  'affiliate-program.html'
];

files.forEach(file => {
  const filePath = path.join(__dirname, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Change section padding from 32px 40px to 12px 30px to match index.html
  content = content.replace(
    /padding: 32px 40px;/g,
    'padding: 12px 30px;'
  );

  // Also update header-top padding from 8px 40px to 8px 30px
  content = content.replace(
    /(\.header-top\s*{\s*display:\s*flex;\s*justify-content:\s*space-between;\s*align-items:\s*center;\s*)padding: 8px 40px;/g,
    '$1padding: 8px 30px;'
  );

  fs.writeFileSync(filePath, content);
  console.log(`✅ Updated padding in ${file}`);
});

console.log('\n✨ Done! All pages now have left-aligned padding like index.html');
