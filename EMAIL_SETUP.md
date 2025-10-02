# Email Preferences & SendGrid Setup

## Overzicht

Dit document legt uit hoe de email preferences werken en hoe SendGrid is geconfigureerd om deze te respecteren.

## Airtable Setup

### Vereiste velden in Users tabel:

1. **email_notifications** (Checkbox)
   - Standaard: `true`
   - Doel: Feature updates en belangrijke aankondigingen
   - Type: Notification emails

2. **email_marketing** (Checkbox)
   - Standaard: `false` (opt-in required)
   - Doel: Promoties en speciale aanbiedingen
   - Type: Marketing emails

## Email Types

### 1. Transactional Emails
- **Wanneer**: Wachtwoord resets, order confirmaties, etc.
- **Preferences**: Altijd verzonden (geen opt-out mogelijk)
- **Voorbeeld**: Welkomstmail, wachtwoord reset

### 2. Notification Emails
- **Wanneer**: Feature updates, belangrijke aankondigingen
- **Preferences**: User kan opt-out via `email_notifications`
- **Voorbeeld**: Nieuwe features, systeem updates

### 3. Marketing Emails
- **Wanneer**: Promoties, nieuwsbrieven, speciale aanbiedingen
- **Preferences**: User moet opt-in via `email_marketing`
- **Voorbeeld**: Kortingsacties, nieuwe companion releases

## Netlify Functions

### 1. `selira-update-email-preferences.js`
Bewaart email preferences in Airtable.

**Request:**
```javascript
POST /.netlify/functions/selira-update-email-preferences
{
  "email": "user@example.com",
  "notifications": true,
  "marketing": false
}
```

**Response:**
```javascript
{
  "success": true,
  "message": "Email preferences updated successfully",
  "preferences": {
    "notifications": true,
    "marketing": false
  }
}
```

### 2. `selira-get-email-preferences.js`
Haalt email preferences op uit Airtable.

**Request:**
```
GET /.netlify/functions/selira-get-email-preferences?email=user@example.com
```

**Response:**
```javascript
{
  "success": true,
  "preferences": {
    "notifications": true,
    "marketing": false
  }
}
```

### 3. `selira-sendgrid-send-email.js`
Verstuurt individuele emails en respecteert user preferences.

**Request:**
```javascript
POST /.netlify/functions/selira-sendgrid-send-email
{
  "email": "user@example.com",
  "type": "notification",  // "notification", "marketing", or "transactional"
  "subject": "New Feature Available",
  "text": "Check out our new feature!",
  "html": "<p>Check out our new feature!</p>"
}
```

**Response:**
```javascript
{
  "success": true,
  "message": "Email sent successfully",
  "type": "notification"
}
```

**Skipped Response (when user opted out):**
```javascript
{
  "success": false,
  "skipped": true,
  "reason": "User has disabled notification emails"
}
```

### 4. `selira-sendgrid-bulk-send.js`
Verstuurt bulk emails naar gefilterde gebruikers.

**Request:**
```javascript
POST /.netlify/functions/selira-sendgrid-bulk-send
{
  "type": "marketing",  // "notification" or "marketing"
  "subject": "Summer Sale - 50% Off!",
  "text": "Don't miss our summer sale!",
  "html": "<h1>Summer Sale</h1><p>Don't miss our summer sale!</p>",
  "filterByPlan": "Premium"  // Optional: "Free", "Basic", or "Premium"
}
```

**Response:**
```javascript
{
  "success": true,
  "sent": 150,
  "failed": 2,
  "total": 152
}
```

## Frontend Integratie

De toggles in `/profile` zijn volledig geïntegreerd:

1. **Bij laden**: Preferences worden opgehaald uit Airtable
2. **Bij wijziging**: Preferences worden direct opgeslagen in Airtable
3. **Visual feedback**: Toggle switch toont huidige status

### JavaScript functies:

- `loadEmailPreferences()` - Laadt preferences bij pagina load
- `toggleEmailSetting(type, element)` - Toggle en save preference

## SendGrid Setup

### Omgevingsvariabelen

Voeg toe aan Netlify environment variables:

```bash
SENDGRID_API_KEY_SELIRA=SG.xxxxxxxxxxxxx
SENDGRID_FROM_EMAIL_SELIRA=noreply@selira.ai
```

### NPM Package

Voeg SendGrid toe aan package.json (als die bestaat):

```bash
npm install --save @sendgrid/mail
```

Voor Netlify Functions werkt dit automatisch via de `require('@sendgrid/mail')`.

## Gebruik Voorbeelden

### Voorbeeld 1: Stuur een notification email
```javascript
const response = await fetch('/.netlify/functions/selira-sendgrid-send-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    type: 'notification',
    subject: 'New Feature: Image Generation',
    html: '<p>We just launched a new image generation feature!</p>'
  })
});
```

### Voorbeeld 2: Stuur marketing email naar Premium users
```javascript
const response = await fetch('/.netlify/functions/selira-sendgrid-bulk-send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'marketing',
    subject: 'Exclusive Premium Feature',
    html: '<p>Check out this premium-only feature!</p>',
    filterByPlan: 'Premium'
  })
});
```

### Voorbeeld 3: Stuur transactional email (altijd verzonden)
```javascript
const response = await fetch('/.netlify/functions/selira-sendgrid-send-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    type: 'transactional',
    subject: 'Welcome to Selira!',
    html: '<p>Thanks for signing up!</p>'
  })
});
```

## GDPR Compliance

✅ Users hebben volledige controle over hun email preferences
✅ Marketing emails zijn opt-in (standaard uit)
✅ Notification emails zijn opt-out (standaard aan)
✅ Transactional emails kunnen niet worden uitgezet (wettelijk toegestaan)
✅ Preferences worden opgeslagen in Airtable voor audit trail

## Testing

### Test email preferences:
1. Ga naar `/profile`
2. Toggle de switches
3. Check console logs voor API responses
4. Verifieer in Airtable dat velden zijn bijgewerkt

### Test email verzending:
```javascript
// Test in browser console of via Postman
fetch('/.netlify/functions/selira-sendgrid-send-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'jouw@email.com',
    type: 'notification',
    subject: 'Test Email',
    text: 'This is a test'
  })
}).then(r => r.json()).then(console.log);
```

## Troubleshooting

### Email wordt niet verzonden
1. Check SendGrid API key in Netlify environment variables
2. Verifieer dat `SENDGRID_FROM_EMAIL_SELIRA` een verified sender is in SendGrid
3. Check Netlify function logs: `netlify logs:function sendgrid-send-email`

### Preference niet opgeslagen
1. Verifieer Airtable velden: `email_notifications` en `email_marketing` (exact spelling!)
2. Check browser console voor errors
3. Verifieer dat user email bestaat in Airtable Users tabel

### Bulk send faalt
1. Check dat filter formula correct is
2. Verifieer dat users in Airtable de juiste velden hebben
3. SendGrid max 1000 emails per batch - script handelt dit automatisch af
