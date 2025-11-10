import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../store';
import { setUser } from '../store/slices/authSlice';
import { auth } from '../lib/supabase';

/**
 * Simple auth state listener for Google OAuth
 * - Checks if we have a stored token and user on mount
 * - No complex Supabase session management
 */
export const useAuthStateListener = () => {
  const dispatch = useDispatch<AppDispatch>();
  const initialCheckDoneRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    const checkInitialSession = async () => {
      if (initialCheckDoneRef.current) {
        return;
      }

      try {
        // Simply check if we have stored token and user data
        const token = await auth.getToken();
        const user = await auth.getUser();
        
        if (token && user && mounted) {
          console.log('✅ Found stored auth:', { userId: user.user_id, email: user.email });
          dispatch(setUser(user));
        } else {
          console.log('ℹ️ No stored auth found, user will be redirected to login');
          dispatch(setUser(null));
        }
      } catch (error) {
        console.error('Error checking initial auth:', error);
        dispatch(setUser(null));
      } finally {
        initialCheckDoneRef.current = true;
      }
    };

    checkInitialSession();

    return () => {
      mounted = false;
    };
  }, [dispatch]);
};
