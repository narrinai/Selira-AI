# Sync Existing Auth0 Users to Airtable

## Problem
Users exist in Auth0 but not in Airtable Users table due to race condition bug.

## What Was Fixed
- **Gmail/Social Login Sync:** Now properly waits for Airtable sync before page redirect
- **Email/Password Signup:** Better messaging for email verification requirement

## Existing Users in Auth0 (Not in Airtable)

To sync existing Auth0 users to Airtable, you need to manually trigger the sync.

### Option 1: Manual Sync via Curl (Recommended)

For each user in Auth0 that's missing from Airtable:

```bash
# Get user details from Auth0 dashboard:
# - Auth0 ID (sub field, e.g., "google-oauth2|123456789")
# - Email
# - Name

# Example for loanaarg22@gmail.com:
curl -X POST https://selira.ai/.netlify/functions/selira-auth0-user-sync \
  -H "Content-Type: application/json" \
  -d '{
    "auth0_id": "google-oauth2|117093701363665404068",
    "email": "loanaarg22@gmail.com",
    "name": "Loan Aarg"
  }'

# Expected response:
# {"success":true,"action":"created","user_id":"recXXXXXXXXXXXXXX"}
```

### Option 2: Ask Users to Re-Login

Since the fix is now deployed, existing users just need to:
1. Logout (if logged in)
2. Login again via Gmail/Google

The fixed code will now sync them to Airtable automatically.

### Option 3: Auth0 Management API Script (Advanced)

If you have many users, you can create a Node.js script using Auth0 Management API:

```javascript
// sync-all-users.js
const axios = require('axios');

// 1. Get Auth0 Management API token
// 2. Fetch all users from Auth0
// 3. For each user, call selira-auth0-user-sync endpoint
// 4. Log results

// Run: node sync-all-users.js
```

## Verify Sync Success

After syncing a user, verify in Airtable:

1. Go to Airtable → Selira Base → Users table
2. Search for email address
3. Check fields:
   - ✅ Auth0ID matches
   - ✅ Email correct
   - ✅ Name populated
   - ✅ display_name generated (e.g., "BraveEagle1234")
   - ✅ Plan = "Free"

## Users to Sync (From Auth0)

| Email | Auth0 ID | Name | Status |
|-------|----------|------|--------|
| loanaarg22@gmail.com | google-oauth2\|117093701363665404068 | Loan Aarg | ✅ SYNCED |
| [Add other users from Auth0 here] | | | ⏳ Pending |

## After Syncing

Once users are in Airtable, they can:
- ✅ Chat with AI companions
- ✅ Create custom companions
- ✅ Save chat history
- ✅ Upgrade to Pro plan

## Prevention

The race condition is now fixed. Future users (after deployment) will automatically sync:
- ✅ Gmail/Google OAuth signups
- ✅ Email/password signups (after verification)
- ✅ Other social logins (Facebook, etc if enabled)

## Testing

Test with a new account:
1. Open incognito
2. Go to https://selira.ai
3. Click "Register"
4. Choose "Continue with Google"
5. Complete Google auth
6. Check console logs: "✅ User synced to Airtable successfully"
7. Verify in Airtable Users table
