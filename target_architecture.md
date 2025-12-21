# Shopping List App - Architecture Documentation

> A comprehensive guide to replicate this full-stack architecture for other applications.

## Table of Contents

1. [Overview](#overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Technology Stack](#technology-stack)
4. [Project Structure](#project-structure)
5. [Frontend (Client)](#frontend-client)
6. [Backend (Server)](#backend-server)
7. [Database (MongoDB)](#database-mongodb)
8. [Authentication Flow](#authentication-flow)
9. [Vercel Deployment](#vercel-deployment)
10. [Environment Variables](#environment-variables)
11. [Step-by-Step Replication Guide](#step-by-step-replication-guide)

---

## Overview

This application follows a **decoupled architecture** with:
- **Frontend**: React SPA (Single Page Application) deployed as a separate Vercel project
- **Backend**: Express.js API deployed as a separate Vercel serverless project
- **Database**: MongoDB Atlas (cloud-hosted)
- **Authentication**: Google OAuth 2.0 with JWT tokens stored in HTTP-only cookies

Both frontend and backend are in the **same GitHub repository** but deployed as **separate Vercel projects** from different root directories.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              GITHUB REPOSITORY                               │
│  ┌─────────────────────────────┐     ┌─────────────────────────────────┐   │
│  │         /client             │     │           /server               │   │
│  │  (React + Vite Frontend)    │     │    (Express.js Backend API)     │   │
│  └──────────────┬──────────────┘     └──────────────┬──────────────────┘   │
└─────────────────┼───────────────────────────────────┼───────────────────────┘
                  │                                   │
                  │ Vercel Auto-Deploy                │ Vercel Auto-Deploy
                  │ (Root: ./client)                  │ (Root: ./server)
                  ▼                                   ▼
┌─────────────────────────────────┐  ┌─────────────────────────────────────────┐
│     VERCEL PROJECT: FRONTEND    │  │       VERCEL PROJECT: BACKEND           │
│  https://your-app.vercel.app    │  │  https://your-app-api.vercel.app        │
│                                 │  │                                          │
│  ┌───────────────────────────┐  │  │  ┌──────────────────────────────────┐   │
│  │     Static Files (SPA)    │  │  │  │   Serverless Functions           │   │
│  │  - index.html             │  │  │  │   @vercel/node                   │   │
│  │  - JS/CSS bundles         │  │  │  │   - /api/auth/*                  │   │
│  │  - PWA assets             │  │  │  │   - /api/lists/*                 │   │
│  └───────────────────────────┘  │  │  │   - /api/products/*              │   │
│                                 │  │  └──────────────┬───────────────────┘   │
└─────────────────┬───────────────┘  └─────────────────┼───────────────────────┘
                  │                                    │
                  │ API Requests (CORS enabled)        │
                  │ withCredentials: true              │
                  └────────────────────────────────────┘
                                                       │
                                                       │ MongoDB Driver
                                                       ▼
                             ┌───────────────────────────────────────────┐
                             │           MONGODB ATLAS                   │
                             │  (Cloud Database - Free Tier Available)   │
                             │                                           │
                             │  Collections:                             │
                             │  - users                                  │
                             │  - lists                                  │
                             │  - products                               │
                             └───────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────────────┐
│                         GOOGLE CLOUD PLATFORM                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                     OAuth 2.0 Credentials                               │  │
│  │  - Client ID                                                            │  │
│  │  - Client Secret                                                        │  │
│  │  - Authorized redirect URIs:                                            │  │
│  │    • https://your-app-api.vercel.app/api/auth/google/callback           │  │
│  │    • http://localhost:5001/api/auth/google/callback (for local dev)     │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.x | UI Framework |
| Vite | 7.x | Build tool & dev server |
| React Router | 7.x | Client-side routing |
| Axios | 1.x | HTTP client |
| Tailwind CSS | 4.x | Styling |
| Lucide React | - | Icons |
| Framer Motion | 12.x | Animations |
| vite-plugin-pwa | 1.x | Progressive Web App |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Express.js | 5.x | Web framework |
| Mongoose | 8.x | MongoDB ODM |
| Passport.js | 0.7.x | Authentication middleware |
| passport-google-oauth20 | 2.x | Google OAuth strategy |
| jsonwebtoken | 9.x | JWT token generation/verification |
| cookie-parser | 1.x | Cookie handling |
| cors | 2.x | Cross-origin resource sharing |
| dotenv | 17.x | Environment variables |
| @google/generative-ai | 0.24.x | Gemini AI integration (optional) |

### Infrastructure
| Service | Purpose |
|---------|---------|
| Vercel | Hosting (Frontend + Backend) |
| MongoDB Atlas | Cloud Database |
| Google Cloud | OAuth Provider |

---

## Project Structure

```
shopping-list/
├── client/                          # Frontend (React + Vite)
│   ├── public/                      # Static assets
│   │   ├── shopping-list.svg        # App icon
│   │   ├── pwa-192x192.png         # PWA icons
│   │   └── pwa-512x512.png
│   ├── src/
│   │   ├── api/
│   │   │   └── axios.js            # API client configuration
│   │   ├── assets/                  # Images, fonts
│   │   ├── components/              # Reusable UI components
│   │   │   ├── Layout.jsx          # App shell with navigation
│   │   │   ├── ProtectedRoute.jsx  # Auth guard
│   │   │   ├── ConfirmDialog.jsx   # Modal dialogs
│   │   │   ├── Toast.jsx           # Notifications
│   │   │   └── ...
│   │   ├── context/                 # React Context providers
│   │   │   ├── AuthContext.jsx     # Authentication state
│   │   │   ├── ThemeContext.jsx    # Dark/Light mode
│   │   │   └── ToastContext.jsx    # Toast notifications
│   │   ├── pages/                   # Route components
│   │   │   ├── Home.jsx            # Dashboard
│   │   │   ├── Login.jsx           # Login page
│   │   │   ├── Settings.jsx        # Settings
│   │   │   └── ...
│   │   ├── utils/                   # Helper functions
│   │   ├── App.jsx                  # Main app with routes
│   │   ├── main.jsx                 # Entry point
│   │   └── index.css                # Global styles
│   ├── index.html                   # HTML template
│   ├── vite.config.js               # Vite configuration
│   ├── tailwind.config.js           # Tailwind configuration
│   ├── vercel.json                  # Vercel deployment config
│   └── package.json
│
├── server/                          # Backend (Express.js)
│   ├── src/
│   │   ├── config/
│   │   │   └── passport.js         # Passport.js configuration
│   │   ├── middleware/
│   │   │   └── auth.js             # JWT authentication middleware
│   │   ├── models/                  # Mongoose schemas
│   │   │   ├── User.js
│   │   │   ├── List.js
│   │   │   └── Product.js
│   │   ├── routes/
│   │   │   ├── auth.js             # Authentication routes
│   │   │   └── api.js              # Protected API routes
│   │   └── index.js                 # Express app entry point
│   ├── .env.example                 # Environment template
│   ├── vercel.json                  # Vercel deployment config
│   └── package.json
│
├── docs/                            # Documentation
├── .gitignore
└── README.md
```

---

## Frontend (Client)

### Key Files

#### `client/src/api/axios.js` - API Client
```javascript
import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL
        ? `${import.meta.env.VITE_API_URL}/api`
        : 'http://localhost:5001/api',
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true, // IMPORTANT: Send cookies with requests
});

// Handle 401 errors globally
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
```

#### `client/src/context/AuthContext.jsx` - Authentication State
```javascript
// Key functions:
// - loginWithGoogle(): Redirects to backend OAuth endpoint
// - logout(): Clears session and redirects to Google logout
// - checkAuth(): Verifies authentication status on app load
```

#### `client/vercel.json` - SPA Routing
```json
{
    "rewrites": [
        {
            "source": "/(.*)",
            "destination": "/index.html"
        }
    ]
}
```

### Environment Variables (Client)
```bash
# .env.production
VITE_API_URL=https://your-app-api.vercel.app
```

---

## Backend (Server)

### Key Files

#### `server/src/index.js` - Express App
```javascript
// Key features:
// 1. CORS configuration with credentials
// 2. Session management for OAuth flow
// 3. Passport.js initialization
// 4. MongoDB connection with serverless optimizations
// 5. Public + Protected route separation
```

#### `server/src/config/passport.js` - Google OAuth Strategy
```javascript
// Handles:
// 1. Google OAuth callback
// 2. User creation/lookup in MongoDB
// 3. Waiting for DB connection (serverless cold start handling)
```

#### `server/src/middleware/auth.js` - JWT Verification
```javascript
const jwt = require('jsonwebtoken');

const generateToken = (user) => {
    return jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
};

const isAuthenticated = async (req, res, next) => {
    const token = req.cookies?.token;
    if (!token) return res.status(401).json({ message: 'Not authenticated' });
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.userId);
        next();
    } catch (err) {
        res.status(401).json({ message: 'Invalid token' });
    }
};
```

#### `server/vercel.json` - Serverless Configuration
```json
{
  "version": 2,
  "builds": [
    {
      "src": "src/index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "src/index.js"
    }
  ],
  "functions": {
    "src/index.js": {
      "maxDuration": 30
    }
  }
}
```

---

## Database (MongoDB)

### Setup with MongoDB Atlas

1. **Create Account**: Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. **Create Cluster**: Free tier (M0) is sufficient for development
3. **Create Database User**: Note username and password
4. **Whitelist IPs**: Add `0.0.0.0/0` for Vercel (or specific IPs for production)
5. **Get Connection String**: 
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/<dbname>?retryWrites=true&w=majority
   ```

### Schema Examples

#### User Model
```javascript
const userSchema = new mongoose.Schema({
    googleId: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    picture: { type: String },
    createdAt: { type: Date, default: Date.now },
    lastLogin: { type: Date, default: Date.now }
});
```

---

## Authentication Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  User    │     │ Frontend │     │ Backend  │     │  Google  │     │ MongoDB  │
│ Browser  │     │  (React) │     │(Express) │     │  OAuth   │     │  Atlas   │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │                │
     │ 1. Click       │                │                │                │
     │ "Sign in       │                │                │                │
     │  with Google"  │                │                │                │
     │───────────────>│                │                │                │
     │                │                │                │                │
     │                │ 2. Redirect to │                │                │
     │                │ /api/auth/google               │                │
     │<───────────────────────────────>│                │                │
     │                │                │                │                │
     │                │                │ 3. Redirect to │                │
     │                │                │ Google OAuth   │                │
     │<────────────────────────────────────────────────>│                │
     │                │                │                │                │
     │ 4. User grants │                │                │                │
     │    permission  │                │                │                │
     │───────────────────────────────────────────────>│                │
     │                │                │                │                │
     │                │                │ 5. Google      │                │
     │                │                │ callback with  │                │
     │                │                │ user profile   │                │
     │                │                │<───────────────│                │
     │                │                │                │                │
     │                │                │ 6. Find/Create │                │
     │                │                │ user in DB     │                │
     │                │                │───────────────────────────────>│
     │                │                │                │                │
     │                │                │<───────────────────────────────│
     │                │                │                │                │
     │                │                │ 7. Generate JWT│                │
     │                │                │ Set HTTP-only  │                │
     │                │                │ cookie         │                │
     │                │                │                │                │
     │ 8. Redirect to │                │                │                │
     │ frontend with  │                │                │                │
     │ cookie set     │<───────────────│                │                │
     │                │                │                │                │
     │                │ 9. Check auth  │                │                │
     │                │ status         │                │                │
     │                │───────────────>│                │                │
     │                │                │ 10. Verify JWT │                │
     │                │                │ from cookie    │                │
     │                │<───────────────│                │                │
     │                │                │                │                │
     │ 11. Show       │                │                │                │
     │ authenticated  │                │                │                │
     │ content        │                │                │                │
     │<───────────────│                │                │                │
     │                │                │                │                │
```

---

## Vercel Deployment

### Setup for Monorepo (Two Projects, One Repo)

#### 1. Frontend Project
- **Framework Preset**: Vite
- **Root Directory**: `client`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

#### 2. Backend Project
- **Framework Preset**: Other
- **Root Directory**: `server`
- **Build Command**: (leave empty)
- **Output Directory**: (leave empty)
- **Install Command**: `npm install`

### Environment Variables in Vercel

#### Frontend Project (client)
```
VITE_API_URL=https://your-backend-project.vercel.app
```

#### Backend Project (server)
```
# MongoDB
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname

# JWT
JWT_SECRET=your-secure-random-string-min-32-chars

# Session
SESSION_SECRET=another-secure-random-string

# Google OAuth
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxx
GOOGLE_CALLBACK_URL=https://your-backend-project.vercel.app/api/auth/google/callback

# CORS
CLIENT_URL=https://your-frontend-project.vercel.app

# Environment
NODE_ENV=production
```

---

## Environment Variables

### Complete Reference

| Variable | Location | Description | Example |
|----------|----------|-------------|---------|
| `VITE_API_URL` | Frontend | Backend API URL | `https://api.yourapp.com` |
| `MONGODB_URI` | Backend | MongoDB connection string | `mongodb+srv://...` |
| `JWT_SECRET` | Backend | JWT signing secret | Random 32+ char string |
| `SESSION_SECRET` | Backend | Express session secret | Random 32+ char string |
| `GOOGLE_CLIENT_ID` | Backend | Google OAuth Client ID | `xxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Backend | Google OAuth Secret | `GOCSPX-xxx` |
| `GOOGLE_CALLBACK_URL` | Backend | OAuth callback URL | `https://api.yourapp.com/api/auth/google/callback` |
| `CLIENT_URL` | Backend | Frontend URL for CORS | `https://yourapp.com` |
| `NODE_ENV` | Backend | Environment mode | `production` or `development` |
| `GEMINI_API_KEY` | Backend | (Optional) Google AI key | `AIza...` |

---

## Step-by-Step Replication Guide

### 1. Create the GitHub Repository

```bash
mkdir my-new-app
cd my-new-app
git init
mkdir client server docs
```

### 2. Setup Frontend (client/)

```bash
cd client
npm create vite@latest . -- --template react
npm install axios react-router-dom lucide-react framer-motion
npm install -D tailwindcss @tailwindcss/postcss autoprefixer
```

Create `vercel.json`:
```json
{
    "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

### 3. Setup Backend (server/)

```bash
cd ../server
npm init -y
npm install express mongoose cors cookie-parser dotenv passport passport-google-oauth20 jsonwebtoken express-session
```

Create `vercel.json`:
```json
{
  "version": 2,
  "builds": [{ "src": "src/index.js", "use": "@vercel/node" }],
  "routes": [{ "src": "/(.*)", "dest": "src/index.js" }],
  "functions": { "src/index.js": { "maxDuration": 30 } }
}
```

### 4. Setup MongoDB Atlas

1. Create free cluster at [mongodb.com/cloud/atlas](https://mongodb.com/cloud/atlas)
2. Create database user
3. Whitelist `0.0.0.0/0` for Vercel
4. Get connection string

### 5. Setup Google OAuth

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create new project
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:5001/api/auth/google/callback`
   - `https://your-backend.vercel.app/api/auth/google/callback`

### 6. Deploy to Vercel

1. Push code to GitHub
2. Create **two** Vercel projects from same repo:
   - **Frontend**: Root = `client`
   - **Backend**: Root = `server`
3. Add environment variables to each project
4. Deploy!

### 7. Post-Deployment Checklist

- [ ] Update Google OAuth redirect URI with production URL
- [ ] Verify CORS is working (check browser console)
- [ ] Test authentication flow end-to-end
- [ ] Verify cookies are being set (check Application tab)
- [ ] Test API endpoints with authentication

---

## Common Issues & Solutions

### CORS Errors
- Ensure backend `CLIENT_URL` matches exactly (including https://)
- Verify `credentials: true` in both CORS config and axios

### Cookies Not Being Set
- Check `sameSite: 'none'` and `secure: true` in production
- Ensure frontend uses `withCredentials: true`

### MongoDB Connection Timeouts
- Use connection pooling settings for serverless
- Implement retry logic with exponential backoff
- Set appropriate timeout values (30s recommended)

### OAuth Callback Failures
- Verify `GOOGLE_CALLBACK_URL` matches exactly
- Check Google Cloud Console authorized redirect URIs
- Ensure callback URL uses HTTPS in production

---

## Local Development

### Run Both Services

```bash
# Terminal 1 - Backend
cd server
cp .env.example .env  # Edit with your values
npm run dev

# Terminal 2 - Frontend
cd client
npm run dev
```

### Proxy Configuration (Vite)

In `vite.config.js`, the dev server proxies `/api` requests to the backend:
```javascript
server: {
    proxy: {
        '/api': {
            target: 'http://localhost:5001',
            changeOrigin: true,
        }
    }
}
```

---

## Security Best Practices

1. **JWT Tokens**: Store in HTTP-only cookies, not localStorage
2. **CORS**: Strictly configure allowed origins
3. **Environment Variables**: Never commit secrets to git
4. **MongoDB**: Use IP whitelist in production
5. **HTTPS**: Always use in production
6. **Rate Limiting**: Consider adding express-rate-limit

---

*Last Updated: December 2025*
