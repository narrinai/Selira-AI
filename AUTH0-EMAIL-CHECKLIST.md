# Auth0 Email Verification Checklist

## Probleem
Geen signups binnenkomen ondanks traffic → Mogelijk worden verificatie emails niet verstuurd

## Te Checken in Auth0 Dashboard

### 1. Email Provider Settings
**Locatie:** Auth0 Dashboard → Branding → Email Provider

**Check:**
- [ ] Is er een email provider geconfigureerd?
  - Standaard: Auth0's built-in provider (beperkt tot 10 emails/dag)
  - Aanbevolen: Eigen SMTP (SendGrid, Mailgun, Amazon SES)
- [ ] Status van de provider (active/disabled)
- [ ] Dagelijkse email limiet bereikt?

**Actie als niet geconfigureerd:**
```
Setup eigen SMTP provider:
1. Ga naar Branding → Email Provider
2. Kies provider (bijv. SendGrid gratis tier)
3. Voeg API keys toe
4. Test de configuratie
```

### 2. Email Templates
**Locatie:** Auth0 Dashboard → Branding → Email Templates

**Check:**
- [ ] "Verification Email" template is enabled
- [ ] Template heeft correcte FROM address
- [ ] Subject line is duidelijk
- [ ] Verification link werkt (test template)

**Aanbevolen settings:**
```
Template: Verification Email (Signup)
Status: Enabled
From: noreply@selira.ai
Subject: Verify your Selira AI account
```

### 3. Database Connection Settings
**Locatie:** Auth0 Dashboard → Authentication → Database → Username-Password-Authentication

**Check:**
- [ ] "Requires Verification" is aangevinkt
- [ ] "Disable Sign Ups" is NIET aangevinkt
- [ ] Connection is enabled voor je Application

**Huidige verwachting:**
- Email/password signups → Verificatie email vereist
- Google OAuth signups → Geen extra verificatie (email al geverifieerd door Google)

### 4. Application Settings
**Locatie:** Auth0 Dashboard → Applications → [Your App]

**Check:**
- [ ] Allowed Callback URLs bevat: `https://selira.ai/`
- [ ] Allowed Logout URLs bevat: `https://selira.ai/`
- [ ] Allowed Web Origins bevat: `https://selira.ai`
- [ ] Database connection is enabled onder "Connections" tab

### 5. Email Delivery Logs
**Locatie:** Auth0 Dashboard → Monitoring → Logs

**Check:**
- [ ] Filter op "Success/Failed Exchange" events
- [ ] Zoek naar "ss" (Successful Signup) events
- [ ] Check of er "fcpn" (Failed Change Password Notification) of email errors zijn

**Zoektermen:**
```
type:ss AND description:*verify*
type:f* AND email
```

## Testing Procedure

### Test 1: Nieuwe Signup
1. Open incognito window
2. Ga naar https://selira.ai
3. Klik "Register"
4. Vul email en wachtwoord in (min 8 characters)
5. Check verwachte flow:
   - ✅ Success message: "Check your email to verify"
   - ✅ Modal blijft open met verificatie instructies
   - ✅ Email ontvangen binnen 1-2 minuten

### Test 2: Check Email
1. Open email inbox (ook spam folder!)
2. Zoek email van Auth0 of Selira
3. Check:
   - [ ] Email ontvangen?
   - [ ] Verification link present?
   - [ ] Link werkt en redirect naar selira.ai?

### Test 3: After Verification
1. Klik verification link in email
2. Ga terug naar https://selira.ai
3. Klik "Login"
4. Vul credentials in
5. Check:
   - [ ] Login succesvol?
   - [ ] User record in Airtable aangemaakt?
   - [ ] Kan chatten met companions?

## Common Issues & Fixes

### Issue: Geen email ontvangen
**Mogelijke oorzaken:**
1. Auth0's gratis email quota (10/dag) bereikt
2. Email provider niet geconfigureerd
3. Email gaat naar spam
4. FROM address niet geverifieerd (DMARC/SPF issues)

**Fix:**
- Setup SendGrid of Mailgun (gratis tier = 100 emails/dag)
- Verifieer FROM domain in email provider
- Test email delivery via Auth0 dashboard

### Issue: "Email already exists" bij signup
**Oorzaak:** User heeft eerder geprobeerd te registreren maar niet geverifieerd

**Fix:**
- User moet password reset gebruiken, OF
- Admin moet user deleten in Auth0 dashboard (Users & Roles → Users)

### Issue: Verification link expired
**Oorzaak:** Default expiration is 5 dagen

**Fix:**
- Resend verification email via Auth0 Management API
- Of: user moet opnieuw registreren

## Aanbevolen Setup

Voor productie omgeving:

1. **Email Provider:** SendGrid (100 emails/dag gratis)
2. **FROM Address:** noreply@selira.ai (verifieer domain)
3. **Email Template:** Custom branded template met Selira logo
4. **Verification Required:** Ja (security)
5. **Monitoring:** Setup alerts voor failed email delivery

## Next Steps

1. ✅ Code changes gedeployed (betere UX messaging)
2. ⏳ Check Auth0 email provider configuratie
3. ⏳ Test real signup flow
4. ⏳ Monitor logs voor errors
5. ⏳ Setup proper email provider als nog niet gedaan
