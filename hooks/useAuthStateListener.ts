import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { useRouter } from 'expo-router';
import { Platform } from 'react-native';
import { AppDispatch } from '../store';
import { setUser, clearAuth } from '../store/slices/authSlice';
import { supabase } from '../lib/supabase';
import { authService } from '../services/authService';

export const useAuthStateListener = () => {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const isProcessingRef = useRef(false);
  const initialCheckDoneRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    // Check for existing session on app startup
    const checkInitialSession = async () => {
      if (initialCheckDoneRef.current) {
        return;
      }

      try {
        isProcessingRef.current = true; // Prevent auth state listener from interfering
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (session?.user && mounted) {
          try {
            const user = await authService.getUserProfile(session.user.id, session.user.email || '');
            dispatch(setUser(user));
            router.replace('/(tabs)');
          } catch (error) {
            console.error('Error loading initial user profile:', error);
            dispatch(setUser(null));
            router.replace('/auth/login');
          }
        } else {
          dispatch(setUser(null));
        }
      } catch (error) {
        console.error('Error checking initial session:', error);
        dispatch(setUser(null));
      } finally {
        initialCheckDoneRef.current = true;
        isProcessingRef.current = false;
      }
    };

    // Check initial session
    checkInitialSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) {
        return;
      }

      // Skip SIGNED_IN events that happen during initial session check
      if (event === 'SIGNED_IN' && (!initialCheckDoneRef.current || isProcessingRef.current)) {
        return;
      }

      if (isProcessingRef.current) {
        return;
      }

      isProcessingRef.current = true;

      try {
        if (event === 'SIGNED_OUT') {
          dispatch(clearAuth());
          router.replace('/auth/login');
        } else if (session?.user && (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN')) {
          try {
            const user = await authService.getUserProfile(session.user.id, session.user.email || '');
            dispatch(setUser(user));
            router.replace('/(tabs)');
          } catch (error) {
            console.error('Error getting user profile on auth change:', error);
            dispatch(setUser(null));
            router.replace('/auth/login');
          }
        } else {
          dispatch(setUser(null));
          router.replace('/auth/login');
        }
      } catch (error) {
        console.error('Error handling auth state change:', error);
        dispatch(setUser(null));
        router.replace('/auth/login');
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
