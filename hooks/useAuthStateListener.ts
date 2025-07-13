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
      console.log('🔔 Auth state change detected:', {
        event,
        hasSession: !!session,
        sessionUserId: session?.user?.id,
        mounted,
        initialCheckDone: initialCheckDoneRef.current,
        isProcessing: isProcessingRef.current
      });
      
      if (!mounted) {
        console.log('⚠️ Component not mounted, ignoring auth state change');
        return;
      }

      // Skip SIGNED_IN events that happen during initial session check, but allow OAuth-triggered SIGNED_IN events
      if (event === 'SIGNED_IN' && !initialCheckDoneRef.current && isProcessingRef.current) {
        console.log('⚠️ Skipping SIGNED_IN event during initial session check');
        return;
      }

      if (isProcessingRef.current) {
        console.log('⚠️ Already processing auth state change, ignoring');
        return;
      }

      isProcessingRef.current = true;
      console.log('🔄 Processing auth state change:', event);

      try {
        if (event === 'SIGNED_OUT') {
          console.log('🚪 User signed out, clearing auth and redirecting to login');
          dispatch(clearAuth());
          router.replace('/auth/login');
        } else if (session?.user && (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN')) {
          console.log('👤 User session found, getting profile and redirecting to app');
          try {
            const user = await authService.getUserProfile(session.user.id, session.user.email || '');
            console.log('✅ User profile loaded successfully:', { userId: user.user_id, email: user.email });
            dispatch(setUser(user));
            console.log('🏠 Redirecting to home screen');
            router.replace('/(tabs)');
          } catch (error) {
            console.error('❌ Error getting user profile on auth change:', error);
            dispatch(setUser(null));
            router.replace('/auth/login');
          }
        } else {
          console.log('❌ No valid session found, redirecting to login');
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
