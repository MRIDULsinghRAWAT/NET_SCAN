import React from 'react';
import { Link } from 'react-router-dom'; // Routing ke liye zaroori hai

const Navbar = () => {
  return (
    <nav className="flex justify-between items-center px-10 py-6 bg-black text-white border-b border-gray-900 sticky top-0 z-50 backdrop-blur-md bg-black/80">
      
      {/* Project Logo/Name - Logo par click karke home jane ke liye */}
      <div className="text-2xl font-black tracking-tighter cursor-pointer">
        <Link to="/">
          NET_SCAN <span className="text-gray-500 font-medium text-sm ml-1">PR</span>
        </Link>
      </div>

      {/* Navigation Links - Bada aur Bold Font */}
      <div className="hidden md:flex gap-10 text-sm font-bold tracking-widest text-gray-400">
        <Link to="/" className="hover:text-white transition-colors duration-300">HOME</Link>
        
        {/* IP TRACKER ab Scanner module par le jayega */}
        <Link to="/scanner" className="hover:text-white transition-colors duration-300">SCANNER</Link>
        
        <span className="cursor-pointer hover:text-white transition-colors duration-300">ABOUT</span>
        <span className="cursor-pointer hover:text-white transition-colors duration-300">LEGAL</span>
        <span className="cursor-pointer hover:text-white transition-colors duration-300">CONTACT</span>
      </div>

      {/* Login Button with User Icon */}
      <div>
        <button className="flex items-center gap-2 px-5 py-2 border border-gray-700 rounded-full text-xs font-bold hover:bg-white hover:text-black transition-all duration-300">
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