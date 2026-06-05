import React from 'react';
import { motion } from 'motion/react';

export const Logo2: React.FC<{ className?: string }> = ({ className = "h-8 w-8" }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <motion.svg 
        viewBox="0 0 100 100" 
        className="w-full h-full"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
      >
        {/* Modern Geometric 'A' */}
        <motion.path
          d="M20 85 L50 15 L80 85"
          fill="none"
          stroke="url(#logo-grad-2)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2, ease: "easeInOut" }}
        />
        
        {/* Horizontal bar as a 'Print Head' line */}
        <motion.path
          d="M35 60 L65 60"
          fill="none"
          stroke="#fff"
          strokeWidth="4"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
        />

        {/* Floating Creative Spark */}
        <motion.circle
          cx="50"
          cy="45"
          r="3"
          fill="#ef4444"
          animate={{ 
            scale: [1, 1.5, 1],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        {/* CMYK Dots in a row at the bottom */}
        <circle cx="40" cy="92" r="2" fill="#00ffff" />
        <circle cx="47" cy="92" r="2" fill="#ff00ff" />
        <circle cx="54" cy="92" r="2" fill="#ffff00" />
        <circle cx="61" cy="92" r="2" fill="#000000" />

        <defs>
          <linearGradient id="logo-grad-2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f43f5e" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
      </motion.svg>
      
      {/* Subtle Aura */}
      <div className="absolute inset-0 bg-blue-500/10 blur-2xl rounded-full -z-10"></div>
    </div>
  );
};
