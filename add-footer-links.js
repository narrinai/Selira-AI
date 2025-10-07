const fs = require('fs');

const FOOTER_LINKS_HTML = `
      <!-- Footer Links (Desktop only) -->
      <div class="sidebar-footer-links">
        <a href="/contact" class="footer-link">Contact</a>
        <a href="/privacy-policy" class="footer-link">Privacy Policy</a>
        <a href="/terms-and-conditions" class="footer-link">Terms & Conditions</a>
      </div>`;

const FOOTER_LINKS_CSS = `
    /* Sidebar Footer Links (Desktop only) */
    .sidebar-footer-links {
      margin-top: auto;
      padding: 16px 10px 20px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .footer-link {
      color: rgba(255, 255, 255, 0.5);
      text-decoration: none;
      font-size: 11px;
      line-height: 1.4;
      transition: color 0.2s ease;
    }

    .footer-link:hover {
      color: rgba(255, 255, 255, 0.8);
    }

    /* Hide footer links on mobile */
    @media (max-width: 768px) {
      .sidebar-footer-links {
        display: none;
      }
    }`;

function addFooterLinks(filePath) {
  console.log(`\n📄 Processing: ${filePath}`);

  let content = fs.readFileSync(filePath, 'utf8');
  let changes = 0;

  // Check if footer links already exist
  if (content.includes('sidebar-footer-links')) {
    console.log('  ⏭️  Footer links already exist');
    return false;
  }

  // 1. Add CSS for footer links (before closing </style>)
  const styleEndRegex = /(\s*<\/style>)/;
  if (content.match(styleEndRegex)) {
    content = content.replace(styleEndRegex, `${FOOTER_LINKS_CSS}$1`);
    changes++;
    console.log('  ✓ Added footer links CSS');
  }

  // 2. Add HTML footer links (before closing </nav> in sidebar)
  // Find the sidebar-nav closing tag
  const sidebarNavEndRegex = /(\s*<\/nav>\s*<\/aside>)/;
  if (content.match(sidebarNavEndRegex)) {
    content = content.replace(sidebarNavEndRegex, `${FOOTER_LINKS_HTML}$1`);
    changes++;
    console.log('  ✓ Added footer links HTML to sidebar');
  }

  if (changes > 0) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Applied ${changes} change(s)`);
    return true;
  } else {
    console.log('⏭️  Could not add footer links (sidebar structure not found)');
    return false;
  }
}

// Pages with sidebar that need footer links
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

console.log('🔗 Adding footer links to sidebar (desktop only)\n');

let totalAdded = 0;
pages.forEach(page => {
  if (fs.existsSync(page)) {
    const added = addFooterLinks(page);
    if (added) totalAdded++;
  } else {
    console.log(`⚠️  Skipping ${page} (not found)`);
  }
});

console.log(`\n✨ Done! Added footer links to ${totalAdded} pages.`);
