# Airtable Setup voor Content Moderatie

## Vereiste Velden in Users Table

Om de extreme content moderatie en user ban functionaliteit te laten werken, moeten de volgende velden worden toegevoegd aan de **Users** table in Airtable:

### 1. `is_banned` (Checkbox)
- **Type**: Checkbox
- **Beschrijving**: Geeft aan of een gebruiker is verbannen
- **Default**: Unchecked (false)
- **Gebruik**: Automatisch ingesteld op `true` na 3 content violations

### 2. `ban_reason` (Long text)
- **Type**: Long text
- **Beschrijving**: Reden waarom de gebruiker is verbannen
- **Gebruik**: Automatisch ingevuld bij auto-ban met details over violations

### 3. `content_violations` (Number)
- **Type**: Number
- **Format**: Integer
- **Default**: 0
- **Beschrijving**: Aantal keren dat een gebruiker content policy heeft overtreden
- **Gebruik**: Automatisch verhoogd bij elke violation. Bij 3+ violations wordt gebruiker automatisch gebanned

### 4. `flagged_at` (Date & Time)
- **Type**: Date & time (with time)
- **Beschrijving**: Tijdstip van laatste content violation
- **Gebruik**: Wordt bijgewerkt elke keer dat een violation wordt gedetecteerd

### 5. `last_violation_reason` (Long text)
- **Type**: Long text
- **Beschrijving**: Categorie/reden van de laatste violation
- **Gebruik**: Bijvoorbeeld "CSAM", "Human Trafficking", "Terrorism/Violence", etc.

## Installatie Instructies

1. **Open je Selira AI Airtable Base**
   - Ga naar https://airtable.com
   - Open de base met ID: `app5Xqa4KmvZ8wvaV`

2. **Navigeer naar de Users table**

3. **Voeg de volgende velden toe** (klik op "+" rechts van de laatste kolom):

   **Veld 1: is_banned**
   - Field type: Checkbox
   - Field name: `is_banned`
   - Klik "Create field"

   **Veld 2: ban_reason**
   - Field type: Long text
   - Field name: `ban_reason`
   - Klik "Create field"

   **Veld 3: content_violations**
   - Field type: Number
   - Field name: `content_violations`
   - Format: Integer
   - Klik "Create field"

   **Veld 4: flagged_at**
   - Field type: Date
   - Field name: `flagged_at`
   - Include a time field: ✅ (checkbox aan)
   - Time format: 24 hour
   - Klik "Create field"

   **Veld 5: last_violation_reason**
   - Field type: Long text
   - Field name: `last_violation_reason`
   - Klik "Create field"

## Hoe het Content Moderatie Systeem Werkt

### Flow bij een Chat Message

```
1. User stuurt message → content-moderation.js check
2. Is user al banned? → JA: Return 403 error
3. Rule-based check (regex patterns) → MATCH: Flag user + Block message
4. AI-based check (Mistral/OpenAI) → VIOLATION: Flag user + Block message
5. Alles veilig → Process message normaal
```

### Auto-Ban Systeem

- **1e violation**: User wordt geflagged, message geblokt, `content_violations` = 1
- **2e violation**: User wordt geflagged, message geblokt, `content_violations` = 2
- **3e violation**: User wordt **AUTOMATISCH GEBANNED**, `is_banned` = true

### Verboden Content Categorieën

Het systeem detecteert en blokkeert de volgende content:

1. **CSAM** (Child Sexual Abuse Material) - ZERO TOLERANCE
   - Automatische ban bij eerste violation

2. **Human Trafficking**
   - Automatische ban bij eerste violation

3. **Terrorism/Violence**
   - 3-strikes regel

4. **Illegal Drugs** (manufacturing/distribution)
   - 3-strikes regel

5. **Self-harm**
   - Content wordt geblokt en user krijgt onmiddellijk crisis resources
   - **Internationale ondersteuning** - Modal toont hulplijnen voor 8+ landen:
     - 🇺🇸 United States: 988 Suicide & Crisis Lifeline
     - 🇬🇧 United Kingdom: Samaritans (116 123)
     - 🇳🇱 Netherlands: 113 Suicide Prevention (0800-0113)
     - 🇩🇪 Germany: Telefonseelsorge (0800-1110111)
     - 🇫🇷 France: SOS Amitié (09 72 39 40 50)
     - 🇨🇦 Canada: Crisis Services Canada (988)
     - 🇦🇺 Australia: Lifeline (13 11 14)
     - 🌍 International: Befrienders Worldwide (30+ landen)
   - **Alle teksten in het Engels** (default internationale taal)
   - Duidelijke boodschap: "This platform cannot provide professional help. An AI chatbot is not a substitute for professional mental health care."
   - Geen automatische ban (user heeft mogelijk hulp nodig)
   - Bevat directe links naar websites en chat services
   - Emergency instructie: "Call your local emergency number (911 in US/CA, 112 in EU, 999 in UK)"

## Optionele: Mistral API Key

Voor betere AI-based moderation, voeg toe aan `.env`:

```bash
MISTRAL_API_KEY="your-mistral-api-key-here"
```

Zonder deze key gebruikt het systeem:
1. OpenRouter met Mistral (als OPENROUTER_API_KEY beschikbaar is)
2. Rule-based detection (regex patterns) - altijd beschikbaar als fallback

## Testing

Na het toevoegen van de velden, test je het systeem door:

1. **Test normale message** (moet werken):
   ```
   "Hey, how are you today?"
   ```

2. **Test geblokte content** (moet geblokt worden):
   - Probeer GEEN echte illegale content te testen!
   - Het systeem zal automatisch violations detecteren en de user flaggen

3. **Check Airtable**:
   - Open Users table
   - Zoek naar je test user
   - Check of `content_violations`, `flagged_at`, en `last_violation_reason` correct zijn bijgewerkt

## Handmatig een User Unbannen

Als je een user per ongeluk gebanned is en je wilt deze unbannen:

1. Open Airtable Users table
2. Zoek de gebruiker
3. Uncheck `is_banned`
4. Optioneel: reset `content_violations` naar 0
5. Optioneel: clear `ban_reason`

## Support

Bij vragen of problemen, check:
- Netlify function logs: https://app.netlify.com
- Airtable data: https://airtable.com
- Console logs in browser developer tools
