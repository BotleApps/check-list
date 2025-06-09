import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

interface NetworkAwareWrapperProps {
  children: React.ReactNode;
  showOfflineMessage?: boolean;
  offlineMessage?: string;
  retryEnabled?: boolean;
  onRetry?: () => void;
}

export function NetworkAwareWrapper({
  children,
  showOfflineMessage = true,
  offlineMessage = 'You appear to be offline. Some features may not work properly.',
  retryEnabled = true,
  onRetry,
}: NetworkAwareWrapperProps) {
  const { isConnected, isChecking } = useNetworkStatus();

  const handleRetry = async () => {
    if (onRetry) {
      onRetry();
    }
  };

  return (
    <View style={styles.container}>
      {!isConnected && showOfflineMessage && (
        <View style={styles.offlineBar}>
          <Text style={styles.offlineText}>
            {isChecking ? 'Checking connection...' : offlineMessage}
          </Text>
          {retryEnabled && !isChecking && (
            <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  offlineBar: {
    backgroundColor: '#ff6b6b',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  offlineText: {
    color: 'white',
    fontSize: 14,
    flex: 1,
    marginRight: 12,
  },
  retryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  retryText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
});

// Higher-order component version
export function withNetworkAwareness<P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<NetworkAwareWrapperProps, 'children'>
) {
  return function NetworkAwareComponent(props: P) {
    return (
      <NetworkAwareWrapper {...options}>
        <Component {...props} />
      </NetworkAwareWrapper>
    );
  };
}
