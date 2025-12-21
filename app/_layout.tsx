import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from '../store';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useAuthStateListener } from '../hooks/useAuthStateListener';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { ThemeProvider, useTheme } from '../lib/ThemeContext';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { Platform } from 'react-native';

function AppContent() {
  const router = useRouter();
  const { isDark } = useTheme();
  useAuthStateListener();

  useEffect(() => {
    // Only handle deep links on native platforms (iOS/Android)
    // Web OAuth is handled by the regular callback handler
    if (Platform.OS === 'web') {
      return;
    }

    // Handle incoming deep links for OAuth on native platforms
    const handleDeepLink = (url: string) => {
      console.log('🔗 Deep link received:', url);

      // Check if this is an OAuth callback
      if (url.includes('auth/callback')) {
        console.log('📱 OAuth callback deep link detected');

        // Parse the URL to extract query parameters
        const parsedUrl = Linking.parse(url);
        const params = parsedUrl.queryParams || {};

        console.log('🔑 OAuth callback params:', params);

        // Navigate to the mobile callback handler with the parameters
        const queryString = new URLSearchParams(params as Record<string, string>).toString();
        router.push(`/auth/callback-mobile?${queryString}` as any);
      }
    };

    // Listen for incoming links when app is already open
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    // Handle the initial URL if app was opened via deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    return () => subscription?.remove();
  }, [router]);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="ai-create" options={{ headerShown: false }} />
        <Stack.Screen name="checklist" />
        <Stack.Screen name="checklist-edit" />
        <Stack.Screen name="template-create" />
        <Stack.Screen name="sharing" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </>
  );
}

export default function RootLayout() {
  useFrameworkReady();

  return (
    <ErrorBoundary>
      <Provider store={store}>
        <PersistGate loading={<LoadingSpinner />} persistor={persistor}>
          <ThemeProvider>
            <AppContent />
          </ThemeProvider>
        </PersistGate>
      </Provider>
    </ErrorBoundary>
  );
}