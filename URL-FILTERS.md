# URL Filter Combinations - Selira AI

All filter combinations are supported! Mix and match any parameters.

## Individual Filters

### Content Filter
- `?uncensored` - Only uncensored companions
- `?censored` - Only censored companions
- `?content=all` - All content types

### Sex Filter
- `?male` - Only male companions
- `?female` - Only female companions
- `?sex=all` - All sexes

### Style Filter
- `?anime` - Only anime companions
- `?realistic` - Only realistic companions
- `?style=all` - All styles

## Popular Combinations

### Uncensored Combinations
- `?uncensored&female&realistic` - Uncensored + Female + Realistic (DEFAULT)
- `?uncensored&female&anime` - Uncensored + Female + Anime
- `?uncensored&male&realistic` - Uncensored + Male + Realistic
- `?uncensored&male&anime` - Uncensored + Male + Anime

### Censored Combinations
- `?censored&female&realistic` - Censored + Female + Realistic
- `?censored&female&anime` - Censored + Female + Anime
- `?censored&male&realistic` - Censored + Male + Realistic
- `?censored&male&anime` - Censored + Male + Anime

### Mixed Combinations
- `?uncensored&sex=all&realistic` - Uncensored + All Sexes + Realistic
- `?censored&sex=all&anime` - Censored + All Sexes + Anime
- `?content=all&female&realistic` - All Content + Female + Realistic
- `?content=all&male&anime` - All Content + Male + Anime
- `?uncensored&female&style=all` - Uncensored + Female + All Styles
- `?censored&male&style=all` - Censored + Male + All Styles

### Show All Combinations
- `?content=all&sex=all&style=all` - Show ALL companions (no filters)
- `?sex=all` - All sexes (keeps other default filters)
- `?style=all` - All styles (keeps other default filters)

## All 27 Possible Combinations

| Content | Sex | Style | URL |
|---------|-----|-------|-----|
| Uncensored | Female | Realistic | `?uncensored&female&realistic` |
| Uncensored | Female | Anime | `?uncensored&female&anime` |
| Uncensored | Female | All | `?uncensored&female&style=all` |
| Uncensored | Male | Realistic | `?uncensored&male&realistic` |
| Uncensored | Male | Anime | `?uncensored&male&anime` |
| Uncensored | Male | All | `?uncensored&male&style=all` |
| Uncensored | All | Realistic | `?uncensored&sex=all&realistic` |
| Uncensored | All | Anime | `?uncensored&sex=all&anime` |
| Uncensored | All | All | `?uncensored&sex=all&style=all` |
| Censored | Female | Realistic | `?censored&female&realistic` |
| Censored | Female | Anime | `?censored&female&anime` |
| Censored | Female | All | `?censored&female&style=all` |
| Censored | Male | Realistic | `?censored&male&realistic` |
| Censored | Male | Anime | `?censored&male&anime` |
| Censored | Male | All | `?censored&male&style=all` |
| Censored | All | Realistic | `?censored&sex=all&realistic` |
| Censored | All | Anime | `?censored&sex=all&anime` |
| Censored | All | All | `?censored&sex=all&style=all` |
| All | Female | Realistic | `?content=all&female&realistic` |
| All | Female | Anime | `?content=all&female&anime` |
| All | Female | All | `?content=all&female&style=all` |
| All | Male | Realistic | `?content=all&male&realistic` |
| All | Male | Anime | `?content=all&male&anime` |
| All | Male | All | `?content=all&male&style=all` |
| All | All | Realistic | `?content=all&sex=all&realistic` |
| All | All | Anime | `?content=all&sex=all&anime` |
| All | All | All | `?content=all&sex=all&style=all` |

## How It Works

The URL filter system reads query parameters and applies filters in this order:
1. Content filter (uncensored/censored/all)
2. Sex filter (male/female/all)
3. Style filter (anime/realistic/all)

All filters are optional. If no URL parameters are provided, defaults are used:
- Content: `uncensored`
- Sex: `female`
- Style: `realistic`

## Implementation

The system is flexible and supports ANY combination. You can even mix shorthand and explicit syntax:
- `?censored&male&anime` ✅ Works
- `?content=censored&sex=male&style=anime` ❌ Won't work (use shorthand for now)

## Testing

Test any combination by visiting:
```
https://selira.ai/?censored&female&realistic
https://selira.ai/?uncensored&male&anime
https://selira.ai/?content=all&sex=all&style=all
```

The filter buttons in the UI will automatically update to show the active filters.
