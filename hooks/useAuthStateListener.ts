import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../store';
import { setUser } from '../store/slices/authSlice';
import { auth } from '../lib/supabase';
import { oauthService } from '../services/oauth';

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
        // First, check if we have a valid session via the backend (HTTP-only cookie)
        // This is important after OAuth redirect when cookie is set but AsyncStorage is empty
        try {
          const result = await oauthService.checkAuthStatus();
          
          if (result.success && result.user && mounted) {
            console.log('✅ Auth status verified via backend:', { userId: result.user.user_id, email: result.user.email });
            // Store user locally for offline access
            await auth.setUser(result.user);
            dispatch(setUser(result.user));
            return;
          }
        } catch (backendError) {
          // Backend check failed - this is normal if server is unavailable
          // Fall back to local storage check
          console.log('ℹ️ Backend auth check unavailable, checking local storage');
        }

        // Fallback: check locally stored auth
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
