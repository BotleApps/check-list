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

    console.log('🔄 Setting up auth state listener...');

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state change:', event, session?.user?.id?.substring(0, 8) + '...');
      
      if (!mounted || isProcessingRef.current) {
        console.log('⏭️ Skipping auth state change (not mounted or already processing)');
        return;
      }

      // Skip the SIGNED_IN event and only process INITIAL_SESSION to avoid the race condition
      if (event === 'SIGNED_IN') {
        console.log('⏭️ Skipping SIGNED_IN event, waiting for INITIAL_SESSION...');
        return;
      }

      isProcessingRef.current = true;

      try {
        if (event === 'SIGNED_OUT') {
          console.log('👋 User signed out');
          dispatch(clearAuth());
        } else if (session?.user && (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED')) {
          console.log('🔐 User session found, getting profile...');
          try {
            console.log('📞 Calling authService.getUserProfile...');
            const profileStart = Date.now();
            
            const user = await authService.getUserProfile(session.user.id, session.user.email || '');
            
            const profileTime = Date.now() - profileStart;
            console.log(`⏱️ Profile retrieval completed in ${profileTime}ms`);
            console.log('✅ User profile loaded successfully, dispatching to store:', { 
              name: user.name, 
              email: user.email, 
              user_id: user.user_id?.substring(0, 8) + '...',
              created_at: user.created_at 
            });
            dispatch(setUser(user));
            console.log('🎯 User profile dispatched to Redux store');
          } catch (error) {
            console.error('❌ Error getting user profile on auth change:', error);
            if (error instanceof Error) {
              console.error('❌ Error details:', { name: error.name, message: error.message });
            }
            // Don't completely fail - set user to null and let them retry
            dispatch(setUser(null));
          }
        } else {
          console.log('❌ No user in session');
          dispatch(setUser(null));
        }
      } catch (error) {
        console.error('💥 Error handling auth state change:', error);
        dispatch(setUser(null));
      } finally {
        isProcessingRef.current = false;
        console.log('🏁 Auth state change processing completed');
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [dispatch]);
};
