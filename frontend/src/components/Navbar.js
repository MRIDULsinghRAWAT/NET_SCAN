import React from 'react';
import { Link } from 'react-router-dom';

const Navbar = () => {
  return (
    <nav className="flex justify-between items-center px-10 py-6 text-white sticky top-0 z-50"
         style={{
           background: 'rgba(2, 16, 36, 0.6)',
           backdropFilter: 'blur(20px) saturate(1.4)',
           WebkitBackdropFilter: 'blur(20px) saturate(1.4)',
           borderBottom: '1px solid rgba(84, 131, 179, 0.15)',
           boxShadow: '0 4px 30px rgba(2, 16, 36, 0.5)',
         }}>

      {/* Project Logo/Name */}
      <div className="text-2xl font-black tracking-tighter cursor-pointer gradient-text hover:drop-shadow-lg transition-all">
        <Link to="/">
          NET_SCAN <span className="font-medium text-sm ml-1" style={{color: '#5483B3'}}>PR</span>
        </Link>
      </div>

      {/* Navigation Links */}
      <div className="hidden md:flex gap-10 text-sm font-bold tracking-widest" style={{color: '#7DA0CA'}}>
        <Link to="/" className="hover:text-white transition-all duration-300 relative group">
          HOME
          <span className="absolute bottom-0 left-0 w-0 h-[2px] group-hover:w-full transition-all duration-300" style={{background: 'linear-gradient(90deg, #C1E8FF, #5483B3)'}}></span>
        </Link>
        <Link to="/scanner" className="hover:text-white transition-all duration-300 relative group">
          SCANNER
          <span className="absolute bottom-0 left-0 w-0 h-[2px] group-hover:w-full transition-all duration-300" style={{background: 'linear-gradient(90deg, #C1E8FF, #5483B3)'}}></span>
        </Link>
        <span className="cursor-pointer hover:text-white transition-all duration-300 relative group">
          ABOUT
          <span className="absolute bottom-0 left-0 w-0 h-[2px] group-hover:w-full transition-all duration-300" style={{background: 'linear-gradient(90deg, #C1E8FF, #5483B3)'}}></span>
        </span>
        <span className="cursor-pointer hover:text-white transition-all duration-300 relative group">
          LEGAL
          <span className="absolute bottom-0 left-0 w-0 h-[2px] group-hover:w-full transition-all duration-300" style={{background: 'linear-gradient(90deg, #C1E8FF, #5483B3)'}}></span>
        </span>
        <span className="cursor-pointer hover:text-white transition-all duration-300 relative group">
          CONTACT
          <span className="absolute bottom-0 left-0 w-0 h-[2px] group-hover:w-full transition-all duration-300" style={{background: 'linear-gradient(90deg, #C1E8FF, #5483B3)'}}></span>
        </span>
      </div>

      {/* Login Button */}
      <div>
        <button className="glass-btn flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold">
          LOGIN
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </button>
      </div>
    </nav>
  );
};

export default Navbar;