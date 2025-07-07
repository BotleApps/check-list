import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { googleAuthService } from '../services/googleAuthService';
import { Platform } from 'react-native';

export const GoogleConfigTest: React.FC = () => {
  const testConfig = () => {
    const isConfigured = googleAuthService.isConfigured();
    const clientId = googleAuthService.getCurrentClientId();
    
    Alert.alert(
      'Google OAuth Debug Info',
      `Platform: ${Platform.OS}\n` +
      `Configured: ${isConfigured}\n` +
      `Client ID: ${clientId.substring(0, 20)}...`
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.testButton} onPress={testConfig}>
        <Text style={styles.testButtonText}>Test Google Config</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 16,
  },
  testButton: {
    backgroundColor: '#FF9800',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  testButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
