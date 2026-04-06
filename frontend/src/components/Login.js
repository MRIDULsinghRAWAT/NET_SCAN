import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  auth,
  googleProvider,
  githubProvider,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInWithPopup
} from '../firebase';
import { useAuth } from '../context/AuthContext';

// ─── SVG Icons ───────────────────────────────────────────────
const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
    <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
    <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
    <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
  </svg>
);

const GithubIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
  </svg>
);

const PhoneIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
    <line x1="12" y1="18" x2="12.01" y2="18"/>
  </svg>
);

const ShieldIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="url(#shieldGrad)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <defs>
      <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#C1E8FF"/>
        <stop offset="100%" stopColor="#5483B3"/>
      </linearGradient>
    </defs>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);

const LockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5483B3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

// ─── Floating Particles Component ────────────────────────────
const FloatingParticles = () => {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    size: Math.random() * 3 + 1,
    x: Math.random() * 100,
    y: Math.random() * 100,
    duration: Math.random() * 15 + 10,
    delay: Math.random() * 5
  }));

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {particles.map(p => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            width: `${p.size}px`,
            height: `${p.size}px`,
            left: `${p.x}%`,
            top: `${p.y}%`,
            borderRadius: '50%',
            background: 'rgba(193, 232, 255, 0.15)',
            animation: `floatParticle ${p.duration}s ease-in-out ${p.delay}s infinite`,
            boxShadow: '0 0 6px rgba(84, 131, 179, 0.3)'
          }}
        />
      ))}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
//  LOGIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function Login() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Auth states
  const [authMode, setAuthMode] = useState('main'); // main | phone | otp
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmResult, setConfirmResult] = useState(null);
  const [otpSent, setOtpSent] = useState(false);
  const [timer, setTimer] = useState(0);

  const otpRefs = useRef([]);
  const recaptchaRef = useRef(null);

  // Redirect if already logged in
  useEffect(() => {
    if (user) navigate('/');
  }, [user, navigate]);

  // OTP Resend Timer
  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer(t => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  // ─── Google Sign-In ────────────────────────────────────────
  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      navigate('/');
    } catch (err) {
      console.error('Google login error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in popup was closed');
      } else if (err.code === 'auth/api-key-not-valid.-please-pass-a-valid-api-key.') {
        setError('Firebase not configured. Add your API keys to .env');
      } else {
        setError(err.message || 'Google sign-in failed');
      }
    } finally {
      setLoading(false);
    }
  };

  // ─── GitHub Sign-In ────────────────────────────────────────
  const handleGithubLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithPopup(auth, githubProvider);
      navigate('/');
    } catch (err) {
      console.error('GitHub login error:', err);
      if (err.code === 'auth/account-exists-with-different-credential') {
        setError('Account exists with different provider. Try Google instead.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in popup was closed');
      } else {
        setError(err.message || 'GitHub sign-in failed');
      }
    } finally {
      setLoading(false);
    }
  };

  // ─── Phone OTP: Send Code ─────────────────────────────────
  const handleSendOTP = async () => {
    setError('');
    const fullNumber = `${countryCode}${phoneNumber.replace(/\s/g, '')}`;

    if (phoneNumber.length < 10) {
      setError('Enter a valid phone number');
      return;
    }

    setLoading(true);
    try {
      // Setup recaptcha
      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
          callback: () => {}
        });
      }

      const result = await signInWithPhoneNumber(auth, fullNumber, window.recaptchaVerifier);
      setConfirmResult(result);
      setOtpSent(true);
      setAuthMode('otp');
      setTimer(30);
    } catch (err) {
      console.error('OTP send error:', err);
      if (err.code === 'auth/invalid-phone-number') {
        setError('Invalid phone number format');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many requests. Try again later.');
      } else {
        setError(err.message || 'Failed to send OTP');
      }
      // Reset recaptcha on error
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    } finally {
      setLoading(false);
    }
  };

  // ─── Phone OTP: Verify Code ────────────────────────────────
  const handleVerifyOTP = async () => {
    setError('');
    const otp = otpDigits.join('');

    if (otp.length !== 6) {
      setError('Enter all 6 digits');
      return;
    }

    setLoading(true);
    try {
      await confirmResult.confirm(otp);
      navigate('/');
    } catch (err) {
      console.error('OTP verify error:', err);
      if (err.code === 'auth/invalid-verification-code') {
        setError('Invalid OTP. Please try again.');
      } else {
        setError(err.message || 'OTP verification failed');
      }
      setOtpDigits(['', '', '', '', '', '']);
    } finally {
      setLoading(false);
    }
  };

  // ─── OTP Input Handler ────────────────────────────────────
  const handleOtpChange = (index, value) => {
    if (value.length > 1) value = value[value.length - 1];
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...otpDigits];
    newDigits[index] = value;
    setOtpDigits(newDigits);

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
    if (e.key === 'Enter' && otpDigits.every(d => d)) {
      handleVerifyOTP();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newDigits = [...otpDigits];
    for (let i = 0; i < pasteData.length; i++) {
      newDigits[i] = pasteData[i];
    }
    setOtpDigits(newDigits);
    if (pasteData.length === 6) {
      otpRefs.current[5]?.focus();
    }
  };

  // ═══════════════════════════════════════════════════════════════
  //  STYLES
  // ═══════════════════════════════════════════════════════════════
  const styles = {
    container: {
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      position: 'relative',
    },
    card: {
      width: '100%',
      maxWidth: '440px',
      background: 'rgba(2, 16, 36, 0.6)',
      backdropFilter: 'blur(24px) saturate(1.5)',
      WebkitBackdropFilter: 'blur(24px) saturate(1.5)',
      border: '1px solid rgba(84, 131, 179, 0.2)',
      borderRadius: '24px',
      padding: '48px 40px',
      boxShadow: '0 24px 80px rgba(2, 16, 36, 0.8), 0 0 60px rgba(84, 131, 179, 0.08), inset 0 1px 0 rgba(193, 232, 255, 0.06)',
      position: 'relative',
      overflow: 'hidden',
      zIndex: 10,
    },
    cardGlow: {
      position: 'absolute',
      top: '-50%',
      left: '-50%',
      width: '200%',
      height: '200%',
      background: 'radial-gradient(circle at 50% 120%, rgba(84, 131, 179, 0.08) 0%, transparent 50%)',
      pointerEvents: 'none',
    },
    logoContainer: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
      marginBottom: '8px',
    },
    title: {
      fontSize: '1.6rem',
      fontWeight: 800,
      background: 'linear-gradient(135deg, #C1E8FF 0%, #7DA0CA 50%, #5483B3 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      letterSpacing: '-0.03em',
      margin: 0,
    },
    subtitle: {
      textAlign: 'center',
      color: '#7DA0CA',
      fontSize: '0.85rem',
      marginBottom: '32px',
      marginTop: '8px',
      fontWeight: 400,
      lineHeight: 1.5
    },
    divider: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      margin: '24px 0',
    },
    dividerLine: {
      flex: 1,
      height: '1px',
      background: 'linear-gradient(90deg, transparent, rgba(84, 131, 179, 0.3), transparent)',
    },
    dividerText: {
      color: '#5483B3',
      fontSize: '0.7rem',
      fontWeight: 700,
      letterSpacing: '0.2em',
      textTransform: 'uppercase',
    },
    socialBtn: {
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
      padding: '14px 20px',
      borderRadius: '14px',
      border: '1px solid rgba(84, 131, 179, 0.2)',
      cursor: 'pointer',
      fontSize: '0.88rem',
      fontWeight: 600,
      letterSpacing: '0.02em',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      position: 'relative',
      overflow: 'hidden',
    },
    googleBtn: {
      background: 'rgba(255, 255, 255, 0.04)',
      color: '#C1E8FF',
    },
    githubBtn: {
      background: 'rgba(255, 255, 255, 0.04)',
      color: '#C1E8FF',
    },
    phoneBtn: {
      background: 'linear-gradient(135deg, rgba(5, 38, 89, 0.5) 0%, rgba(84, 131, 179, 0.2) 100%)',
      color: '#C1E8FF',
      border: '1px solid rgba(125, 160, 202, 0.3)',
    },
    phoneInput: {
      width: '100%',
      display: 'flex',
      gap: '10px',
      marginBottom: '16px',
    },
    countrySelect: {
      width: '90px',
      padding: '14px 8px',
      borderRadius: '12px',
      background: 'rgba(2, 16, 36, 0.6)',
      border: '1px solid rgba(84, 131, 179, 0.2)',
      color: '#C1E8FF',
      fontSize: '0.9rem',
      fontWeight: 600,
      outline: 'none',
      cursor: 'pointer',
    },
    phoneField: {
      flex: 1,
      padding: '14px 16px',
      borderRadius: '12px',
      background: 'rgba(2, 16, 36, 0.5)',
      border: '1px solid rgba(84, 131, 179, 0.2)',
      color: '#C1E8FF',
      fontSize: '1rem',
      fontWeight: 500,
      outline: 'none',
      letterSpacing: '0.05em',
    },
    otpContainer: {
      display: 'flex',
      justifyContent: 'center',
      gap: '10px',
      marginBottom: '20px',
    },
    otpInput: {
      width: '48px',
      height: '56px',
      textAlign: 'center',
      fontSize: '1.3rem',
      fontWeight: 700,
      borderRadius: '12px',
      background: 'rgba(2, 16, 36, 0.6)',
      border: '1.5px solid rgba(84, 131, 179, 0.25)',
      color: '#C1E8FF',
      outline: 'none',
      transition: 'all 0.3s ease',
      caretColor: '#5483B3',
    },
    submitBtn: {
      width: '100%',
      padding: '15px',
      borderRadius: '14px',
      background: 'linear-gradient(135deg, rgba(5, 38, 89, 0.6) 0%, rgba(84, 131, 179, 0.35) 100%)',
      border: '1.5px solid rgba(125, 160, 202, 0.4)',
      color: '#C1E8FF',
      fontSize: '0.9rem',
      fontWeight: 700,
      letterSpacing: '0.1em',
      cursor: 'pointer',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      textTransform: 'uppercase',
    },
    errorBox: {
      background: 'rgba(255, 59, 48, 0.1)',
      border: '1px solid rgba(255, 59, 48, 0.3)',
      borderRadius: '12px',
      padding: '12px 16px',
      marginBottom: '16px',
      color: '#FF6B6B',
      fontSize: '0.8rem',
      fontWeight: 500,
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    backBtn: {
      background: 'none',
      border: 'none',
      color: '#5483B3',
      cursor: 'pointer',
      fontSize: '0.8rem',
      fontWeight: 600,
      padding: '8px 0',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      transition: 'color 0.3s',
      letterSpacing: '0.05em',
    },
    timerText: {
      textAlign: 'center',
      color: '#5483B3',
      fontSize: '0.78rem',
      marginTop: '12px',
      fontWeight: 500,
    },
    securityBadge: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '6px',
      marginTop: '24px',
      color: 'rgba(125, 160, 202, 0.5)',
      fontSize: '0.7rem',
      fontWeight: 500,
      letterSpacing: '0.05em',
    },
  };

  // ═══════════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <div style={styles.container}>
      <FloatingParticles />

      {/* Recaptcha container (invisible) */}
      <div id="recaptcha-container" ref={recaptchaRef}></div>

      <div style={styles.card}>
        <div style={styles.cardGlow} />

        {/* Logo */}
        <div style={styles.logoContainer}>
          <ShieldIcon />
          <h2 style={styles.title}>NET_SCAN</h2>
        </div>

        {/* ── MAIN AUTH VIEW ───────────────────────────────────── */}
        {authMode === 'main' && (
          <>
            <p style={styles.subtitle}>
              Access the full power of network intelligence.<br />
              Sign in to continue.
            </p>

            {error && (
              <div style={styles.errorBox}>
                <span>&#9888;</span> {error}
              </div>
            )}

            {/* Google Button */}
            <button
              id="login-google-btn"
              style={{ ...styles.socialBtn, ...styles.googleBtn, marginBottom: '12px' }}
              onClick={handleGoogleLogin}
              disabled={loading}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                e.currentTarget.style.borderColor = 'rgba(125, 160, 202, 0.4)';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 30px rgba(84, 131, 179, 0.15)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                e.currentTarget.style.borderColor = 'rgba(84, 131, 179, 0.2)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <GoogleIcon />
              Continue with Google
            </button>

            {/* GitHub Button */}
            <button
              id="login-github-btn"
              style={{ ...styles.socialBtn, ...styles.githubBtn }}
              onClick={handleGithubLogin}
              disabled={loading}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                e.currentTarget.style.borderColor = 'rgba(125, 160, 202, 0.4)';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 30px rgba(84, 131, 179, 0.15)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                e.currentTarget.style.borderColor = 'rgba(84, 131, 179, 0.2)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <GithubIcon />
              Continue with GitHub
            </button>

            {/* Divider */}
            <div style={styles.divider}>
              <div style={styles.dividerLine} />
              <span style={styles.dividerText}>or use phone</span>
              <div style={styles.dividerLine} />
            </div>

            {/* Phone Button */}
            <button
              id="login-phone-btn"
              style={{ ...styles.socialBtn, ...styles.phoneBtn }}
              onClick={() => { setAuthMode('phone'); setError(''); }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 30px rgba(84, 131, 179, 0.2), 0 0 20px rgba(84, 131, 179, 0.1)';
                e.currentTarget.style.borderColor = 'rgba(193, 232, 255, 0.4)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = 'rgba(125, 160, 202, 0.3)';
              }}
            >
              <PhoneIcon />
              Sign in with Phone Number
            </button>

            <div style={styles.securityBadge}>
              <LockIcon />
              <span>256-bit encrypted &bull; Powered by Firebase Auth</span>
            </div>
          </>
        )}

        {/* ── PHONE INPUT VIEW ─────────────────────────────────── */}
        {authMode === 'phone' && (
          <>
            <p style={styles.subtitle}>
              Enter your mobile number to receive a<br />
              one-time verification code via SMS.
            </p>

            {error && (
              <div style={styles.errorBox}>
                <span>&#9888;</span> {error}
              </div>
            )}

            <div style={styles.phoneInput}>
              <select
                id="country-code-select"
                style={styles.countrySelect}
                value={countryCode}
                onChange={e => setCountryCode(e.target.value)}
              >
                <option value="+91">+91</option>
                <option value="+1">+1</option>
                <option value="+44">+44</option>
                <option value="+61">+61</option>
                <option value="+81">+81</option>
                <option value="+86">+86</option>
                <option value="+971">+971</option>
              </select>
              <input
                id="phone-number-input"
                type="tel"
                placeholder="Enter phone number"
                style={styles.phoneField}
                value={phoneNumber}
                onChange={e => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                onKeyDown={e => e.key === 'Enter' && handleSendOTP()}
                autoFocus
              />
            </div>

            <button
              id="send-otp-btn"
              style={{
                ...styles.submitBtn,
                opacity: loading ? 0.6 : 1,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
              onClick={handleSendOTP}
              disabled={loading}
              onMouseEnter={e => {
                if (!loading) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 40px rgba(84, 131, 179, 0.25), 0 0 20px rgba(84, 131, 179, 0.15)';
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <span style={{
                    width: '16px', height: '16px', border: '2px solid rgba(193,232,255,0.3)',
                    borderTopColor: '#C1E8FF', borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite', display: 'inline-block',
                  }}/>
                  Sending OTP...
                </span>
              ) : 'Send OTP'}
            </button>

            <button
              style={styles.backBtn}
              onClick={() => { setAuthMode('main'); setError(''); setPhoneNumber(''); }}
              onMouseEnter={e => e.currentTarget.style.color = '#C1E8FF'}
              onMouseLeave={e => e.currentTarget.style.color = '#5483B3'}
            >
              &#8592; Back to login options
            </button>
          </>
        )}

        {/* ── OTP VERIFICATION VIEW ────────────────────────────── */}
        {authMode === 'otp' && (
          <>
            <p style={styles.subtitle}>
              We sent a 6-digit code to<br />
              <span style={{ color: '#C1E8FF', fontWeight: 600 }}>
                {countryCode} {phoneNumber}
              </span>
            </p>

            {error && (
              <div style={styles.errorBox}>
                <span>&#9888;</span> {error}
              </div>
            )}

            {/* OTP Boxes */}
            <div style={styles.otpContainer} onPaste={handleOtpPaste}>
              {otpDigits.map((digit, i) => (
                <input
                  key={i}
                  id={`otp-input-${i}`}
                  ref={el => otpRefs.current[i] = el}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleOtpChange(i, e.target.value)}
                  onKeyDown={e => handleOtpKeyDown(i, e)}
                  onFocus={e => e.target.style.borderColor = 'rgba(193, 232, 255, 0.5)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(84, 131, 179, 0.25)'}
                  style={{
                    ...styles.otpInput,
                    borderColor: digit ? 'rgba(84, 131, 179, 0.5)' : 'rgba(84, 131, 179, 0.25)',
                    boxShadow: digit ? '0 0 12px rgba(84, 131, 179, 0.15)' : 'none'
                  }}
                  autoFocus={i === 0}
                />
              ))}
            </div>

            <button
              id="verify-otp-btn"
              style={{
                ...styles.submitBtn,
                opacity: loading ? 0.6 : 1,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
              onClick={handleVerifyOTP}
              disabled={loading}
              onMouseEnter={e => {
                if (!loading) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 40px rgba(84, 131, 179, 0.25), 0 0 20px rgba(84, 131, 179, 0.15)';
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <span style={{
                    width: '16px', height: '16px', border: '2px solid rgba(193,232,255,0.3)',
                    borderTopColor: '#C1E8FF', borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite', display: 'inline-block',
                  }}/>
                  Verifying...
                </span>
              ) : 'Verify OTP'}
            </button>

            {/* Resend */}
            <div style={styles.timerText}>
              {timer > 0 ? (
                <span>Resend OTP in <span style={{ color: '#C1E8FF', fontWeight: 700 }}>{timer}s</span></span>
              ) : (
                <button
                  id="resend-otp-btn"
                  style={{ ...styles.backBtn, justifyContent: 'center', width: '100%' }}
                  onClick={() => {
                    setAuthMode('phone');
                    setOtpDigits(['', '', '', '', '', '']);
                    setError('');
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = '#C1E8FF'}
                  onMouseLeave={e => e.currentTarget.style.color = '#5483B3'}
                >
                  Resend OTP
                </button>
              )}
            </div>

            <button
              style={styles.backBtn}
              onClick={() => { setAuthMode('phone'); setError(''); setOtpDigits(['', '', '', '', '', '']); }}
              onMouseEnter={e => e.currentTarget.style.color = '#C1E8FF'}
              onMouseLeave={e => e.currentTarget.style.color = '#5483B3'}
            >
              &#8592; Change number
            </button>
          </>
        )}
      </div>

      {/* CSS Keyframes */}
      <style>{`
        @keyframes floatParticle {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.15; }
          25% { transform: translateY(-30px) translateX(10px); opacity: 0.3; }
          50% { transform: translateY(-15px) translateX(-15px); opacity: 0.15; }
          75% { transform: translateY(-40px) translateX(5px); opacity: 0.25; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        input[type="tel"]::placeholder {
          color: rgba(125, 160, 202, 0.4);
        }
        select option {
          background: #021024;
          color: #C1E8FF;
        }
      `}</style>
    </div>
  );
}
