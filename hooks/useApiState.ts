import { useState, useCallback } from 'react';
import { ApiResponse } from '../lib/apiUtils';

export interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  isNetworkError: boolean;
  isTimeout: boolean;
}

export function useApiState<T>(initialData: T | null = null): {
  state: ApiState<T>;
  execute: (apiCall: () => Promise<ApiResponse<T>>) => Promise<T | null>;
  reset: () => void;
  setData: (data: T | null) => void;
} {
  const [state, setState] = useState<ApiState<T>>({
    data: initialData,
    loading: false,
    error: null,
    isNetworkError: false,
    isTimeout: false,
  });

  const execute = useCallback(async (apiCall: () => Promise<ApiResponse<T>>): Promise<T | null> => {
    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
      isNetworkError: false,
      isTimeout: false,
    }));

    try {
      const response = await apiCall();
      
      setState({
        data: response.data || null,
        loading: false,
        error: response.error || null,
        isNetworkError: response.isNetworkError || false,
        isTimeout: response.isTimeout || false,
      });

      return response.success ? response.data || null : null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      setState({
        data: null,
        loading: false,
        error: errorMessage,
        isNetworkError: false,
        isTimeout: false,
      });

      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      data: initialData,
      loading: false,
      error: null,
      isNetworkError: false,
      isTimeout: false,
    });
  }, [initialData]);

  const setData = useCallback((data: T | null) => {
    setState(prev => ({
      ...prev,
      data,
    }));
  }, []);

  return { state, execute, reset, setData };
}

// Simplified hook for cases where you don't need the full state
export function useApiCall<T>(): [(apiCall: () => Promise<ApiResponse<T>>) => Promise<T | null>, boolean, string | null] {
  const { state, execute } = useApiState<T>();
  return [execute, state.loading, state.error];
}
