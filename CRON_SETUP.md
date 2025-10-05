# Cron Job Setup voor Avatar Fix

## Probleem
Replicate URLs zijn tijdelijk en geven na enkele uren/dagen 404 errors. Nieuwe companions krijgen een Replicate URL bij aanmaak, die moet worden omgezet naar een lokale `/avatars/` URL.

## Oplossing
Cron job draait elke 8 uur en:
1. Vindt alle companions met Replicate URLs
2. Download de avatars naar lokale `/avatars/` folder
3. Update Airtable met lokale URLs
4. Commit en push naar Git (triggert Netlify deployment)

## Setup Instructies

### 1. Test het script handmatig
```bash
cd /Users/sebastiaansmits/Documents/Selira\ AI
node fix-replicate-urls.js
```

### 2. Test de cron script
```bash
/Users/sebastiaansmits/Documents/Selira\ AI/cron-avatar-fix.sh
```

### 3. Open crontab editor
```bash
crontab -e
```

### 4. Voeg deze regel toe (draait elke 8 uur)
```
0 */8 * * * /Users/sebastiaansmits/Documents/Selira\ AI/cron-avatar-fix.sh >> /Users/sebastiaansmits/Documents/Selira\ AI/cron-avatar-fix.log 2>&1
```

Of voor elke 2 uur (tijdens testing):
```
0 */2 * * * /Users/sebastiaansmits/Documents/Selira\ AI/cron-avatar-fix.sh >> /Users/sebastiaansmits/Documents/Selira\ AI/cron-avatar-fix.log 2>&1
```

### 5. Controleer of cron job actief is
```bash
crontab -l
```

### 6. Check de logs
```bash
tail -f /Users/sebastiaansmits/Documents/Selira\ AI/cron-avatar-fix.log
```

## Hoe het werkt

### Create Flow (create.html)
1. User maakt companion aan
2. Avatar wordt gegenereerd → **Replicate URL**
3. Companion opgeslagen in Airtable met **Replicate URL**
4. Companion is **direct zichtbaar** (werkt zolang Replicate URL geldig is)

### Cron Job (elke 8u)
1. Script vindt companions met Replicate URLs
2. Download avatars naar `/avatars/`
3. Update Airtable met lokale URLs
4. Git commit + push
5. Netlify deployment (avatars nu permanent beschikbaar)

## Workflow Diagram
```
User creates companion
         ↓
Generate avatar (Replicate URL)
         ↓
Save to Airtable (temporary Replicate URL)
         ↓
Companion LIVE (works immediately)
         ↓
[8 hours later]
         ↓
Cron job runs
         ↓
Download to /avatars/
         ↓
Update Airtable (permanent local URL)
         ↓
Git push → Netlify deploy
         ↓
Avatar permanent! ✅
```

## Alternative: Manual Run
Als je niet wilt wachten op de cron job:
```bash
cd /Users/sebastiaansmits/Documents/Selira\ AI
node fix-replicate-urls.js
git add avatars/
git commit -m "Fix avatar URLs"
git push
```

## Troubleshooting

### Cron job draait niet
- Check of cron service actief is: `sudo launchctl list | grep cron`
- Check cron logs: `tail -f /var/log/cron.log` (macOS)

### Script faalt
- Check `.env` file heeft juiste credentials
- Check internet connectie
- Check Netlify Functions URL is bereikbaar

### Git push faalt
- Zorg dat SSH keys geconfigureerd zijn
- Of gebruik HTTPS met credentials

## Environment Variables Nodig
Script gebruikt deze env vars uit `.env`:
- `AIRTABLE_BASE_ID` of `AIRTABLE_BASE`
- `AIRTABLE_TOKEN`

## Monitoring
Check regelmatig:
```bash
# Hoeveel companions hebben nog Replicate URLs?
curl -s "https://selira.ai/.netlify/functions/selira-characters?limit=1000&includePrivate=true" | grep -o "replicate.delivery" | wc -l

# Check recente cron runs
tail -20 cron-avatar-fix.log
```
