#!/usr/bin/env node

// Simple test script to verify avatar generation API is working

const fetch = require('node-fetch');

const API_BASE = 'https://selira.ai/.netlify/functions';

async function testAvatarGeneration() {
  try {
    console.log('🧪 Testing avatar generation API...');

    const testPayload = {
      characterName: 'Sophia Chen',
      characterTitle: 'Beautiful Chinese Realistic Companion',
      category: 'Romance'
    };

    console.log('📤 Sending test request:', testPayload);

    const response = await fetch(`${API_BASE}/selira-generate-companion-avatar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPayload),
      timeout: 120000 // 2 minute timeout
    });

    console.log('📡 Response status:', response.status);

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Success:', result);

      if (result.success && result.avatarUrl) {
        console.log('🎨 Avatar URL:', result.avatarUrl);
        console.log('✅ Avatar generation API is working!');
      } else {
        console.log('❌ API response missing avatar URL:', result);
      }
    } else {
      const errorText = await response.text();
      console.error('❌ API Error:', errorText);
    }

  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

// Run the test
console.log('🚀 Starting avatar generation API test\n');
testAvatarGeneration();
