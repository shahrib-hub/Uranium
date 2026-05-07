'use client';
import { motion } from 'framer-motion';

export default function PremiumButton({ children, onClick, className = '', variant = 'primary', disabled = false }) {
  const variants = {
    primary: 'btn-premium',
    red: 'btn-premium-red',
    ghost: 'hover:bg-white/5 border-transparent text-white/60 hover:text-white',
  };

  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      onClick={disabled ? null : onClick}
      disabled={disabled}
      className={`${variants[variant]} ${className} disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {children}
    </motion.button>
  );
}
