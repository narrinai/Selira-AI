require('dotenv').config();

console.log('🔍 Checking environment variables...');
console.log('');

console.log('Standard Airtable vars:');
console.log(`AIRTABLE_BASE_ID: ${process.env.AIRTABLE_BASE_ID || 'NOT SET'}`);
console.log(`AIRTABLE_TOKEN: ${process.env.AIRTABLE_TOKEN || 'NOT SET'}`);
console.log('');

console.log('Selira Airtable vars:');
console.log(`AIRTABLE_BASE_ID_SELIRA: ${process.env.AIRTABLE_BASE_ID_SELIRA || 'NOT SET'}`);
console.log(`AIRTABLE_TOKEN_SELIRA: ${process.env.AIRTABLE_TOKEN_SELIRA || 'NOT SET'}`);
console.log('');

console.log('All environment variables containing "AIRTABLE":');
Object.keys(process.env).filter(key => key.includes('AIRTABLE')).forEach(key => {
  const value = process.env[key];
  console.log(`${key}: ${value ? value.substring(0, 20) + '...' : 'NOT SET'}`);
});