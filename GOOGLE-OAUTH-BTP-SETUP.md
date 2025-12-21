# Google OAuth Setup for BTP Deployment

## Overview
Your application now uses **Direct Google OAuth** without Supabase or XSUAA. Users sign in with their Google accounts, and the backend validates tokens directly with Google.

## Architecture

```
User → Google OAuth → Frontend (stores token) → Backend (validates with Google) → PostgreSQL
```

## Setup Steps

### 1. Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API (for user info)
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Application type: "Web application"
6. Add Authorized JavaScript origins:
   ```
   http://localhost:19006
   https://your-btp-app-url.cfapps.eu12.hana.ondemand.com
   ```
7. Add Authorized redirect URIs:
   ```
   http://localhost:19006/auth/callback
   https://your-btp-app-url.cfapps.eu12.hana.ondemand.com/auth/callback
   ```
8. Copy the **Client ID** - you'll need this

### 2. Configure Environment Variables

Create a `.env` file in your project root:

```bash
# Google OAuth Configuration
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

# API URL (leave as /api for production, can change for local dev)
EXPO_PUBLIC_API_URL=/api
```

### 3. Configure Backend Environment

In BTP Cloud Foundry, set the environment variable for the backend service:

```bash
# Set Google Client ID for backend token validation
cf set-env checklist-backend-srv GOOGLE_CLIENT_ID your-google-client-id.apps.googleusercontent.com

# Restart the app
cf restage checklist-backend-srv
```

Or add to `manifest.yml`:

```yaml
applications:
  - name: checklist-backend-srv
    env:
      GOOGLE_CLIENT_ID: your-google-client-id.apps.googleusercontent.com
```

### 3. Install Backend Dependencies (Already Done)

The backend already has `google-auth-library` in package.json. Just ensure you run:

```bash
cd backend
npm install
```

### 4. Deploy to BTP

```bash
# Build MTA archive
npm run build:mta

# Deploy (database will be initialized automatically on first start)
cf deploy mta_archives/checklist-app_1.0.0.mtar
```

**Note:** The database schema is automatically created when the backend starts for the first time. You don't need to run any manual database initialization scripts!

## Authentication Flow

### Login Process

1. User clicks "Sign in with Google"
2. Google OAuth popup opens
3. User approves permissions
4. Frontend receives Google ID token
5. Frontend stores token locally
6. Frontend calls `/api/auth/google` with token
7. Backend:
   - Verifies token with Google
   - Creates/updates user in PostgreSQL
   - Returns user data
8. Frontend stores user data
9. User is logged in

### API Requests

Every API request from the frontend includes:

```javascript
Authorization: Bearer <google-id-token>
```

The backend middleware:
1. Extracts the token
2. Verifies it with Google's public keys
3. Extracts user info (email, name, picture)
4. Attaches to `req.user`
5. Continues to route handler

### Logout

```javascript
await authService.logout();
// Removes token from local storage
// User is logged out
```

## Security Features

✅ **Token Verification**: Every token is verified with Google's public keys  
✅ **HTTPS Only**: All communication encrypted  
✅ **Rate Limiting**: 100 requests per 15 minutes per IP  
✅ **CORS Protection**: Only allowed origins can make requests  
✅ **Helmet.js**: Security headers enabled  
✅ **PostgreSQL**: Secure database on BTP  

## Testing Locally

### Start Backend
```bash
cd backend
export GOOGLE_CLIENT_ID=your-client-id
npm start
# Backend runs on http://localhost:3000
```

### Start Frontend
```bash
# In project root
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-client-id npm start
# Frontend runs on http://localhost:19006
```

### Test Login
1. Open http://localhost:19006
2. Click "Sign in with Google"
3. Should open Google OAuth popup
4. After login, check DevTools console for token
5. Try making API calls to backend

## Troubleshooting

### "Token verification failed"
- Check GOOGLE_CLIENT_ID matches on frontend and backend
- Ensure token hasn't expired (Google tokens expire after 1 hour)
- Check backend logs for specific error

### "Unauthorized JavaScript origin"
- Add your URL to Google OAuth allowed origins
- Wait a few minutes for changes to propagate

### "Invalid redirect URI"
- Add your callback URL to Google OAuth allowed redirects
- Must exactly match including protocol (http/https)

### Backend can't verify tokens
- Ensure `google-auth-library` is installed
- Check GOOGLE_CLIENT_ID environment variable is set
## Production Checklist

- [ ] Google OAuth credentials configured
- [ ] Authorized origins include production URL
- [ ] Redirect URIs include production callback
- [ ] Frontend .env has GOOGLE_CLIENT_ID (for local dev)
- [ ] MTA yaml has google-client-id configured
- [ ] Deploy to BTP
- [ ] Database automatically initialized on first start
- [ ] Test login flow in production
- [ ] Test API calls with real data

## Database Initialization

**Good news:** You don't need to run `init-database.sh` manually!

The backend automatically initializes the database schema on first startup. The script:
- Reads `btp-postgres-schema.sql`
- Creates all tables (uses `IF NOT EXISTS` - safe to run multiple times)
- Logs the created tables

If you want to manually initialize or reset the database:

```bash
# From backend directory
node db-init.js
```ed with schema
- [ ] Test login flow in production
- [ ] Test API calls with real data

## Removing Supabase Completely

Since you're using direct Google OAuth, you can remove Supabase:

```bash
npm uninstall @supabase/supabase-js
```

The `supabase.ts` file now just provides a compatibility layer for existing code, but doesn't use the actual Supabase SDK.

## Cost

**Free tier includes:**
- Google OAuth: ✅ Free (unlimited)
- BTP Cloud Foundry: Check your BTP plan
- PostgreSQL on BTP: Development plan (check pricing)

No Supabase subscription needed! 🎉
