# Google Favicon Update Instructies

## Wat is er gedaan:
1. ✅ Alle pagina's hebben al de correcte favicon configuratie
2. ✅ Sitemap.xml bijgewerkt met nieuwe datum (2025-10-20)
3. ✅ Cache headers voor favicon verwijderd (was 1 jaar, nu 0 = immediate refresh)

## Om Google te versnellen:

### 1. Google Search Console
1. Ga naar [Google Search Console](https://search.google.com/search-console)
2. Selecteer je property (selira.ai)
3. Ga naar "Sitemaps" in het linkermenu
4. Verwijder de oude sitemap (als aanwezig)
5. Voeg deze URL toe: `https://selira.ai/sitemap.xml`
6. Klik "Submit"

### 2. URL Inspection Tool (voor snellere indexing)
1. Klik op "URL Inspection" bovenaan in Search Console
2. Voer in: `https://selira.ai`
3. Klik "Request Indexing"
4. Herhaal voor belangrijke pagina's:
   - `https://selira.ai/create`
   - `https://selira.ai/free-nsfw-image-generator`
   - `https://selira.ai/pricing`

### 3. Favicons Force Refresh
De cache headers zijn nu aangepast naar `max-age=0` zodat browsers en Google de nieuwe favicon direct ophalen.

**Later kun je de cache weer terugzetten naar:**
```
/favicon*
  Cache-Control: public, max-age=31536000
```

### 4. Verwachte Tijdlijn
- **Sitemap crawl**: 1-3 dagen
- **Favicon update in Google**: 3-7 dagen (kan langer duren)
- **Browser cache**: Immediate (na deploy)

### 5. Browsers Force Refresh
Gebruikers kunnen hun browser cache legen:
- Chrome/Edge: Ctrl+Shift+Del (Windows) / Cmd+Shift+Del (Mac)
- Safari: Cmd+Option+E
- Firefox: Ctrl+Shift+Del / Cmd+Shift+Del

## Verificatie
Na deploy kun je testen of de nieuwe favicon wordt geladen:
1. Open in Incognito/Private mode: `https://selira.ai`
2. Check de browser tab - moet Selira favicon zijn (niet Narrin)
3. Check: `https://selira.ai/favicon.ico` - moet de nieuwe Selira favicon tonen

## Notitie
Google's favicon update kan niet geforceerd worden sneller dan hun crawl schedule. Bovenstaande stappen helpen wel om het proces te versnellen.
