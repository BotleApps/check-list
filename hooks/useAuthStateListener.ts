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
        console.log('Initial session check already completed, skipping');
        return;
      }

      try {
        console.log('Checking initial session...');
        isProcessingRef.current = true; // Prevent auth state listener from interfering
        
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('Initial session check result:', session ? 'exists' : 'none', error);
        
        if (session?.user && mounted) {
          console.log('Initial session found for user:', session.user.id);
          try {
            console.log('Loading user profile for initial session...');
            const user = await authService.getUserProfile(session.user.id, session.user.email || '');
            console.log('User profile loaded successfully:', user.name);
            dispatch(setUser(user));
            console.log('User set in Redux, navigating to main app...');
            router.replace('/(tabs)');
            console.log('Navigation to /(tabs) completed');
          } catch (error) {
            console.error('Error loading initial user profile:', error);
            dispatch(setUser(null));
            router.replace('/auth/login');
          }
        } else {
          console.log('No initial session found, clearing user');
          dispatch(setUser(null));
        }
      } catch (error) {
        console.error('Error checking initial session:', error);
        dispatch(setUser(null));
      } finally {
        initialCheckDoneRef.current = true;
        isProcessingRef.current = false;
        console.log('Initial session check completed');
      }
    };

    // Check initial session
    checkInitialSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, 'Session exists:', !!session?.user, 'isProcessing:', isProcessingRef.current, 'initialCheckDone:', initialCheckDoneRef.current);
      
      if (!mounted) {
        console.log('Skipping auth state change - not mounted');
        return;
      }

      // Skip SIGNED_IN events that happen during initial session check
      if (event === 'SIGNED_IN' && (!initialCheckDoneRef.current || isProcessingRef.current)) {
        console.log('Skipping SIGNED_IN event - initial session check in progress');
        return;
      }

      if (isProcessingRef.current) {
        console.log('Skipping auth state change - already processing');
        return;
      }

      isProcessingRef.current = true;

      try {
        if (event === 'SIGNED_OUT') {
          console.log('User signed out, clearing auth and navigating to login');
          dispatch(clearAuth());
          router.replace('/auth/login');
        } else if (session?.user && (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN')) {
          console.log('Processing auth state change for user:', session.user.id, 'Event:', event);
          
          try {
            const user = await authService.getUserProfile(session.user.id, session.user.email || '');
            console.log('User profile retrieved, dispatching to store');
            dispatch(setUser(user));
            
            // For SIGNED_IN events (OAuth flow), navigate to main app
            if (event === 'SIGNED_IN') {
              console.log('SIGNED_IN event - navigating to main app');
              router.replace('/(tabs)');
            } else {
              console.log('Navigating to main app for event:', event);
              router.replace('/(tabs)');
            }
          } catch (error) {
            console.error('Error getting user profile on auth change:', error);
            dispatch(setUser(null));
            router.replace('/auth/login');
          }
        } else {
          console.log('No session, clearing auth and navigating to login');
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
