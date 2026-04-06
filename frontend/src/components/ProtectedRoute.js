import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// ─── Loading Spinner ─────────────────────────────────────────
const LoadingScreen = () => (
  <div style={{
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '20px'
  }}>
    <div style={{
      width: '48px',
      height: '48px',
      border: '3px solid rgba(84, 131, 179, 0.15)',
      borderTopColor: '#5483B3',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite'
    }}/>
    <p style={{ color: '#7DA0CA', fontSize: '0.85rem', fontWeight: 500, letterSpacing: '0.1em' }}>
      AUTHENTICATING...
    </p>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
