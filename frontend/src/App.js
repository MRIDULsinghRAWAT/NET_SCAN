import React from 'react';
import Hero from './components/Hero';

function App() {
  return (
    /* 1. Yahan 'bg-transparent' ensure karega ki GraphBackground dikhe */
    <div className="min-h-screen text-white font-sans selection:bg-white selection:text-black flex flex-col justify-between overflow-x-hidden bg-transparent">
      
      {/* 2. Navigation Bar - Increased Font Size as requested */}
      <nav className="flex justify-between items-center px-12 py-8 border-b border-white/5 backdrop-blur-sm sticky top-0 z-50">
        <div className="font-black text-2xl tracking-tighter">
          NET_SCAN <span className="text-gray-600 text-xs ml-1 font-bold">PR</span>
        </div>
        
        {/* Menu items 14px font size set */}
        <div className="hidden md:flex space-x-12 text-[14px] font-bold tracking-[0.25em] text-gray-400">
          <span className="cursor-pointer hover:text-white transition-colors duration-300">HOME</span>
          <span className="cursor-pointer hover:text-white transition-colors duration-300">IP TRACKER</span>
          <span className="cursor-pointer hover:text-white transition-colors duration-300">ABOUT</span>
          <span className="cursor-pointer hover:text-white transition-colors duration-300">LEGAL</span>
          <span className="cursor-pointer hover:text-white transition-colors duration-300">CONTACT</span>
        </div>

        <button className="border border-white/20 px-7 py-2 rounded-full text-[10px] font-black tracking-widest hover:bg-white hover:text-black transition-all duration-500 ease-in-out">
          LOGIN <span className="ml-2 inline-block opacity-70">👤</span>
        </button>
      </nav>

      {/* 3. Hero Content Area (Main Content) */}
      <main className="flex-grow flex items-center justify-center py-20 relative">
        <Hero />
      </main>

      {/* 4. Footer - 2026 update as per current context */}
      <footer className="text-center text-gray-500 text-[10px] font-bold tracking-[0.2em] py-8 border-t border-white/5">
        &copy; 2026 NET_SCAN SECURITY ASSESSMENT TOOL. ALL RIGHTS RESERVED.
      </footer>
      
    </div>
  );
}

export default App;