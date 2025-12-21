# Checklist App

A modern, cross-platform checklist and task management application built with React Native (Expo) for the frontend and Express.js with MongoDB for the backend.

## 🚀 Features

- ✅ Create and manage checklists with items
- 📁 Organize checklists into folders (buckets)
- 🏷️ Tag checklists for easy filtering
- 📋 Use and create templates
- 🤖 AI-powered checklist generation (Gemini)
- 🌙 Dark mode support
- 📱 Works on Web, iOS, and Android
- 🔐 Google OAuth authentication

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              GITHUB REPOSITORY                               │
│  ┌─────────────────────────────┐     ┌─────────────────────────────────┐   │
│  │         / (root)            │     │           /server               │   │
│  │  (React Native/Expo Web)    │     │    (Express.js + MongoDB)       │   │
│  └──────────────┬──────────────┘     └──────────────┬──────────────────┘   │
└─────────────────┼───────────────────────────────────┼───────────────────────┘
                  │                                   │
                  ▼                                   ▼
┌─────────────────────────────────┐  ┌─────────────────────────────────────────┐
│     VERCEL (Frontend)           │  │       VERCEL (Backend API)              │
│  Static SPA Hosting             │  │  Serverless Node.js Functions           │
└─────────────────────────────────┘  └─────────────────────────────────────────┘
                                                       │
                                                       ▼
                             ┌───────────────────────────────────────────┐
                             │           MONGODB ATLAS                   │
                             │  Cloud Database                           │
                             └───────────────────────────────────────────┘
```

## 📂 Project Structure

```
checklist-app/
├── app/                    # Expo Router pages
├── components/             # Reusable React components
├── lib/                    # Configuration and utilities
├── services/               # API services and business logic
├── store/                  # Redux store and slices
├── types/                  # TypeScript type definitions
├── server/                 # Express.js backend API
│   ├── src/
│   │   ├── config/        # Passport.js configuration
│   │   ├── middleware/    # Auth middleware
│   │   ├── models/        # MongoDB schemas
│   │   └── routes/        # API routes
│   └── vercel.json        # Backend Vercel config
├── vercel.json            # Frontend Vercel config
└── package.json
```

## 🛠️ Tech Stack

### Frontend
- **React Native** (Expo) - Cross-platform UI
- **Expo Router** - File-based routing
- **Redux Toolkit** - State management
- **TypeScript** - Type safety

### Backend
- **Express.js** - Web framework
- **MongoDB** (Mongoose) - Database
- **Passport.js** - Google OAuth
- **JWT** - Authentication tokens (HTTP-only cookies)

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- MongoDB Atlas account
- Google Cloud Console project (for OAuth)

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd checklist-app
   ```

2. **Install dependencies**
   ```bash
   npm install --legacy-peer-deps
   npm run server:install
   ```

3. **Configure environment variables**

   Frontend (`.env`):
   ```bash
   EXPO_PUBLIC_API_URL=http://localhost:5001/api
   EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-client-id
   EXPO_PUBLIC_GEMINI_API_KEY=your-gemini-key  # Optional
   ```

   Backend (`server/.env`):
   ```bash
   MONGODB_URI=mongodb+srv://...
   JWT_SECRET=your-jwt-secret
   SESSION_SECRET=your-session-secret
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
   GOOGLE_CALLBACK_URL=http://localhost:5001/api/auth/google/callback
   CLIENT_URL=http://localhost:8081
   ```

4. **Start the development servers**
   ```bash
   # Terminal 1 - Backend
   npm run server:dev

   # Terminal 2 - Frontend
   npm run dev:web
   ```

5. **Open the app**
   - Frontend: http://localhost:8081
   - Backend: http://localhost:5001

## 📦 Deployment

See [VERCEL-DEPLOYMENT.md](./VERCEL-DEPLOYMENT.md) for detailed deployment instructions.

### Quick Deploy

1. Create two Vercel projects from this repo:
   - **Frontend**: Root = `/`, Build = `npx expo export -p web`
   - **Backend**: Root = `/server`

2. Add environment variables in Vercel dashboard

3. Update Google OAuth redirect URIs

## 📝 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Expo dev server |
| `npm run dev:web` | Start Expo web dev server |
| `npm run build:web` | Build for web (outputs to `/dist`) |
| `npm run preview` | Preview production build |
| `npm run server:dev` | Start backend dev server |
| `npm run server:install` | Install backend dependencies |
| `npm run lint` | Run linter |

## 📄 License

MIT

---

*Last Updated: December 2024*
