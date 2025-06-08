import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from '../store';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useAuthStateListener } from '../hooks/useAuthStateListener';
import { LoadingSpinner } from '../components/LoadingSpinner';

function AppContent() {
  useAuthStateListener();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen name="checklist" />
      <Stack.Screen name="checklist-edit" />
      <Stack.Screen name="template-create" />
      <Stack.Screen name="sharing" />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  useFrameworkReady();

  return (
    <Provider store={store}>
      <PersistGate loading={<LoadingSpinner />} persistor={persistor}>
        <AppContent />
        <StatusBar style="auto" />
      </PersistGate>
    </Provider>
  );
}