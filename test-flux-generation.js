// Test script for Flux Schnell anime generation

const testCases = [
  {
    name: 'Anime Test',
    data: {
      characterName: 'Sakura',
      characterTitle: 'Magical Girl',
      category: 'anime-manga'
    }
  },
  {
    name: 'Realistic Test', 
    data: {
      characterName: 'John Smith',
      characterTitle: 'Business Executive',
      category: 'business'
    }
  }
];

async function testFluxGeneration() {
  console.log('🧪 Testing Flux Schnell generation...');
  
  for (const testCase of testCases) {
    console.log(`\n📋 Testing: ${testCase.name}`);
    console.log('📤 Sending data:', testCase.data);
    
    const startTime = Date.now();
    
    try {
      const response = await fetch('/.netlify/functions/generate-avatar-replicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testCase.data)
      });
      
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;
      
      console.log(`⏱️ Generation time: ${duration} seconds`);
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Success!');
        console.log('🖼️ Image URL:', result.imageUrl);
        console.log('📝 Prompt used:', result.prompt);
        
        // Create img element to test loading
        const img = document.createElement('img');
        img.src = result.imageUrl;
        img.style.cssText = 'max-width: 300px; border: 2px solid #d4a574; border-radius: 8px; margin: 10px;';
        img.alt = `Generated ${testCase.name}`;
        document.body.appendChild(img);
        
      } else {
        const error = await response.json();
        console.error('❌ Error:', error);
      }
      
    } catch (error) {
      console.error('💥 Request failed:', error);
    }
  }
}

// Auto-run test when script loads
testFluxGeneration();