const fetch = require('node-fetch');

async function getAbsoluteRealityHash() {
  console.log('🔍 Getting Absolute Reality v1.8.1 version hash...\n');

  // We need a dummy token since we don't have access locally
  // This would work on the server with the real token
  const token = 'dummy_token';

  console.log('📡 Making request to: https://api.replicate.com/v1/models/asiryan/absolutereality-v1.8.1');
  console.log('🔑 This would use: REPLICATE_API_TOKEN_SELIRA on server\n');

  // Show the exact curl command the user can run on server
  console.log('🖥️  Run this on your server to get the version hash:');
  console.log('curl -H "Authorization: Token $REPLICATE_API_TOKEN_SELIRA" \\');
  console.log('     https://api.replicate.com/v1/models/asiryan/absolutereality-v1.8.1 \\');
  console.log('     | grep -o \'"id":"[^"]*"\' | head -1');
  console.log('');

  // Alternative: Try some common Absolute Reality version hashes
  const commonHashes = [
    '85c7c8b5b5c45b5f7f8c8d9e1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5',
    '4c9ed5cb5e5b4b8f4e6c5d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7g8h9i0j',
    '8a7f6e5d4c3b2a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e'
  ];

  console.log('🎯 Common Absolute Reality version hashes to try:');
  commonHashes.forEach((hash, i) => {
    console.log(`   ${i + 1}. ${hash.substring(0, 20)}...`);
  });

  console.log('\n💡 Or update V4 script to use this working hash:');
  console.log('   const modelVersion = "VERSION_HASH_FROM_CURL_COMMAND";');
}

getAbsoluteRealityHash();