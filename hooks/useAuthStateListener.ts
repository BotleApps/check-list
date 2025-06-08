import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../store';
import { setUser, checkAuthStatus } from '../store/slices/authSlice';
import { authService } from '../services/authService';

export const useAuthStateListener = () => {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    // Check initial auth status
    dispatch(checkAuthStatus());

    // Listen for auth state changes
    const { data: { subscription } } = authService.onAuthStateChange((user) => {
      dispatch(setUser(user));
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [dispatch]);
};
