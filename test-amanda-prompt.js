const fetch = require('node-fetch');
require('dotenv').config();

async function test() {
  const response = await fetch('https://selira.ai/.netlify/functions/selira-characters?limit=1000&includePrivate=true');
  const data = await response.json();

  const amanda = data.characters.find(c => c.slug === 'amanda-monroe');

  if (!amanda) {
    console.log('Amanda not found');
    return;
  }

  const traits = {
    style: amanda.companion_type || 'realistic',
    sex: amanda.sex || 'female',
    ethnicity: amanda.ethnicity || 'white',
    hairLength: amanda.hair_length || 'medium',
    hairColor: amanda.hair_color || 'brown'
  };

  const ethnicityMap = {
    'white': 'Caucasian/European features',
    'black': 'African/Black features',
    'korean': 'Korean features'
  };

  const hairLengthMap = {
    'short': 'short hair',
    'medium': 'medium length hair, shoulder-length hair',
    'long': 'long hair, flowing hair'
  };

  const hairColorMap = {
    'brown': 'brown hair',
    'black': 'black hair',
    'blonde': 'blonde hair, golden hair',
    'red': 'red hair, ginger hair'
  };

  const ethnicityDesc = ethnicityMap[traits.ethnicity] || 'diverse features';
  const hairLengthDesc = hairLengthMap[traits.hairLength] || 'styled hair';
  const hairColorDesc = hairColorMap[traits.hairColor] || 'brown hair';

  console.log('Amanda Monroe Traits:');
  console.log('  ethnicity:', traits.ethnicity, '→', ethnicityDesc);
  console.log('  hairLength:', traits.hairLength, '→', hairLengthDesc);
  console.log('  hairColor:', traits.hairColor, '→', hairColorDesc);
  console.log('');
  console.log('Full prompt would be:');
  console.log('  beautiful woman, ' + ethnicityDesc + ', ' + hairLengthDesc + ', ' + hairColorDesc + ', attractive face, seductive expression...');
}

test().catch(console.error);
