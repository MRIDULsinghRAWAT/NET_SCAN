import React from 'react';
import GraphBackground from './GraphBackground';

const Hero = () => {
  return (
    // 'bg-transparent' lagana sabse zaroori hai
    <div className="relative w-full min-h-screen flex flex-col items-center justify-center text-center px-6 overflow-hidden bg-transparent">
      
      {/* 1. Graph Background Component */}
      <GraphBackground />

      {/* 2. Content Layer (z-10 taaki text graph ke upar rahe) */}
      <div className="relative z-10 max-w-5xl">
        <h1 className="text-6xl md:text-9xl font-black text-white mb-6 tracking-tighter leading-none uppercase">
          NET_SCAN : <span className="text-gray-600">Graph Intelligent Attack Path Analyzer</span>
        </h1>
        
        <p className="text-xl text-gray-400 font-bold mb-12 tracking-[0.3em] uppercase">
          Mridul | Shiva | Akshat
        </p>

        <div className="flex flex-wrap justify-center gap-6">
          <button className="px-12 py-4 border border-white/20 rounded-full hover:bg-white hover:text-black transition-all font-black text-[10px] tracking-[0.3em]">
            INFORMATION
          </button>
          <button className="px-12 py-4 bg-white text-black rounded-full hover:bg-gray-200 transition-all font-black text-[10px] tracking-[0.3em] shadow-[0_0_50px_rgba(255,255,255,0.2)]">
            VULNERABILITY
          </button>
        </div>
      </div>
    </div>
  );
};

export default Hero;