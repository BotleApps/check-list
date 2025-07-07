# Google OAuth Setup Guide

This guide explains how to set up Google OAuth authentication for the CheckList app.

## Prerequisites

1. A Google Cloud Console project
2. Access to your Supabase project dashboard

## Step 1: Google Cloud Console Setup

### 1.1 Create OAuth 2.0 Client IDs

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create a new one)
3. Navigate to **APIs & Services** > **Credentials**
4. Click **+ CREATE CREDENTIALS** > **OAuth client ID**

### 1.2 Create Web Client ID

1. Choose **Web application**
2. Name it something like "CheckList Web"
3. Add authorized redirect URIs:
   - For development: `http://localhost:3000/auth/google`
   - For production: `https://yourdomain.com/auth/google`
   - For Supabase: `https://your-project-id.supabase.co/auth/v1/callback`
4. Save and copy the **Client ID**

### 1.3 Create Android Client ID (if targeting Android)

1. Choose **Android**
2. Name it "CheckList Android"
3. Package name: `in.botle.checklistapp` (match app.json)
4. Get your SHA-1 certificate fingerprint:
   ```bash
   # For development
   keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
   
   # For production (use your release keystore)
   keytool -list -v -keystore /path/to/your-release-key.keystore -alias your-key-alias
   ```
5. Save and copy the **Client ID**

### 1.4 Create iOS Client ID (if targeting iOS)

1. Choose **iOS**
2. Name it "CheckList iOS"  
3. Bundle ID: `in.botle.checklistapp` (match app.json)
4. Save and copy the **Client ID**

## Step 2: Supabase Configuration

### 2.1 Enable Google Provider

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** > **Providers**
3. Find **Google** and click **Enable**
4. Enter your **Web Client ID** and **Client Secret** from Google Cloud Console
5. Add redirect URLs:
   - `myapp://auth/google` (for mobile)
   - `https://your-project-id.supabase.co/auth/v1/callback`
6. Save the configuration

### 2.2 Configure Redirect URLs

1. In Supabase, go to **Authentication** > **URL Configuration**
2. Add these redirect URLs:
   - `myapp://auth/google`
   - `http://localhost:8081/auth/google` (for Expo development)
   - Your production domain callback URLs

## Step 3: App Configuration

### 3.1 Update app.json

Replace the placeholder values in `/app.json`:

```json
{
  "expo": {
    "extra": {
      "googleOAuth": {
        "webClientId": "YOUR_WEB_CLIENT_ID.googleusercontent.com",
        "androidClientId": "YOUR_ANDROID_CLIENT_ID.googleusercontent.com",
        "iosClientId": "YOUR_IOS_CLIENT_ID.googleusercontent.com"
      }
    }
  }
}
```

### 3.2 Update Bundle/Package Identifiers

Make sure the bundle identifiers in `app.json` match what you configured in Google Cloud Console:

```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "in.botle.checklistapp"
    },
    "android": {
      "package": "in.botle.checklistapp"
    }
  }
}
```

## Step 4: Testing

### 4.1 Development Testing

1. Start your development server:
   ```bash
   npm start
   ```

2. Test on different platforms:
   - **Web**: Press `w` to open in browser
   - **iOS Simulator**: Press `i` (requires Xcode)
   - **Android Emulator**: Press `a` (requires Android Studio)
   - **Physical Device**: Scan QR code with Expo Go app

### 4.2 Production Testing

1. Build your app:
   ```bash
   # For iOS
   eas build --platform ios
   
   # For Android  
   eas build --platform android
   
   # For web
   npm run build
   ```

2. Test the Google OAuth flow on the built app

## Troubleshooting

### Common Issues

1. **"OAuth client not found"**
   - Check that your client IDs are correctly copied
   - Verify the bundle/package identifiers match

2. **"redirect_uri_mismatch"**
   - Ensure all redirect URIs are properly configured in Google Cloud Console
   - Check that Supabase redirect URLs are correct

3. **"Invalid client"**
   - Verify that your Google OAuth client is enabled
   - Check that the client secret is correctly set in Supabase

4. **Web authentication not working**
   - Ensure your web domain is added to authorized origins in Google Cloud Console
   - Check that CORS is properly configured

### Debug Information

The app includes debug logging. Check the console for:
- OAuth configuration status
- Authentication flow steps  
- Error details

You can also check if Google OAuth is properly configured:
```typescript
import { googleAuthService } from './services/googleAuthService';
console.log('Google OAuth configured:', googleAuthService.isConfigured());
console.log('Current client ID:', googleAuthService.getCurrentClientId());
```

## Security Notes

1. **Never commit real client secrets** to version control
2. **Use environment variables** for sensitive configuration in production
3. **Regularly rotate** your OAuth client secrets
4. **Monitor** your Google Cloud Console for unusual activity
5. **Restrict** your OAuth clients to specific domains/packages in production

## Additional Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Expo AuthSession Documentation](https://docs.expo.dev/versions/latest/sdk/auth-session/)
- [React Native Google Sign-In](https://github.com/react-native-google-signin/google-signin)
