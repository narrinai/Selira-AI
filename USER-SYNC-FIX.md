# User Sync Fix - Auth0 to Airtable

## Problem Discovered (2025-10-07)

Users were signing up via Auth0 but **not appearing in Airtable** for up to an hour or sometimes not at all.

### Timeline
- **Oct 5**: Fixed sync for **Gmail/Google OAuth** logins (commit c9f18f3)
- **Oct 7**: Discovered **email/password** signups still had the same issue
- **Oct 7**: Fixed sync for **email/password** signups (commit c4b41e0)

**Why it seemed to work before**: The race condition existed for both flows, but was only noticed and fixed for social logins initially. Email/password flow had the same bug but wasn't fixed until today.

### Affected Users (Manually Fixed)
- ✅ **domuxas007@gmail.com** - Google OAuth (synced: `rec9CbunSuYmrZ8Cn`)
- ✅ **sexy20b@gmial.com** - Email/Password (synced: `recPDxeqik3hWcIUU`)
- ✅ **gcastrading+17@gmail.com** - Email/Password (synced: `rec4Lak4TjjdIpQjy`)

## Root Cause

**Race condition in email/password signup flow:**

The `syncUserToAirtable()` function was called AFTER UI updates and immediately before a page reload:

```javascript
// OLD CODE (BROKEN):
this.updateAuthState(true);
this.closeModal();
this.setLoading(false);
this.showSuccess('Account created successfully!');

// Sync happens here
await this.syncUserToAirtable(this.user);

// But page reloads 500ms later - could interrupt sync!
setTimeout(() => {
  window.location.reload();
}, 500);
```

**Problem**: If Airtable sync took longer than 500ms (network latency, API delay), the page would reload before sync completed, causing the request to be cancelled.

## Solution

**Move sync to happen FIRST, before any UI updates:**

```javascript
// NEW CODE (FIXED):
// Sync FIRST - before anything else
console.log('🔄 Syncing user to Airtable...');
await this.syncUserToAirtable(this.user);
console.log('✅ User synced to Airtable successfully');

// THEN update UI
this.updateAuthState(true);
this.closeModal();
this.setLoading(false);
this.showSuccess('Account created successfully!');

// Finally reload (sync is already complete)
setTimeout(() => {
  window.location.reload();
}, 500);
```

## What Was Fixed

**File**: `js/auth0-login.js`

**Changes**:
1. Moved `syncUserToAirtable()` call to line 448 (before UI updates)
2. Added logging: "🔄 Syncing user to Airtable..."
3. Added logging: "✅ User synced to Airtable successfully"
4. Ensured `await` completes before page reload starts

## Testing

### Diagnostics Tool
Created `test-user-sync.html` for:
- ✅ Check if current user is synced to Airtable
- ✅ Manually sync missing users
- ✅ View sync status and errors

**Access**: https://selira.ai/test-user-sync.html

### Manual Testing Steps

1. **Test Email/Password Signup**:
   ```
   - Open incognito browser
   - Go to https://selira.ai
   - Click "Register"
   - Enter email/password (NOT Google)
   - Complete signup
   - Check console for: "✅ User synced to Airtable successfully"
   - Verify user appears in Airtable Users table
   ```

2. **Test Google OAuth Signup**:
   ```
   - Open incognito browser
   - Go to https://selira.ai
   - Click "Register" → "Continue with Google"
   - Complete Google auth
   - Check console for: "✅ User synced to Airtable successfully"
   - Verify user appears in Airtable Users table
   ```

## How to Manually Sync Missing Users

If you find users in Auth0 but not in Airtable:

### Option 1: Use Diagnostics Tool (Recommended)
1. Go to https://selira.ai/test-user-sync.html
2. Fill in Auth0 ID, Email, and Name
3. Click "Sync User to Airtable"
4. Check Airtable to confirm

### Option 2: Use curl
```bash
curl -X POST https://selira.ai/.netlify/functions/selira-auth0-user-sync \
  -H "Content-Type: application/json" \
  -d '{
    "auth0_id": "google-oauth2|110408344882084766231",
    "email": "user@example.com",
    "name": "User Name"
  }'

# Expected response:
# {"success":true,"action":"created","user_id":"recXXXXXXXXXXXXXX"}
```

### Finding Auth0 User ID
1. Go to [Auth0 Dashboard](https://manage.auth0.com)
2. Navigate to **User Management** → **Users**
3. Search for user's email
4. Copy **User ID** field (e.g., `google-oauth2|123456789` or `auth0|abc123def`)

## Monitoring

### Check for Missing Users

**Compare Auth0 vs Airtable counts:**

1. **Auth0**: https://manage.auth0.com → User Management → Users
2. **Airtable**: https://airtable.com → Selira AI → Users table

If counts don't match, some users are missing.

### Console Logs to Watch

**Successful sync:**
```
🔄 Syncing user to Airtable...
📤 Sending sync data: {auth0_id: "...", email: "..."}
📥 Sync response status: 200
✅ User synced to Airtable successfully
```

**Failed sync:**
```
❌ User sync to Airtable failed: [error message]
⚠️ User sync failed but continuing: [error]
```

## Prevention

✅ **This fix is now deployed** (commit: c4b41e0)

Future signups will:
- ✅ Complete Airtable sync BEFORE page reload
- ✅ Not be interrupted by race conditions
- ✅ Show clear console logs for debugging

## When to Use Manual Sync

- Users exist in Auth0 but missing from Airtable
- User complains they can't access features (likely not in Airtable)
- Auth0 user count > Airtable user count

## Technical Details

**Auth0 User ID Formats**:
- Google OAuth: `google-oauth2|123456789`
- Email/Password: `auth0|abc123def456`
- Other social: `facebook|...`, `twitter|...`, etc.

**Airtable Sync Function**: `netlify/functions/selira-auth0-user-sync.js`

**Sync Creates**:
- Auth0ID (required)
- Email (required)
- Name
- Plan: "Free" (default)
- display_name: Auto-generated (e.g., "BraveEagle5428")
- email_notifications: true (default)
- email_marketing: true (default)

## Related Documentation

- `SYNC-EXISTING-USERS.md` - Original race condition documentation
- `test-user-sync.html` - Diagnostics tool
- `netlify/functions/selira-auth0-user-sync.js` - Sync function code
- `js/auth0-login.js` - Auth flow with fixed sync timing
