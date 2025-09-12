// Clear localStorage for clean memory testing
console.log('🧹 Clearing all chat localStorage data...');

// Check what's in localStorage
console.log('📦 Current localStorage keys:');
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (key.startsWith('chat_')) {
    console.log(`   ${key}: ${localStorage.getItem(key).length} chars`);
  }
}

// Clear all chat history
const keysToRemove = [];
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (key.startsWith('chat_')) {
    keysToRemove.push(key);
  }
}

keysToRemove.forEach(key => {
  localStorage.removeItem(key);
  console.log(`🗑️ Removed: ${key}`);
});

console.log(`✅ Cleared ${keysToRemove.length} chat storage items`);
console.log('🔄 Refresh the page for clean memory testing!');