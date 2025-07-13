import { Alert } from 'react-native';

export interface ApiConfig {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  requireNetwork?: boolean;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
  isNetworkError?: boolean;
  isTimeout?: boolean;
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

export class ApiUtils {
  private static readonly DEFAULT_TIMEOUT = 10000; // 10 seconds
  private static readonly DEFAULT_RETRIES = 3;
  private static readonly DEFAULT_RETRY_DELAY = 1000; // 1 second

  /**
   * Check if device has internet connectivity
   */
  static async checkInternetConnectivity(): Promise<boolean> {
    try {
      // For web, use a more reliable approach that doesn't trigger CORS
      if (typeof window !== 'undefined') {
        // Check if online property exists and is false
        if (typeof navigator.onLine !== 'undefined' && !navigator.onLine) {
          return false;
        }
        
        // Try to make a request to our own origin or a CORS-friendly endpoint
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        try {
          // Try a lightweight request to a CORS-friendly endpoint
          const response = await fetch('https://httpbin.org/status/200', {
            method: 'HEAD',
            signal: controller.signal,
            cache: 'no-cache',
          });
          clearTimeout(timeoutId);
          return response.ok;
        } catch (fetchError) {
          clearTimeout(timeoutId);
          // If httpbin fails, fall back to navigator.onLine
          return typeof navigator.onLine !== 'undefined' ? navigator.onLine : true;
        }
      } else {
        // For mobile, use the original approach (Google favicon works fine)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const response = await fetch('https://www.google.com/favicon.ico', {
          method: 'HEAD',
          signal: controller.signal,
          cache: 'no-cache',
        });

        clearTimeout(timeoutId);
        return response.ok;
      }
    } catch (error) {
      console.warn('Error checking network connectivity:', error);
      // On web, fall back to navigator.onLine, on mobile assume disconnected
      if (typeof window !== 'undefined' && typeof navigator.onLine !== 'undefined') {
        return navigator.onLine;
      }
      return false;
    }
  }

  /**
   * Test actual API connectivity by making a lightweight request
   */
  static async testApiConnectivity(testUrl?: string): Promise<boolean> {
    try {
      const url = testUrl || 'https://httpbin.org/status/200';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      console.warn('API connectivity test failed:', error);
      return false;
    }
  }

  /**
   * Execute an API call with timeout, retries, and network checking
   */
  static async executeWithRetry<T>(
    apiCall: () => Promise<T>,
    config: ApiConfig = {}
  ): Promise<ApiResponse<T>> {
    const {
      timeout = this.DEFAULT_TIMEOUT,
      retries = this.DEFAULT_RETRIES,
      retryDelay = this.DEFAULT_RETRY_DELAY,
      requireNetwork = true,
    } = config;

    // Check network connectivity first if required
    if (requireNetwork) {
      const isConnected = await this.checkInternetConnectivity();
      if (!isConnected) {
        return {
          success: false,
          error: 'No internet connection. Please check your network and try again.',
          isNetworkError: true,
        };
      }
    }

    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const result = await this.withTimeout(apiCall(), timeout);
        return {
          success: true,
          data: result,
        };
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on certain types of errors
        if (this.isNonRetryableError(error)) {
          break;
        }

        // If not the last attempt, wait before retrying
        if (attempt < retries) {
          await this.delay(retryDelay * (attempt + 1)); // Exponential backoff
          
          // Re-check network connectivity for network errors
          if (requireNetwork && this.isNetworkRelatedError(error)) {
            const isConnected = await this.checkInternetConnectivity();
            if (!isConnected) {
              return {
                success: false,
                error: 'Lost internet connection during operation.',
                isNetworkError: true,
              };
            }
          }
        }
      }
    }

    // Determine error type
    const isNetworkError = this.isNetworkRelatedError(lastError);
    const isTimeout = lastError instanceof TimeoutError;

    return {
      success: false,
      error: this.getErrorMessage(lastError, retries),
      isNetworkError,
      isTimeout,
    };
  }

  /**
   * Add timeout to a promise
   */
  private static async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new TimeoutError(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  /**
   * Delay execution for specified milliseconds
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if error is network-related
   */
  private static isNetworkRelatedError(error: unknown): boolean {
    if (!error) return false;
    
    const errorMessage = (error as Error).message?.toLowerCase() || '';
    const errorName = (error as Error).name?.toLowerCase() || '';
    
    return (
      error instanceof NetworkError ||
      errorName.includes('network') ||
      errorMessage.includes('network') ||
      errorMessage.includes('connection') ||
      errorMessage.includes('fetch') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('unreachable') ||
      errorMessage.includes('dns') ||
      errorMessage.includes('socket')
    );
  }

  /**
   * Check if error should not be retried
   */
  private static isNonRetryableError(error: unknown): boolean {
    if (!error) return false;
    
    const errorMessage = (error as Error).message?.toLowerCase() || '';
    
    // Don't retry authentication, permission, or validation errors
    return (
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('forbidden') ||
      errorMessage.includes('invalid') ||
      errorMessage.includes('bad request') ||
      errorMessage.includes('not found') ||
      errorMessage.includes('conflict')
    );
  }

  /**
   * Get user-friendly error message
   */
  private static getErrorMessage(error: unknown, retries: number): string {
    if (!error) return 'Unknown error occurred';

    const originalMessage = (error as Error).message || 'Unknown error';

    if (error instanceof TimeoutError) {
      return `Request timed out after ${retries + 1} attempts. Please check your connection and try again.`;
    }

    if (this.isNetworkRelatedError(error)) {
      return `Network error after ${retries + 1} attempts. Please check your internet connection.`;
    }

    // Return original message for other errors
    return originalMessage;
  }

  /**
   * Show network error alert to user
   */
  static showNetworkErrorAlert(error?: string): void {
    Alert.alert(
      'Connection Problem',
      error || 'Unable to connect to the server. Please check your internet connection and try again.',
      [
        { text: 'OK', style: 'default' }
      ]
    );
  }

  /**
   * Show general error alert to user
   */
  static showErrorAlert(title: string, message: string): void {
    Alert.alert(
      title,
      message,
      [
        { text: 'OK', style: 'default' }
      ]
    );
  }

  /**
   * Handle API response and show appropriate alerts
   */
  static handleApiResponse<T>(
    response: ApiResponse<T>,
    options: {
      showNetworkErrors?: boolean;
      showGeneralErrors?: boolean;
      customErrorHandler?: (error: string) => void;
    } = {}
  ): T | null {
    const {
      showNetworkErrors = true,
      showGeneralErrors = true,
      customErrorHandler,
    } = options;

    if (response.success) {
      return response.data || null;
    }

    // Handle custom error handler
    if (customErrorHandler && response.error) {
      customErrorHandler(response.error);
      return null;
    }

    // Show network error
    if (response.isNetworkError && showNetworkErrors) {
      this.showNetworkErrorAlert(response.error);
      return null;
    }

    // Show general error
    if (showGeneralErrors && response.error) {
      this.showErrorAlert('Error', response.error);
      return null;
    }

    return null;
  }
}
