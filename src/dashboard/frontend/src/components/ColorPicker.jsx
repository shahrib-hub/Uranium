'use client';
import { useState } from 'react';

const PRESET_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#84CC16', '#22C55E',
  '#14B8A6', '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1',
  '#8B5CF6', '#A855F7', '#D946EF', '#EC4899', '#F43F5E',
  '#071022', '#1F2937', '#374151', '#4B5563', '#6B7280'
];

export default function ColorPicker({ value, onChange, label = 'Color' }) {
  const [customColor, setCustomColor] = useState(value || '#6366F1');
  const [showCustom, setShowCustom] = useState(false);

  const handleCustomChange = (e) => {
    const hex = e.target.value;
    setCustomColor(hex);
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      onChange(hex);
    }
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-xs font-bold text-white/60 uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="flex flex-wrap gap-2">
        {PRESET_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            className={`w-8 h-8 rounded-lg transition-all ${
              value === color
                ? 'ring-2 ring-white ring-offset-2 ring-offset-[#050505] scale-110'
                : 'hover:scale-110 hover:shadow-lg'
            }`}
            style={{ backgroundColor: color }}
            title={color}
          />
        ))}
        <button
          type="button"
          onClick={() => setShowCustom(!showCustom)}
          className={`w-8 h-8 rounded-lg border-2 border-dashed transition-all flex items-center justify-center ${
            showCustom ? 'border-white bg-white/10' : 'border-white/20 hover:border-white/40'
          }`}
        >
          <span className="text-xs text-white/60">+</span>
        </button>
      </div>

      {showCustom && (
        <div className="flex items-center gap-3 mt-3 p-3 bg-white/5 rounded-xl border border-white/10">
          <input
            type="color"
            value={customColor}
            onChange={(e) => {
              setCustomColor(e.target.value);
              onChange(e.target.value);
            }}
            className="w-12 h-10 rounded-lg cursor-pointer bg-transparent"
          />
          <input
            type="text"
            value={customColor}
            onChange={handleCustomChange}
            placeholder="#6366F1"
            className="flex-1 bg-transparent border-none outline-none text-white font-mono text-sm placeholder:text-white/20"
          />
        </div>
      )}

      {value && (
        <p className="text-xs text-white/40 font-mono">{value}</p>
      )}
    </div>
  );
}