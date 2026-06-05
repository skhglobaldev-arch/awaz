import React from 'react';
import { motion } from 'motion/react';

export const Logo3: React.FC<{ className?: string }> = ({ className = "h-8 w-8" }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Liquid / Glassmorphism Style Logo */}
      <motion.svg 
        viewBox="0 0 100 100" 
        className="w-full h-full"
        initial={{ opacity: 0, rotate: -20 }}
        animate={{ opacity: 1, rotate: 0 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      >
        {/* Abstract Fluid Shape for 'A' */}
        <motion.path
          d="M30 80 C 30 40, 50 10, 70 40 C 90 70, 70 90, 50 80 C 30 70, 20 50, 30 30"
          fill="url(#logo-grad-3)"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 2, ease: "easeInOut" }}
        />
        
        {/* Inner Glassy Core */}
        <motion.circle
          cx="50"
          cy="50"
          r="15"
          fill="rgba(255, 255, 255, 0.1)"
          stroke="rgba(255, 255, 255, 0.2)"
          strokeWidth="1"
          animate={{ 
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.6, 0.3]
          }}
          transition={{ 
            duration: 3, 
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        {/* Creative Spark / Printer Head Tip */}
        <motion.path
          d="M50 20 L50 35"
          stroke="#fff"
          strokeWidth="4"
          strokeLinecap="round"
          animate={{ 
            y: [0, 5, 0]
          }}
          transition={{ 
            duration: 1.5, 
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        <defs>
          <linearGradient id="logo-grad-3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="50%" stopColor="#ec4899" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
      </motion.svg>
      
      {/* Vibrant Glow */}
      <div className="absolute inset-0 bg-gradient-to-tr from-red-500/30 via-pink-500/30 to-blue-500/30 blur-2xl rounded-full -z-10"></div>
    </div>
  );
};
