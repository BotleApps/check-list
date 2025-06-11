import React from 'react';
import { Tabs } from 'expo-router';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { Home, FolderOpen, FileText, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform } from 'react-native';

export default function TabLayout() {
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const insets = useSafeAreaInsets();

  if (!isAuthenticated) {
    return null; // Will be handled by auth flow
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E5E7EB',
          paddingTop: 8,
          paddingBottom: Platform.OS === 'web' ? 12 : Math.max(insets.bottom, 8),
          height: Platform.OS === 'web' ? 68 : 64 + Math.max(insets.bottom - 8, 0),
          minHeight: Platform.OS === 'web' ? 68 : undefined,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 4,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ size, color }) => (
            <Home size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="buckets"
        options={{
          href: null, // Hide this tab from navigation
          title: 'Buckets',
          tabBarIcon: ({ size, color }) => (
            <FolderOpen size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="templates"
        options={{
          title: 'Templates',
          tabBarIcon: ({ size, color }) => (
            <FileText size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ size, color }) => (
            <User size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}