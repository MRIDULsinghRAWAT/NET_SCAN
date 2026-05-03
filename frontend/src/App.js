import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Hero from './components/Hero';
import ScannerDashboard from './components/ScannerDashboard';
import About from './components/About';
import Contact from './components/Contact';
import LoginModal from './components/LoginModal';
import { AuthProvider, useAuth } from './context/AuthContext';

/* ─── User Avatar / Login Button ─── */
function NavAuth({ onLoginClick }) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!user) {
    return (
      <button className="glass-btn px-7 py-2 rounded-full text-[10px] uppercase" onClick={onLoginClick}>
        LOGIN <span className="ml-2 inline-block opacity-70">👤</span>
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="flex items-center gap-3 rounded-full py-1.5 pl-1.5 pr-5 transition-all duration-300 hover:scale-[1.03]"
        style={{
          background: 'rgba(84, 131, 179, 0.15)',
          border: '1px solid rgba(84, 131, 179, 0.25)',
        }}
      >
        <img
          src={user.picture}
          alt={user.name}
          className="w-8 h-8 rounded-full object-cover"
          style={{ border: '2px solid rgba(84, 131, 179, 0.4)' }}
          referrerPolicy="no-referrer"
        />
        <span className="text-[11px] font-bold tracking-wide text-white truncate max-w-[120px]">
          {user.name.split(' ')[0]}
        </span>
      </button>

      {/* Dropdown */}
      {menuOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-64 rounded-2xl p-5 z-[100]"
          style={{
            background: 'rgba(3, 27, 53, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(84, 131, 179, 0.2)',
            boxShadow: '0 15px 40px rgba(0,0,0,0.5)',
          }}
        >
          <div className="flex items-center gap-3 mb-4 pb-4" style={{ borderBottom: '1px solid rgba(84,131,179,0.15)' }}>
            <img
              src={user.picture}
              alt={user.name}
              className="w-10 h-10 rounded-full object-cover"
              style={{ border: '2px solid rgba(84,131,179,0.3)' }}
              referrerPolicy="no-referrer"
            />
            <div className="overflow-hidden">
              <div className="text-sm font-bold text-white truncate">{user.name}</div>
              <div className="text-[11px] truncate" style={{ color: '#7DA0CA' }}>{user.email}</div>
            </div>
          </div>
          <button
            onClick={() => { logout(); setMenuOpen(false); }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold tracking-wider uppercase transition-all duration-300 hover:scale-[1.02]"
            style={{
              background: 'rgba(255, 80, 80, 0.12)',
              border: '1px solid rgba(255, 80, 80, 0.2)',
              color: '#ff6b6b',
            }}
          >
            <span>⏻</span> Sign Out
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Main App ─── */
function AppContent() {
  const [loginOpen, setLoginOpen] = useState(false);
  const { user } = useAuth();

  return (
    <>
      <div className="min-h-screen text-white font-sans flex flex-col justify-between overflow-x-hidden relative" style={{background: '#021024'}}>
        {/* Deep Blue Flowing Background Effects */}
        <div className="fixed inset-0 -z-10 pointer-events-none" style={{background: 'linear-gradient(135deg, #021024 0%, #031B35 30%, #052659 60%, #021024 100%)'}}>
          <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] rounded-full blur-[120px] opacity-30 animate-pulse" style={{background: 'radial-gradient(circle, rgba(84,131,179,0.4) 0%, transparent 70%)'}}></div>
          <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] rounded-full blur-[100px] opacity-20 animate-pulse" style={{background: 'radial-gradient(circle, rgba(5,38,89,0.6) 0%, transparent 70%)', animationDelay: '1.5s'}}></div>
          <div className="absolute top-1/2 right-1/3 w-[350px] h-[350px] rounded-full blur-[100px] opacity-15 animate-pulse" style={{background: 'radial-gradient(circle, rgba(125,160,202,0.3) 0%, transparent 70%)', animationDelay: '3s'}}></div>
          <div className="absolute top-[10%] left-[10%] w-[300px] h-[300px] rounded-full blur-[80px] opacity-10 animate-pulse" style={{background: 'radial-gradient(circle, rgba(193,232,255,0.15) 0%, transparent 70%)', animationDelay: '4.5s'}}></div>
        </div>

        {/* Navigation Bar — Glass */}
        <nav className="flex justify-between items-center px-12 py-6 sticky top-0 z-50" 
             style={{
               background: 'rgba(2, 16, 36, 0.6)',
               backdropFilter: 'blur(20px) saturate(1.4)',
               WebkitBackdropFilter: 'blur(20px) saturate(1.4)',
               borderBottom: '1px solid rgba(84, 131, 179, 0.15)',
               boxShadow: '0 4px 30px rgba(2, 16, 36, 0.5)'
             }}>
          <div className="font-black text-2xl tracking-tighter cursor-pointer">
            <Link to="/" className="gradient-text">NET_SCAN <span className="text-xs ml-1 font-bold" style={{color: '#5483B3'}}>PR</span></Link>
          </div>

          <div className="hidden md:flex space-x-12 text-[13px] font-bold tracking-[0.25em]" style={{color: '#7DA0CA'}}>
            <Link to="/" className="cursor-pointer transition-all duration-300 hover:text-white relative group">
              HOME
              <span className="absolute -bottom-1 left-0 w-0 h-[2px] group-hover:w-full transition-all duration-300" style={{background: 'linear-gradient(90deg, #C1E8FF, #5483B3)'}}></span>
            </Link>
            <Link to="/scanner" className="cursor-pointer transition-all duration-300 hover:text-white relative group">
              SCANNER
              <span className="absolute -bottom-1 left-0 w-0 h-[2px] group-hover:w-full transition-all duration-300" style={{background: 'linear-gradient(90deg, #C1E8FF, #5483B3)'}}></span>
            </Link>
            <Link to="/about" className="cursor-pointer transition-all duration-300 hover:text-white relative group">
              ABOUT
              <span className="absolute -bottom-1 left-0 w-0 h-[2px] group-hover:w-full transition-all duration-300" style={{background: 'linear-gradient(90deg, #C1E8FF, #5483B3)'}}></span>
            </Link>
            <Link to="/contact" className="cursor-pointer transition-all duration-300 hover:text-white relative group">
              CONTACT
              <span className="absolute -bottom-1 left-0 w-0 h-[2px] group-hover:w-full transition-all duration-300" style={{background: 'linear-gradient(90deg, #C1E8FF, #5483B3)'}}></span>
            </Link>
          </div>

          <NavAuth onLoginClick={() => setLoginOpen(true)} />
        </nav>

        {/* Routes */}
        <main className="flex-grow flex items-center justify-center relative z-10">
          <Routes>
            <Route path="/" element={<Hero />} />
            <Route path="/scanner" element={<ScannerDashboard />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
          </Routes>
        </main>
      </div>

      {/* Login Modal (rendered outside main flow for z-index) */}
      <LoginModal isOpen={loginOpen && !user} onClose={() => setLoginOpen(false)} />
    </>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;