import React from 'react';

const Navbar = () => {
  return (
    <nav className="flex justify-between items-center px-10 py-6 bg-black text-white border-b border-gray-900">
      {/* Project Logo/Name */}
      <div className="text-2xl font-black tracking-tighter">
        NET_SCAN <span className="text-gray-500 font-medium text-sm ml-1">PR</span>
      </div>

      {/* Navigation Links - Bada aur Bold Font */}
      <div className="hidden md:flex gap-10 text-sm font-bold tracking-widest text-gray-400">
        <a href="#" className="hover:text-white transition-colors">HOME</a>
        <a href="#" className="hover:text-white transition-colors">IP TRACKER</a>
        <a href="#" className="hover:text-white transition-colors">ABOUT</a>
        <a href="#" className="hover:text-white transition-colors">LEGAL</a>
        <a href="#" className="hover:text-white transition-colors">CONTACT</a>
      </div>

      {/* Login Button with User Icon */}
      <div>
        <button className="flex items-center gap-2 px-5 py-2 border border-gray-700 rounded-full text-xs font-bold hover:bg-white hover:text-black transition-all">
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