import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Hero from './components/Hero';
// 1. Ensure karo ki file path ekdum sahi hai
import ScannerDashboard from './components/ScannerDashboard'; 

function App() {
  return (
    <Router>
      <div className="min-h-screen text-white font-sans selection:bg-white selection:text-black flex flex-col justify-between overflow-x-hidden bg-transparent">
        
        {/* Navigation Bar */}
        <nav className="flex justify-between items-center px-12 py-8 border-b border-white/5 backdrop-blur-sm sticky top-0 z-50 bg-black/50">
          <div className="font-black text-2xl tracking-tighter cursor-pointer">
            <Link to="/">NET_SCAN <span className="text-gray-600 text-xs ml-1 font-bold">PR</span></Link>
          </div>
          
          <div className="hidden md:flex space-x-12 text-[14px] font-bold tracking-[0.25em] text-gray-400">
            <Link to="/" className="cursor-pointer hover:text-white transition-colors duration-300">HOME</Link>
            <Link to="/scanner" className="cursor-pointer hover:text-white transition-colors duration-300">SCANNER</Link>
            <span className="cursor-pointer hover:text-white transition-colors duration-300">ABOUT</span>
            <span className="cursor-pointer hover:text-white transition-colors duration-300">LEGAL</span>
            <span className="cursor-pointer hover:text-white transition-colors duration-300">CONTACT</span>
          </div>

          <button className="border border-white/20 px-7 py-2 rounded-full text-[10px] font-black tracking-widest hover:bg-white hover:text-black transition-all duration-500 ease-in-out">
            LOGIN <span className="ml-2 inline-block opacity-70">👤</span>
          </button>
        </nav>

        {/* 2. Routes for different modules */}
        <main className="flex-grow flex items-center justify-center relative">
          <Routes>
            <Route path="/" element={<Hero />} />
            {/* Yahan element={ScannerDashboard} invalid hota hai, element={<ScannerDashboard />} sahi hai */}
            <Route path="/scanner" element={<ScannerDashboard />} />
          </Routes>
        </main>

        {/* Footer */}
        <footer className="text-center text-gray-500 text-[10px] font-bold tracking-[0.2em] py-8 border-t border-white/5 bg-black">
          &copy; 2026 NET_SCAN SECURITY ASSESSMENT TOOL. ALL RIGHTS RESERVED.
        </footer>
        
      </div>
    </Router>
  );
}

export default App;