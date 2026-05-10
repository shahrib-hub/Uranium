'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, X } from 'lucide-react';

export default function ConfirmModal({ isOpen, title, message, onConfirm, onCancel }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          onClick={onCancel}
        />
        
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative w-full max-w-md bg-[#0A0A0A] rounded-[32px] border border-white/10 p-8 space-y-6 shadow-2xl"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20">
              <AlertCircle size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black uppercase tracking-tighter italic">{title || 'Confirm Action'}</h3>
              <p className="text-[10px] font-black uppercase text-red-500 tracking-[3px]">Security Protocol</p>
            </div>
          </div>

          <p className="text-sm font-medium text-white/60 leading-relaxed">
            {message || 'Are you sure you want to proceed with this action? This might be irreversible.'}
          </p>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={onCancel}
              className="flex-1 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-black uppercase tracking-wider text-[10px] hover:bg-white/10 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onConfirm();
                onCancel();
              }}
              className="flex-1 py-4 rounded-2xl bg-red-500 text-black font-black uppercase tracking-wider text-[10px] hover:scale-105 active:scale-95 transition-all shadow-lg shadow-red-500/20"
            >
              Confirm
            </button>
          </div>

          <button 
            onClick={onCancel}
            className="absolute top-6 right-6 p-2 rounded-xl bg-white/5 text-white/20 hover:text-white transition-all"
          >
            <X size={16} />
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
