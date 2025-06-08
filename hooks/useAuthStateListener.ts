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
      console.log('Auth state change:', event, session?.user?.id);
      
      if (!mounted || isProcessingRef.current) {
        console.log('Skipping auth state change (not mounted or already processing)');
        return;
      }

      isProcessingRef.current = true;

      try {
        if (event === 'SIGNED_OUT') {
          console.log('User signed out');
          dispatch(clearAuth());
        } else if (session?.user && (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
          console.log('User session found, getting profile...');
          try {
            const user = await authService.getUserProfile(session.user.id, session.user.email || '');
            console.log('User profile loaded successfully');
            dispatch(setUser(user));
          } catch (error) {
            console.error('Error getting user profile on auth change:', error);
            dispatch(setUser(null));
          }
        } else {
          console.log('No user in session');
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
