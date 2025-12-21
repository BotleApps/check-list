# Vercel Deployment Guide

This guide explains how to deploy the Checklist app to Vercel with a separate frontend and backend.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              GITHUB REPOSITORY                               │
│  ┌─────────────────────────────┐     ┌─────────────────────────────────┐   │
│  │         / (root)            │     │           /server               │   │
│  │  (React Native/Expo Web)    │     │    (Express.js Backend API)     │   │
│  └──────────────┬──────────────┘     └──────────────┬──────────────────┘   │
└─────────────────┼───────────────────────────────────┼───────────────────────┘
                  │                                   │
                  │ Vercel Project 1                  │ Vercel Project 2
                  │ (Root: ./)                        │ (Root: ./server)
                  ▼                                   ▼
┌─────────────────────────────────┐  ┌─────────────────────────────────────────┐
│     FRONTEND (Expo Web)         │  │       BACKEND (Express + MongoDB)       │
│  https://checklist.vercel.app   │  │  https://checklist-api.vercel.app       │
└─────────────────────────────────┘  └─────────────────────────────────────────┘
```

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **MongoDB Atlas Account**: Create a free cluster at [mongodb.com/cloud/atlas](https://mongodb.com/cloud/atlas)
3. **Google Cloud Console**: Set up OAuth 2.0 credentials

---

## Step 1: Set Up MongoDB Atlas

1. Go to [MongoDB Atlas](https://mongodb.com/cloud/atlas) and create an account
2. Create a new **Free Tier (M0)** cluster
3. Create a database user:
   - Go to **Database Access** → **Add New Database User**
   - Choose password authentication
   - Note the username and password
4. Configure network access:
   - Go to **Network Access** → **Add IP Address**
   - Add `0.0.0.0/0` to allow all IPs (required for Vercel serverless)
5. Get your connection string:
   - Go to **Clusters** → **Connect** → **Connect your application**
   - Copy the connection string (looks like `mongodb+srv://...`)
   - Replace `<password>` with your actual password

---

## Step 2: Set Up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Enable the **Google+ API**:
   - Go to **APIs & Services** → **Library**
   - Search for "Google+ API" and enable it
4. Create OAuth 2.0 credentials:
   - Go to **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **OAuth client ID**
   - Application type: **Web application**
   - Name: "Checklist App"
5. Configure OAuth consent screen if prompted
6. Add Authorized redirect URIs:
   ```
   http://localhost:5001/api/auth/google/callback
   https://your-backend-project.vercel.app/api/auth/google/callback
   ```
7. Note your **Client ID** and **Client Secret**

---

## Step 3: Deploy Backend to Vercel

### 3.1 Create Backend Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **Add New** → **Project**
3. Import your GitHub repository
4. Configure project settings:
   - **Project Name**: `checklist-api` (or your preferred name)
   - **Framework Preset**: Other
   - **Root Directory**: `server`
   - **Build Command**: Leave empty
   - **Output Directory**: Leave empty
   - **Install Command**: `npm install`

### 3.2 Add Environment Variables

In the Vercel project settings, add these environment variables:

| Variable | Value |
|----------|-------|
| `MONGODB_URI` | `mongodb+srv://username:password@cluster.mongodb.net/checklist_db` |
| `JWT_SECRET` | Generate a secure 32+ character string |
| `SESSION_SECRET` | Generate another secure 32+ character string |
| `GOOGLE_CLIENT_ID` | Your Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Your Google OAuth Client Secret |
| `GOOGLE_CALLBACK_URL` | `https://your-backend.vercel.app/api/auth/google/callback` |
| `CLIENT_URL` | `https://your-frontend.vercel.app` |
| `NODE_ENV` | `production` |

### 3.3 Deploy

Click **Deploy** and wait for the build to complete.

---

## Step 4: Deploy Frontend to Vercel

### 4.1 Create Frontend Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **Add New** → **Project**
3. Import the same GitHub repository
4. Configure project settings:
   - **Project Name**: `checklist` (or your preferred name)
   - **Framework Preset**: Other (or Expo)
   - **Root Directory**: Leave empty (root of repo)
   - **Build Command**: `npx expo export -p web`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### 4.2 Add Environment Variables

| Variable | Value |
|----------|-------|
| `EXPO_PUBLIC_API_URL` | `https://your-backend.vercel.app/api` |
| `EXPO_PUBLIC_GOOGLE_CLIENT_ID` | Your Google OAuth Client ID |

### 4.3 Deploy

Click **Deploy** and wait for the build to complete.

---

## Step 5: Update Google OAuth Redirect URIs

After deployment, update your Google OAuth settings:

1. Go to [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services** → **Credentials**
2. Edit your OAuth 2.0 Client ID
3. Add the production callback URL:
   ```
   https://your-backend.vercel.app/api/auth/google/callback
   ```
4. Add authorized JavaScript origins:
   ```
   https://your-frontend.vercel.app
   ```

---

## Local Development

### Backend

```bash
cd server
cp .env.example .env
# Edit .env with your local values
npm install
npm run dev
```

The backend will run on `http://localhost:5001`

### Frontend

```bash
# In root directory
npm install
npx expo start --web
```

The frontend will run on `http://localhost:8081`

---

## Environment Variables Reference

### Backend (.env)

```bash
# MongoDB
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/checklist_db

# JWT
JWT_SECRET=your-super-secure-jwt-secret-minimum-32-characters

# Session
SESSION_SECRET=another-secure-session-secret-minimum-32-characters

# Google OAuth
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx
GOOGLE_CALLBACK_URL=http://localhost:5001/api/auth/google/callback

# CORS
CLIENT_URL=http://localhost:8081

# Environment
NODE_ENV=development
PORT=5001
```

### Frontend (.env)

```bash
# API URL
EXPO_PUBLIC_API_URL=http://localhost:5001/api

# Google OAuth
EXPO_PUBLIC_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
```

---

## Troubleshooting

### CORS Errors

- Ensure `CLIENT_URL` in backend matches exactly (including https://)
- Check that cookies are being sent with `credentials: 'include'`

### MongoDB Connection Issues

- Verify IP whitelist includes `0.0.0.0/0`
- Check connection string format
- Ensure database user has correct permissions

### OAuth Callback Errors

- Verify `GOOGLE_CALLBACK_URL` matches exactly in:
  - Backend environment variables
  - Google Cloud Console authorized redirect URIs
- Ensure callback URL uses HTTPS in production

### Build Failures

- Check Node.js version compatibility (>=18)
- Ensure all dependencies are in `dependencies`, not just `devDependencies`

---

## Security Best Practices

1. **JWT Tokens**: Stored in HTTP-only cookies, not localStorage
2. **CORS**: Strictly configured for production origins
3. **Environment Variables**: Never commit secrets to git
4. **MongoDB**: Use IP whitelist in production if possible
5. **HTTPS**: Always required in production
6. **Rate Limiting**: Configured at 100 requests per 15 minutes

---

*Last Updated: December 2024*
