# Testing Guide

## 📱 Testing the Application

### Prerequisites
- Ensure you have Supabase credentials configured in your `.env` file
- The app requires a real Supabase backend for authentication

### 1. Authentication Flow
- **Login**: Use your actual registered email and password
- **Registration**: Register with a valid email address
- **Forgot Password**: Uses real Supabase password reset functionality

### 2. Feature Testing
- ✅ All auth screens are properly linked
- ✅ Login ↔ Register navigation works
- ✅ Forgot Password ↔ Login navigation works
- ✅ After login, you're redirected to the main app
- ✅ User profile is loaded from Supabase
- ✅ All CRUD operations work with real data

### 3. Network Resilience Testing
- ✅ Test offline/online behavior
- ✅ Network error handling and retry logic
- ✅ Graceful degradation when connection is poor

## 🎯 Production Setup

To deploy the application:

1. **Set up your Supabase project**:
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Enable email authentication in Auth settings
   - Run the database migrations from `supabase/migrations/`

2. **Update environment variables**:
   - Set the values in your hosting platform (Netlify, etc.):
   ```bash
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key
   ```

3. **Deploy**:
   ```bash
   npm run build:web
   ./deploy.sh
   ```

## 🐛 Troubleshooting

- **Auth Issues**: Check Supabase logs and ensure environment variables are set
- **Network Issues**: Check browser developer tools for network errors
- **Build Issues**: Ensure all dependencies are installed and TypeScript compiles without errors
