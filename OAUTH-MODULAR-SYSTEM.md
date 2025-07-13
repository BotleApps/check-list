# Modular OAuth System Documentation

## Overview

This document describes the new modular OAuth authentication system that provides a clean, maintainable, and platform-agnostic approach to Google authentication across web, iOS, and Android platforms.

## Architecture

### Core Components

1. **BaseOAuthProvider** - Abstract base class with common OAuth functionality
2. **Platform-Specific Providers** - Implementations for web, iOS, and Android
3. **OAuthProviderFactory** - Factory pattern for automatic platform detection
4. **OAuthService** - Central service managing the entire OAuth flow
5. **Type System** - Comprehensive TypeScript interfaces for type safety

### File Structure

```
services/oauth/
├── index.ts                    # Main exports
├── types.ts                    # TypeScript interfaces and utilities
├── BaseOAuthProvider.ts        # Abstract base provider
├── WebOAuthProvider.ts         # Web-specific implementation
├── iOSOAuthProvider.ts         # iOS-specific implementation  
├── AndroidOAuthProvider.ts     # Android-specific implementation
├── OAuthProviderFactory.ts     # Platform detection factory
└── OAuthService.ts             # Central OAuth service
```

## Usage

### Basic Usage

```typescript
import { oauthService } from '../../services/oauth';

// Sign in with Google
const result = await oauthService.signInWithGoogle();
if (result.success) {
  console.log('Authentication successful');
} else {
  console.error('Authentication failed:', result.error?.message);
}

// Check if OAuth is available
if (oauthService.isAvailable()) {
  // OAuth is properly configured
}

// Get platform information
const platform = oauthService.getPlatform(); // 'web' | 'ios' | 'android'

// Debug configuration
oauthService.debugConfig();
```

### Integration with Components

```typescript
import { oauthService } from '../../services/oauth';

function LoginButton() {
  const handleGoogleSignIn = async () => {
    const result = await oauthService.signInWithGoogle();
    
    if (result.success) {
      // Handle successful authentication
      navigate('/dashboard');
    } else {
      // Handle error
      setError(result.error?.message);
    }
  };

  return (
    <button 
      onClick={handleGoogleSignIn}
      disabled={!oauthService.isAvailable()}
    >
      Sign in with Google
    </button>
  );
}
```

## Platform-Specific Features

### Web Platform

- Uses Supabase OAuth redirects
- Handles browser-based authentication flow
- Supports both development and production environments
- Automatic redirect URL generation

### iOS Platform

- Detects iOS simulator vs physical device
- Provides simulator-specific warnings
- Uses iOS bundle ID for OAuth redirects
- Fallback to web client ID when iOS client ID not configured

### Android Platform  

- Detects Android emulator vs physical device
- Provides emulator-specific guidance
- Uses Android package name for OAuth redirects
- Enhanced error handling for common Android issues

## Configuration

### Environment Setup

The system automatically detects configuration from `expo-config`:

```javascript
// app.config.js
export default {
  extra: {
    googleOAuth: {
      webClientId: 'your-web-client-id.googleusercontent.com',
      iosClientId: 'your-ios-client-id.googleusercontent.com', 
      androidClientId: 'your-android-client-id.googleusercontent.com'
    }
  }
};
```

### Platform Detection

The system automatically detects the current platform:

- **Web**: `Platform.OS === 'web'`
- **iOS**: `Platform.OS === 'ios'`  
- **Android**: `Platform.OS === 'android'`

## Error Handling

### Structured Error Objects

All errors follow a consistent structure:

```typescript
interface OAuthError {
  code: string;
  message: string;
  details?: any;
}
```

### Common Error Codes

- `not_configured` - OAuth not properly configured for platform
- `user_cancelled` - User cancelled authentication
- `oauth_initiation_failed` - Failed to start OAuth flow
- `callback_error` - Error during callback processing
- `session_error` - Failed to establish session
- `unknown_error` - Unexpected error occurred

### Error Handling Example

```typescript
const result = await oauthService.signInWithGoogle();

if (!result.success) {
  switch (result.error?.code) {
    case 'not_configured':
      showMessage('Please contact support - authentication not configured');
      break;
    case 'user_cancelled':
      showMessage('Sign-in was cancelled. Please try again.');
      break;
    case 'oauth_initiation_failed':
      showMessage('Unable to start authentication. Please try again.');
      break;
    default:
      showMessage('Authentication failed. Please try again.');
  }
}
```

## Debugging

### Debug Information

Get comprehensive debug information:

```typescript
const debugInfo = oauthService.getDebugInfo();
console.log('OAuth Debug Info:', debugInfo);
```

### Platform-Specific Debugging

```typescript
// Get current provider for detailed debugging
const provider = OAuthProviderFactory.getProvider();
provider.debugConfig();

// For iOS, check simulator issues
if (provider instanceof iOSOAuthProvider) {
  provider.debugSimulatorIssues();
}

// For Android, check emulator issues  
if (provider instanceof AndroidOAuthProvider) {
  provider.debugEmulatorIssues();
}
```

## Migration from Legacy System

### Before (Legacy)

```typescript
// Old approach - platform-specific code everywhere
if (Platform.OS === 'web') {
  // Web-specific OAuth code
} else if (Platform.OS === 'ios') {
  // iOS-specific OAuth code  
} else {
  // Android-specific OAuth code
}
```

### After (Modular)

```typescript
// New approach - unified interface
const result = await oauthService.signInWithGoogle();
// Platform differences handled automatically
```

### Component Migration

#### Before

```typescript
// Complex component with platform checks
function GoogleSignInButton() {
  const handleSignIn = async () => {
    if (Platform.OS === 'web') {
      // Web OAuth logic
    } else {
      // Mobile OAuth logic
    }
  };
  
  return <Button onPress={handleSignIn} />;
}
```

#### After

```typescript
// Clean component using modular service
function GoogleSignInButton() {
  const handleSignIn = async () => {
    const result = await oauthService.signInWithGoogle();
    // Handle result uniformly
  };
  
  return <Button onPress={handleSignIn} />;
}
```

## Benefits

### 1. **Maintainability**
- Single responsibility per class
- Clear separation of concerns
- Easy to modify platform-specific behavior

### 2. **Type Safety**
- Comprehensive TypeScript interfaces
- Compile-time error detection
- Better IDE support and autocomplete

### 3. **Testability**
- Isolated components for unit testing
- Mockable interfaces
- Platform-specific test scenarios

### 4. **Extensibility**
- Easy to add new OAuth providers
- Simple platform addition process
- Configurable behavior per platform

### 5. **Developer Experience**
- Consistent API across platforms
- Comprehensive error messages
- Built-in debugging utilities

## Best Practices

### 1. Always Check Availability

```typescript
if (oauthService.isAvailable()) {
  // Proceed with OAuth
} else {
  // Show alternative authentication or error
}
```

### 2. Handle All Error Cases

```typescript
const result = await oauthService.signInWithGoogle();
if (!result.success) {
  // Always handle errors appropriately
  logError(result.error);
  showUserFriendlyError(result.error?.message);
}
```

### 3. Use Debug Information

```typescript
// In development, log debug information
if (__DEV__) {
  oauthService.debugConfig();
}
```

### 4. Test on All Platforms

- Test web in multiple browsers
- Test iOS on both simulator and device
- Test Android on both emulator and device

## Troubleshooting

### Common Issues

1. **OAuth Not Available**
   - Check client ID configuration
   - Verify platform-specific settings
   - Run `oauthService.debugConfig()`

2. **iOS Simulator Issues**
   - OAuth may not work on simulator
   - Test on physical device
   - Check bundle ID configuration

3. **Android Emulator Issues**
   - Emulator may need additional setup
   - Test on physical device
   - Verify package name in OAuth console

4. **Web Redirect Issues**
   - Check redirect URL configuration
   - Verify domain whitelist in OAuth console
   - Ensure HTTPS in production

### Debug Commands

```typescript
// Check overall configuration
oauthService.debugConfig();

// Get platform information
console.log('Platform:', oauthService.getPlatform());
console.log('Available:', oauthService.isAvailable());

// Get detailed debug info
console.log('Debug Info:', oauthService.getDebugInfo());
```

## Future Enhancements

### Planned Features

1. **Additional OAuth Providers**
   - Facebook authentication
   - Apple Sign-In
   - GitHub authentication

2. **Enhanced Error Recovery**
   - Automatic retry mechanisms
   - Fallback authentication methods
   - Better error categorization

3. **Advanced Configuration**
   - Runtime configuration updates
   - A/B testing support
   - Feature flags integration

4. **Performance Optimizations**
   - Lazy loading of platform providers
   - Caching of authentication state
   - Background token refresh

### Contributing

To extend the OAuth system:

1. **Adding New Providers**: Extend `BaseOAuthProvider`
2. **Platform Support**: Update `OAuthProviderFactory`
3. **New Features**: Modify interfaces in `types.ts`
4. **Testing**: Add platform-specific test cases

---

This modular OAuth system provides a robust, maintainable foundation for authentication across all platforms while maintaining clean separation of concerns and comprehensive error handling.
