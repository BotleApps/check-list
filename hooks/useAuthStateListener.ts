import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../store';
import { setUser, checkAuthStatus } from '../store/slices/authSlice';
import { authService } from '../services/authService';

export const useAuthStateListener = () => {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    let mounted = true;

    // Check initial auth status
    const checkInitialAuth = async () => {
      try {
        await dispatch(checkAuthStatus()).unwrap();
      } catch (error) {
        console.error('Error checking initial auth status:', error);
      }
    };

    checkInitialAuth();

    // Listen for auth state changes
    const { data: { subscription } } = authService.onAuthStateChange((user) => {
      if (mounted) {
        dispatch(setUser(user));
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [dispatch]);
};
