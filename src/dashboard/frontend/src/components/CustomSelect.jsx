'use client';
import { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export default function CustomSelect({ value, onChange, options, label, placeholder = 'Select...' }) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-[10px] font-black uppercase text-white/20 tracking-widest ml-1">
          {label}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 text-left transition-all hover:border-white/20"
        >
          <span className="text-sm font-medium text-white">
            {selectedOption?.label || placeholder}
          </span>
          <ChevronDown size={16} className={`text-white/40 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <div className="absolute top-full left-0 right-0 mt-2 bg-[#0A0A0A] border border-white/10 rounded-xl overflow-hidden z-50 shadow-xl">
              {options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-3 text-left transition-all ${
                    value === opt.value
                      ? 'bg-red-500/10 text-red-400'
                      : 'text-white/60 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span className="text-sm font-medium">{opt.label}</span>
                  {value === opt.value && <Check size={14} />}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}