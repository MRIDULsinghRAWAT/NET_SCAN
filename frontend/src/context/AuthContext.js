import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

//   Replace this with your own Google OAuth Client ID
// Get one at: https://console.cloud.google.com/apis/credentials
const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';

/**
 * Decodes a JWT ID token payload (without verification — we trust Google's
 * client-side library to have already validated it).
 */
function decodeJwtPayload(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('netscan_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [gsiReady, setGsiReady] = useState(false);

  // Called by Google after successful sign-in
  const handleCredentialResponse = useCallback((response) => {
    const payload = decodeJwtPayload(response.credential);
    if (payload) {
      const userData = {
        name: payload.name,
        email: payload.email,
        picture: payload.picture,
        sub: payload.sub,
      };
      setUser(userData);
      localStorage.setItem('netscan_user', JSON.stringify(userData));
    }
  }, []);

  // Initialize Google Identity Services once the script loads
  useEffect(() => {
    const initGoogle = () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleCredentialResponse,
          auto_select: false,
        });
        setGsiReady(true);
      }
    };

    // If script already loaded
    if (window.google?.accounts?.id) {
      initGoogle();
      return;
    }

    // Otherwise wait for it
    const interval = setInterval(() => {
      if (window.google?.accounts?.id) {
        initGoogle();
        clearInterval(interval);
      }
    }, 200);

    return () => clearInterval(interval);
  }, [handleCredentialResponse]);

  const promptLogin = useCallback(() => {
    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('netscan_user');
    if (window.google?.accounts?.id) {
      window.google.accounts.id.disableAutoSelect();
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, gsiReady, promptLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
