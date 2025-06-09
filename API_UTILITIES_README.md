# Robust API Utilities

This document explains the new robust API utilities that provide internet connectivity checks, timeouts, retries, and error handling for all backend calls.

## Overview

The new system includes:

1. **ApiUtils** - Core utilities for network checking, retries, and error handling
2. **SupabaseApiWrapper** - Robust wrapper around Supabase client calls
3. **React Hooks** - For managing API state and network status
4. **Components** - Network-aware wrappers and error boundaries
5. **Updated Services** - Refactored to use the new robust API system

## Core Features

### 🌐 Internet Connectivity Checking
- Automatically checks internet connectivity before API calls
- Tests actual network reachability, not just connection status
- Provides real-time network status monitoring

### ⏱️ Timeouts and Retries
- Configurable timeouts for all API operations (default: 10-15 seconds)
- Automatic retries with exponential backoff
- Smart retry logic that avoids retrying non-recoverable errors

### 🔄 Error Handling
- Distinguishes between network errors, timeouts, and application errors
- User-friendly error messages
- Automatic error recovery when possible

### 📱 React Integration
- Custom hooks for API state management
- Network-aware components
- Error boundaries for graceful failure handling

## Usage Examples

### Basic API Call with Robust Handling

```typescript
import { SupabaseApiWrapper } from '../lib/supabaseApi';
import { ApiUtils } from '../lib/apiUtils';

// Simple query with automatic error handling
const response = await SupabaseApiWrapper.select<User>(
  'users',
  (query) => query.eq('id', userId)
);

// Handle the response
const users = ApiUtils.handleApiResponse(response, {
  showNetworkErrors: true,
  showGeneralErrors: true,
});
```

### Using API State Hook

```typescript
import { useApiState } from '../hooks/useApiState';

function MyComponent() {
  const { state, execute, reset } = useApiState<User[]>();

  const loadUsers = async () => {
    await execute(async () => {
      return SupabaseApiWrapper.select<User>('users');
    });
  };

  return (
    <div>
      {state.loading && <LoadingSpinner />}
      {state.error && <ErrorMessage error={state.error} />}
      {state.data && <UserList users={state.data} />}
    </div>
  );
}
```

### Network-Aware Component

```typescript
import { NetworkAwareWrapper } from '../components/NetworkAwareWrapper';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

function MyScreen() {
  const { isConnected } = useNetworkStatus();

  return (
    <NetworkAwareWrapper
      onRetry={() => {
        // Refresh data when user taps retry
        loadData();
      }}
    >
      <MyContent />
    </NetworkAwareWrapper>
  );
}
```

### Error Boundary for API Errors

```typescript
import { ApiErrorBoundary } from '../components/ApiErrorBoundary';

function App() {
  return (
    <ApiErrorBoundary
      onError={(error, errorInfo) => {
        // Log to crash reporting service
        console.error('API Error:', error, errorInfo);
      }}
    >
      <MyApp />
    </ApiErrorBoundary>
  );
}
```

## Configuration Options

### API Config

```typescript
interface ApiConfig {
  timeout?: number;        // Timeout in milliseconds (default: 10000)
  retries?: number;        // Number of retry attempts (default: 3)
  retryDelay?: number;     // Delay between retries in ms (default: 1000)
  requireNetwork?: boolean; // Check network before calling (default: true)
}

// Example: Custom timeout for file uploads
const response = await SupabaseApiWrapper.insert('files', fileData, {
  timeout: 30000, // 30 seconds for large uploads
  retries: 1,     // Don't retry uploads
});
```

### Supabase Query Options

```typescript
interface SupabaseQueryOptions extends ApiConfig {
  throwOnError?: boolean; // Throw errors instead of returning them
}
```

## Service Layer Updates

All services have been updated to use the robust API wrapper:

### AuthService
- Uses `SupabaseApiWrapper.signInWithPassword()` instead of direct Supabase calls
- Automatic retry logic for auth operations
- Better error messages for network issues

### BucketService
- All CRUD operations use `SupabaseApiWrapper` methods
- Silent operations available for internal use
- Automatic error alerts for user operations

### Example Service Method

```typescript
async createBucket(userId: string, bucketName: string): Promise<Bucket | null> {
  const response = await SupabaseApiWrapper.insert<Bucket>('buckets', {
    user_id: userId,
    bucket_name: bucketName,
  });

  if (!response.success) {
    if (response.isNetworkError) {
      ApiUtils.showNetworkErrorAlert(response.error);
    } else {
      ApiUtils.showErrorAlert('Error', response.error || 'Failed to create bucket');
    }
    return null;
  }

  return response.data && response.data.length > 0 ? response.data[0] : null;
}
```

## Network Status Monitoring

The `useNetworkStatus` hook provides real-time network monitoring:

```typescript
const { isConnected, isChecking, lastChecked } = useNetworkStatus();

// Auto-retry when connection is restored
useEffect(() => {
  if (isConnected && hadPreviousError) {
    retryFailedOperation();
  }
}, [isConnected]);
```

## Error Types

The system distinguishes between different error types:

### Network Errors
- No internet connection
- DNS resolution failures
- Connection timeouts
- Server unreachable

### Timeout Errors
- Operations that exceed the configured timeout
- Separate from network connectivity issues

### Application Errors
- Authentication failures
- Validation errors
- Permission issues
- Business logic errors

## Best Practices

1. **Use Silent Operations for Background Tasks**
   ```typescript
   // Don't show alerts for background operations
   const buckets = await bucketService.getUserBucketsSilent(userId);
   ```

2. **Configure Timeouts Based on Operation Type**
   ```typescript
   // Longer timeout for file operations
   const fileResponse = await SupabaseApiWrapper.insert('files', data, {
     timeout: 30000
   });
   
   // Shorter timeout for quick queries
   const userResponse = await SupabaseApiWrapper.selectSingle('users', 
     (q) => q.eq('id', userId), 
     { timeout: 5000 }
   );
   ```

3. **Handle Offline Scenarios**
   ```typescript
   const { isConnected } = useNetworkStatus();
   
   if (!isConnected) {
     // Queue operation for later or show offline message
     return;
   }
   ```

4. **Use Error Boundaries for Critical Sections**
   ```typescript
   <ApiErrorBoundary>
     <CriticalComponent />
   </ApiErrorBoundary>
   ```

## Migration Guide

To migrate existing code:

1. **Replace direct Supabase calls**:
   ```typescript
   // Before
   const { data, error } = await supabase.from('users').select('*');
   
   // After
   const response = await SupabaseApiWrapper.select<User>('users');
   ```

2. **Update error handling**:
   ```typescript
   // Before
   if (error) {
     throw new Error(error.message);
   }
   
   // After
   if (!response.success) {
     ApiUtils.handleApiResponse(response);
     return;
   }
   ```

3. **Add network awareness to components**:
   ```typescript
   // Wrap your components
   <NetworkAwareWrapper>
     <YourComponent />
   </NetworkAwareWrapper>
   ```

## Troubleshooting

### Common Issues

1. **TypeScript Errors**: Make sure to handle nullable return types from API calls
2. **Infinite Retries**: Check that you're not retrying non-recoverable errors
3. **Memory Leaks**: Ensure proper cleanup of network status listeners

### Debug Mode

In development, error boundaries show detailed error information including stack traces.

## Future Enhancements

- Offline data caching and sync
- Request deduplication
- Performance metrics collection
- Custom retry strategies
- Background sync capabilities
