import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Hero from './components/Hero';
import ScannerDashboard from './components/ScannerDashboard';
import About from './components/About';
import Contact from './components/Contact';

/* ─── Main App ─── */
function AppContent() {

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
            <Link to="/" className="gradient-text">NET_SCAN</Link>
          </div>

          <div className="flex space-x-12 text-[13px] font-bold tracking-[0.25em]" style={{color: '#7DA0CA'}}>
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

          <div></div>

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


    </>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;