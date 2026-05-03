import React, { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

function LoginModal({ isOpen, onClose }) {
  const { gsiReady } = useAuth();
  const googleBtnRef = useRef(null);

  useEffect(() => {
    if (isOpen && gsiReady && googleBtnRef.current) {
      // Render the official Google button inside our modal
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'filled_black',
        size: 'large',
        shape: 'pill',
        text: 'signin_with',
        width: 300,
      });
    }
  }, [isOpen, gsiReady]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center"
      style={{ background: 'rgba(2, 16, 36, 0.75)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md mx-4 rounded-3xl p-10 animate-fadeIn"
        style={{
          background: 'linear-gradient(145deg, rgba(5,38,89,0.6) 0%, rgba(3,27,53,0.8) 100%)',
          backdropFilter: 'blur(30px)',
          border: '1px solid rgba(84, 131, 179, 0.25)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(193,232,255,0.08)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full transition-all duration-300 hover:rotate-90"
          style={{
            background: 'rgba(84, 131, 179, 0.15)',
            border: '1px solid rgba(84, 131, 179, 0.2)',
            color: '#7DA0CA',
          }}
        >
          ✕
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 mx-auto mb-5 rounded-2xl flex items-center justify-center text-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(84,131,179,0.3), rgba(193,232,255,0.1))',
              border: '1px solid rgba(84, 131, 179, 0.3)',
              boxShadow: '0 8px 24px rgba(84, 131, 179, 0.15)',
            }}
          >
            🔐
          </div>
          <h2
            className="text-2xl font-bold tracking-tight mb-2"
            style={{
              background: 'linear-gradient(135deg, #C1E8FF, #5483B3)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Welcome to NET_SCAN
          </h2>
          <p className="text-sm" style={{ color: '#7DA0CA' }}>
            Sign in with your Google account to continue
          </p>
        </div>

        {/* Google Sign-In Button */}
        <div className="flex justify-center mb-6">
          <div ref={googleBtnRef}></div>
        </div>

        {/* Fallback if GSI not ready */}
        {!gsiReady && (
          <div className="text-center">
            <div
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm"
              style={{ color: '#7DA0CA', background: 'rgba(84,131,179,0.1)' }}
            >
              <span className="animate-spin text-base">⏳</span>
              Loading Google Sign-In...
            </div>
          </div>
        )}

        {/* Divider */}
        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px" style={{ background: 'rgba(84, 131, 179, 0.15)' }}></div>
          <span className="text-[10px] tracking-[0.2em] font-semibold uppercase" style={{ color: '#5483B3' }}>
            Secured Access
          </span>
          <div className="flex-1 h-px" style={{ background: 'rgba(84, 131, 179, 0.15)' }}></div>
        </div>

        {/* Info */}
        <p className="text-center text-xs leading-relaxed" style={{ color: 'rgba(125, 160, 202, 0.6)' }}>
          By signing in you agree to access the NET_SCAN platform.
          <br />
          We only store your display name, email and profile picture.
        </p>
      </div>

      {/* Inline animation keyframes */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-fadeIn { animation: fadeIn 0.35s ease-out forwards; }
      `}</style>
    </div>
  );
}

export default LoginModal;
