import React, { useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function AuthCallbackMobileWebScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    handleWebToMobileRedirect();
  }, []);

  const handleWebToMobileRedirect = async () => {
    try {
      console.log('🌐 Web-to-mobile OAuth callback received with params:', params);

      // Extract all URL parameters from the OAuth callback
      const urlParams = new URLSearchParams(window.location.hash.substring(1) || window.location.search.substring(1));
      
      // Get OAuth tokens and parameters
      const access_token = urlParams.get('access_token') || params.access_token as string;
      const refresh_token = urlParams.get('refresh_token') || params.refresh_token as string;
      const token_type = urlParams.get('token_type') || params.token_type as string;
      const expires_in = urlParams.get('expires_in') || params.expires_in as string;
      const error = urlParams.get('error') || params.error as string;
      const error_description = urlParams.get('error_description') || params.error_description as string;

      console.log('🔑 OAuth callback data:', {
        hasAccessToken: !!access_token,
        hasRefreshToken: !!refresh_token,
        tokenType: token_type,
        expiresIn: expires_in,
        hasError: !!error
      });

      if (error) {
        console.error('❌ OAuth error:', error, error_description);
        // Redirect to app with error
        const appUrl = `in.botle.checklistapp://auth/callback?error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(error_description || '')}`;
        window.location.href = appUrl;
        return;
      }

      if (access_token) {
        // Construct deep link URL with tokens to redirect back to the app
        const appUrl = `in.botle.checklistapp://auth/callback?access_token=${encodeURIComponent(access_token)}&refresh_token=${encodeURIComponent(refresh_token || '')}&token_type=${encodeURIComponent(token_type || 'bearer')}&expires_in=${encodeURIComponent(expires_in || '3600')}`;
        
        console.log('🔄 Redirecting to app with tokens...');
        
        // Close the browser and redirect to the app
        window.location.href = appUrl;
        
        // Also try to close the window if possible
        setTimeout(() => {
          try {
            window.close();
          } catch (e) {
            console.log('Cannot close window automatically');
          }
        }, 100);
        
        return;
      }

      // If no tokens and no error, something went wrong
      console.error('❌ No tokens or error received in OAuth callback');
      const appUrl = `in.botle.checklistapp://auth/callback?error=${encodeURIComponent('no_tokens')}&error_description=${encodeURIComponent('No authentication tokens received')}`;
      window.location.href = appUrl;

    } catch (error) {
      console.error('❌ Web-to-mobile redirect error:', error);
      const appUrl = `in.botle.checklistapp://auth/callback?error=${encodeURIComponent('redirect_error')}&error_description=${encodeURIComponent('Failed to process authentication callback')}`;
      window.location.href = appUrl;
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <h2 style={styles.title}>Completing authentication...</h2>
        <p style={styles.subtitle}>You will be redirected back to the app shortly.</p>
        <div style={styles.loader}></div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  content: {
    textAlign: 'center' as const,
    padding: '2rem',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    maxWidth: '400px',
    width: '100%',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '0.5rem',
  },
  subtitle: {
    fontSize: '1rem',
    color: '#6b7280',
    marginBottom: '2rem',
  },
  loader: {
    border: '3px solid #e5e7eb',
    borderTop: '3px solid #2563eb',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    animation: 'spin 1s linear infinite',
    margin: '0 auto',
  },
};

// Add CSS animation for the loader
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}
