// Airtable Migration Script for Selira AI
// This script helps create the new Airtable base structure

const SELIRA_SCHEMA = {
  "Users": {
    "Auth0ID": "singleLineText",
    "Email": "email", 
    "Name": "singleLineText",
    "Plan": {
      "type": "singleSelect",
      "options": ["Free", "Pro"]
    },
    "StripeCustomerID": "singleLineText",
    "CreatedAt": "dateTime",
    "LastActive": "dateTime", 
    "MessageCount": "number",
    "TrialEndsAt": "dateTime"
  },
  
  "Characters": {
    "Name": "singleLineText",
    "Slug": "singleLineText",
    "Title": "singleLineText", 
    "Description": "multilineText",
    "Personality": "multilineText",
    "Avatar": "multipleAttachments",
    "Category": {
      "type": "singleSelect", 
      "options": ["Friendship", "Romance", "Mindfulness", "Mentorship", "Creative", "Professional"]
    },
    "Tags": {
      "type": "multipleSelects",
      "options": ["Popular", "New", "Featured", "NSFW", "SFW"]
    },
    "CreatedBy": {
      "type": "multipleRecordLinks",
      "linkedTableId": "Users"
    },
    "IsActive": "checkbox",
    "CreatedAt": "dateTime"
  },
  
  "Messages": {
    "UserID": {
      "type": "multipleRecordLinks", 
      "linkedTableId": "Users"
    },
    "CharacterSlug": "singleLineText",
    "MessageType": {
      "type": "singleSelect",
      "options": ["user", "assistant"]  
    },
    "Content": "multilineText",
    "Timestamp": "dateTime",
    "SessionID": "singleLineText"
  },
  
  "Memories": {
    "UserID": {
      "type": "multipleRecordLinks",
      "linkedTableId": "Users" 
    },
    "CharacterSlug": "singleLineText",
    "Content": "multilineText",
    "Importance": "number",
    "EmotionalState": "singleLineText",
    "Context": "singleLineText", 
    "CreatedAt": "dateTime",
    "LastAccessed": "dateTime"
  },
  
  "User_Characters": {
    "UserID": {
      "type": "multipleRecordLinks",
      "linkedTableId": "Users"
    },
    "CharacterSlug": "singleLineText", 
    "RelationshipLevel": "number",
    "LastChatAt": "dateTime",
    "MessageCount": "number",
    "IsActive": "checkbox"
  }
};

// Instructions for manual Airtable base creation:
console.log(`
🗄️ SELIRA AI AIRTABLE BASE SETUP

1. Go to airtable.com and create new base
2. Name: "Selira AI Database"  
3. Create tables with exact field names above
4. Important field mappings:
   - NetlifyUID → Auth0ID (Text field)
   - All other fields same as Narrin

5. Copy your new Base ID and API token to environment variables:
   AIRTABLE_BASE_ID_SELIRA=your_new_base_id
   AIRTABLE_TOKEN_SELIRA=your_new_token

6. Run character migration:
   node scripts/migrate-characters-to-selira.js
`);

module.exports = { SELIRA_SCHEMA };