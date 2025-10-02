# Selira AI - Auth0 Email Templates

Deze folder bevat de branded email templates voor Auth0 in Selira huisstijl.

## Templates

1. **verification-email.html** - Email verificatie bij nieuwe accounts
2. **change-password-email.html** - Wachtwoord reset email
3. **welcome-email.html** - Welkomst email na verificatie (optioneel)

## Installatie in Auth0

### 1. Login bij Auth0 Dashboard
Ga naar: https://manage.auth0.com

### 2. Navigeer naar Email Templates
`Branding → Email Templates`

### 3. Verification Email
- Selecteer **"Verification Email (using Link)"**
- Enable de custom template (toggle aan)
- **Subject**: `Verify your email for Selira AI`
- **From**: `Selira AI <noreply@selira.ai>`
- **Result URL**: `https://selira.ai`
- **URL Lifetime**: 432000 seconden (5 dagen)
- Plak de HTML van `verification-email.html`
- Klik **Save**

### 4. Change Password Email
- Selecteer **"Change Password"**
- Enable de custom template
- **Subject**: `Reset your password - Selira AI`
- **From**: `Selira AI <noreply@selira.ai>`
- **Result URL**: `https://selira.ai`
- **URL Lifetime**: 86400 seconden (24 uur)
- Plak de HTML van `change-password-email.html`
- Klik **Save**

### 5. Welcome Email (Optioneel)
- Selecteer **"Welcome Email"**
- Enable de custom template
- **Subject**: `Welcome to Selira AI! 🎉`
- **From**: `Selira AI <noreply@selira.ai>`
- Plak de HTML van `welcome-email.html`
- Klik **Save**

## Email Configuratie

### Custom Email Domain (Aanbevolen)
Voor betere deliverability:

1. Ga naar `Branding → Email Provider`
2. Kies **Custom Email Provider** (bijv. SendGrid, Mailgun)
3. Configureer SPF, DKIM en DMARC records
4. Verifieer `noreply@selira.ai` domain

### Test Emails
Voordat je live gaat:

1. Ga naar `Branding → Email Templates`
2. Selecteer een template
3. Klik **"Send Test Email"**
4. Controleer styling in verschillende email clients

## Design Elementen

### Kleuren
- **Primary Gold**: `#d4a574`
- **Dark Background**: `#1a1a1a` → `#2d2d2d` (gradient)
- **Text Dark**: `#1a1a1a`
- **Text Gray**: `#666666`
- **Text Light Gray**: `#999999`
- **Background**: `#f5f5f5`
- **Box Background**: `#faf8f6`

### Fonts
- **Headings**: Playfair Display (700)
- **Body**: Inter (400, 600)
- **Fallbacks**: System fonts voor compatibility

### Layout
- **Max Width**: 600px (37.5em)
- **Border Radius**: 12-16px
- **Padding**: 32-40px
- **Button**: Gouden achtergrond, witte tekst, 12px radius

## Email Client Compatibility

De templates zijn getest voor:
- ✅ Gmail (Web, iOS, Android)
- ✅ Outlook (Web, Desktop)
- ✅ Apple Mail (macOS, iOS)
- ✅ Yahoo Mail
- ✅ ProtonMail

## Variabelen

Auth0 Liquid variables gebruikt in templates:

- `{{ user.email }}` - Email adres van gebruiker
- `{{ url }}` - Verificatie/reset link
- `{{ friendly_name }}` - App naam (Selira AI)
- `{{ support_url }}` - Support URL (optioneel)

## Support

Voor vragen over de email templates:
- Email: info@narrin.ai
- GitHub: [Selira AI Repository]

## Changelog

### 2025-02-10
- ✅ Verification email template in Selira branding
- ✅ Change password email template
- ✅ Welcome email template
- ✅ Documentatie toegevoegd
