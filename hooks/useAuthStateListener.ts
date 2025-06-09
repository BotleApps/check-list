import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../store';
import { setUser, clearAuth } from '../store/slices/authSlice';
import { supabase } from '../lib/supabase';
import { authService } from '../services/authService';

export const useAuthStateListener = () => {
  const dispatch = useDispatch<AppDispatch>();
  const isProcessingRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted || isProcessingRef.current) {
        return;
      }

      // Skip the SIGNED_IN event and only process INITIAL_SESSION to avoid race conditions
      if (event === 'SIGNED_IN') {
        return;
      }

      isProcessingRef.current = true;

      try {
        if (event === 'SIGNED_OUT') {
          dispatch(clearAuth());
        } else if (session?.user && (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED')) {
          try {
            const user = await authService.getUserProfile(session.user.id, session.user.email || '');
            dispatch(setUser(user));
          } catch (error) {
            console.error('Error getting user profile on auth change:', error);
            // Don't completely fail - set user to null and let them retry
            dispatch(setUser(null));
          }
        } else {
          dispatch(setUser(null));
        }
      } catch (error) {
        console.error('Error handling auth state change:', error);
        dispatch(setUser(null));
      } finally {
        isProcessingRef.current = false;
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [dispatch]);
};
