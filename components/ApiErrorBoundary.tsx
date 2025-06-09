import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ApiUtils } from '../lib/apiUtils';

interface ApiErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  isNetworkError: boolean;
}

interface ApiErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{
    error: Error | null;
    isNetworkError: boolean;
    onRetry: () => void;
  }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export class ApiErrorBoundary extends React.Component<
  ApiErrorBoundaryProps,
  ApiErrorBoundaryState
> {
  constructor(props: ApiErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      isNetworkError: false,
    };
  }

  static getDerivedStateFromError(error: Error): ApiErrorBoundaryState {
    const isNetworkError = error.name === 'NetworkError' || 
                          error.message.toLowerCase().includes('network') ||
                          error.message.toLowerCase().includes('connection') ||
                          error.message.toLowerCase().includes('timeout');

    return {
      hasError: true,
      error,
      isNetworkError,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('API Error Boundary caught an error:', error, errorInfo);
    
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      isNetworkError: false,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return (
          <FallbackComponent
            error={this.state.error}
            isNetworkError={this.state.isNetworkError}
            onRetry={this.handleRetry}
          />
        );
      }

      return (
        <DefaultErrorFallback
          error={this.state.error}
          isNetworkError={this.state.isNetworkError}
          onRetry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}

interface DefaultErrorFallbackProps {
  error: Error | null;
  isNetworkError: boolean;
  onRetry: () => void;
}

function DefaultErrorFallback({
  error,
  isNetworkError,
  onRetry,
}: DefaultErrorFallbackProps) {
  const getErrorMessage = () => {
    if (isNetworkError) {
      return 'Network connection problem. Please check your internet connection and try again.';
    }
    
    return error?.message || 'An unexpected error occurred. Please try again.';
  };

  const getErrorTitle = () => {
    if (isNetworkError) {
      return 'Connection Problem';
    }
    
    return 'Something Went Wrong';
  };

  return (
    <View style={styles.container}>
      <View style={styles.errorContent}>
        <Text style={styles.errorTitle}>{getErrorTitle()}</Text>
        <Text style={styles.errorMessage}>{getErrorMessage()}</Text>
        
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
        
        {__DEV__ && (
          <View style={styles.debugInfo}>
            <Text style={styles.debugText}>Debug Info:</Text>
            <Text style={styles.debugDetails}>
              {error?.name}: {error?.message}
            </Text>
            <Text style={styles.debugDetails}>
              Stack: {error?.stack?.slice(0, 200)}...
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  errorContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 120,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  debugInfo: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    width: '100%',
  },
  debugText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  debugDetails: {
    fontSize: 10,
    color: '#666',
    fontFamily: 'monospace',
    marginBottom: 2,
  },
});

// Hook for handling API errors in functional components
export function useApiErrorHandler() {
  const handleApiError = (error: unknown, showAlert: boolean = true) => {
    console.error('API Error:', error);
    
    if (showAlert) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      const isNetworkError = error instanceof Error && 
        (error.name === 'NetworkError' || 
         error.message.toLowerCase().includes('network') ||
         error.message.toLowerCase().includes('connection'));
      
      if (isNetworkError) {
        ApiUtils.showNetworkErrorAlert(errorMessage);
      } else {
        ApiUtils.showErrorAlert('Error', errorMessage);
      }
    }
  };

  return { handleApiError };
}
