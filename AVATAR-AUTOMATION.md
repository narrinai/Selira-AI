# Avatar Automatisering Systeem

Dit systeem zorgt ervoor dat alle nieuwe avatar_url velden (Replicate URLs) automatisch worden gedownload naar `/avatars/` en de Airtable records worden bijgewerkt naar lokale URLs.

## 🎯 Overzicht

Het systeem heeft 3 componenten:

1. **Automatische Avatar Download** - Script dat Replicate URLs detecteert en downloadt
2. **Scheduled Function** - Netlify function die elk uur draait
3. **Manual Trigger** - Script dat handmatig uitgevoerd kan worden

## 📁 Bestanden

- `netlify/functions/selira-auto-download-avatars.js` - Netlify function voor downloads
- `netlify/functions/selira-scheduled-avatar-download.js` - Scheduled function (elk uur)
- `download-and-update-avatars.js` - Standalone script
- `check-avatar-results.js` - Verificatie script

## 🚀 Gebruik

### Handmatig uitvoeren
```bash
node download-and-update-avatars.js
```

### Via Netlify Function
```bash
curl https://selira.ai/.netlify/functions/selira-auto-download-avatars
```

### Scheduled (Automatisch)
De scheduled function draait automatisch elk uur en controleert op nieuwe Replicate URLs.

## 🔄 Workflow

1. **Avatar Generatie**: Wanneer een nieuwe avatar wordt gegenereerd (via `selira-generate-companion-avatar.js` of `selira-generate-custom-image.js`)
2. **Auto-trigger**: Avatar generatie functies triggeren automatisch de download functie
3. **Detectie**: Script zoekt naar `Avatar_URL` velden die `replicate.delivery` bevatten
4. **Download**: Elke Replicate URL wordt gedownload als `.webp` bestand
5. **Opslag**: Bestanden worden opgeslagen in `/avatars/` met unieke namen
6. **Update**: Airtable record wordt bijgewerkt naar lokale pad (`/avatars/filename.webp`)
7. **Verificatie**: Success/failure wordt gelogd

## 🔄 Automatische Triggers

Het systeem heeft **3 automatische triggers**:

1. **Immediate**: Avatar generation functions triggeren direct na succesvolle generatie
2. **Scheduled**: Elke 2 uur draait scheduled function om gemiste avatars op te halen
3. **Manual**: Handmatig uitvoeren voor bulk processing

## 📊 Bestandsnaming

Avatars worden opgeslagen als:
```
{slug}-{timestamp}.webp
```

Bijvoorbeeld:
```
sofie-x3lg-1758812172221.webp
katt-lf0a-1758812173129.webp
```

## ⚠️ Error Handling

- **404 Errors**: Replicate URLs kunnen vervallen - deze worden geskipped
- **Download Failures**: Network errors worden gelogd maar stoppen het proces niet
- **Airtable Failures**: Update errors worden gelogd per character
- **Duplicate Prevention**: Bestaande bestanden worden niet opnieuw gedownload

## 📈 Monitoring

Check voortgang met:
```bash
tail -f avatar-download.log
```

Verificatie:
```bash
node check-avatar-results.js
```

## 🔧 Environment Variables

Vereist:
- `AIRTABLE_BASE_ID` of `AIRTABLE_BASE`
- `AIRTABLE_TOKEN`

## 🎉 Resultaat

Na uitvoering:
- ✅ Alle beschikbare Replicate URLs zijn gedownload
- ✅ Avatar_URL velden verwijzen naar lokale bestanden
- ✅ Avatars laden sneller (lokaal gehost)
- ✅ Geen externe afhankelijkheden meer voor avatars

## 📝 Logs

Het systeem logt:
- Aantal gevonden Replicate URLs
- Download succes/failures
- Airtable update status
- Finale statistieken (successful/failed/skipped)