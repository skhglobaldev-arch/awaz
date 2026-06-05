import React from 'react';
import { motion } from 'motion/react';

export const Logo: React.FC<{ className?: string }> = ({ className = "h-8 w-8" }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Outer stylized 'A' for Awaz */}
      <motion.svg 
        viewBox="0 0 100 100" 
        className="w-full h-full"
        initial={{ rotate: -10, opacity: 0 }}
        animate={{ rotate: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        {/* Abstract Sound Waves / Print Layers */}
        <motion.path
          d="M20 80 Q 50 10 80 80"
          fill="none"
          stroke="url(#logo-gradient)"
          strokeWidth="8"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        />
        
        {/* Stylized Printer Nozzle / Pen Tool Tip */}
        <motion.circle
          cx="50"
          cy="35"
          r="6"
          fill="#ef4444"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 1, type: "spring", stiffness: 200 }}
        />

        {/* CMYK Inspired Accents */}
        <circle cx="30" cy="70" r="4" fill="#00ffff" opacity="0.6" />
        <circle cx="50" cy="75" r="4" fill="#ff00ff" opacity="0.6" />
        <circle cx="70" cy="70" r="4" fill="#ffff00" opacity="0.6" />

        <defs>
          <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="50%" stopColor="#9333ea" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
      </motion.svg>
      
      {/* Glow Effect */}
      <div className="absolute inset-0 bg-gradient-to-tr from-red-500/20 via-purple-500/20 to-blue-500/20 blur-xl rounded-full -z-10"></div>
    </div>
  );
};
