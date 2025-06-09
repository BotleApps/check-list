import { useState, useEffect } from 'react';
import { ApiUtils } from '../lib/apiUtils';

export interface NetworkStatus {
  isConnected: boolean;
  isChecking: boolean;
  lastChecked: Date | null;
}

export function useNetworkStatus(checkInterval: number = 30000): NetworkStatus {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isConnected: true, // Assume connected initially
    isChecking: false,
    lastChecked: null,
  });

  const checkConnectivity = async () => {
    setNetworkStatus(prev => ({ ...prev, isChecking: true }));
    
    try {
      const isConnected = await ApiUtils.checkInternetConnectivity();
      setNetworkStatus({
        isConnected,
        isChecking: false,
        lastChecked: new Date(),
      });
    } catch (error) {
      console.warn('Network check failed:', error);
      setNetworkStatus({
        isConnected: false,
        isChecking: false,
        lastChecked: new Date(),
      });
    }
  };

  useEffect(() => {
    // Initial check
    checkConnectivity();

    // Set up periodic checks
    const interval = setInterval(checkConnectivity, checkInterval);

    return () => clearInterval(interval);
  }, [checkInterval]);

  return networkStatus;
}

export function useOnlineStatus(): boolean {
  const { isConnected } = useNetworkStatus();
  return isConnected;
}
