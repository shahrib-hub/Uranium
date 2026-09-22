'use client';
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Search, X } from 'lucide-react';

export default function CustomSelect({
  value,
  onChange,
  options = [],
  label,
  placeholder = 'Select an option...',
  disabled = false,
  searchable = false,
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, openUp: false });
  const triggerRef = useRef(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label?.toLowerCase().includes(q) ||
        opt.description?.toLowerCase().includes(q) ||
        String(opt.value)?.toLowerCase().includes(q)
    );
  }, [options, search]);

  const isSearchEnabled = searchable || options.length > 7;

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < 240 && rect.top > spaceBelow;
    const width = Math.max(rect.width, 220);
    
    // Ensure dropdown stays within viewport horizontally
    let left = rect.left;
    if (left + width > window.innerWidth - 16) {
      left = Math.max(16, window.innerWidth - width - 16);
    }

    setCoords({
      top: openUp ? rect.top - 8 : rect.bottom + 8,
      bottom: openUp ? window.innerHeight - rect.top + 8 : 0,
      left,
      width,
      openUp
    });
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    updatePosition();

    const handleScrollOrResize = () => {
      updatePosition();
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, updatePosition]);

  return (
    <div className={`space-y-1.5 ${disabled ? 'opacity-50 pointer-events-none' : ''} ${className}`}>
      {label && (
        <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--quiet)] ml-1">
          {label}
        </label>
      )}
      <div className="relative">
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          onClick={() => {
            if (!isOpen) {
              updatePosition();
            }
            setIsOpen(!isOpen);
            setSearch('');
          }}
          className={`glass flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left transition hover:border-rose-400/30 ${
            disabled ? 'cursor-not-allowed' : ''
          }`}
        >
          <span className="flex min-w-0 items-center gap-2.5">
            {selectedOption?.icon && <span className="shrink-0 text-base">{selectedOption.icon}</span>}
            <span className="truncate text-sm font-medium text-white">
              {selectedOption?.label || <span className="text-[var(--muted)]">{placeholder}</span>}
            </span>
            {selectedOption?.badge && (
              <span className="rounded-md bg-rose-500/20 px-2 py-0.5 text-[10px] font-semibold text-rose-300">
                {selectedOption.badge}
              </span>
            )}
          </span>
          <ChevronDown
            size={16}
            className={`shrink-0 text-[var(--muted)] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {isOpen && mounted && createPortal(
          <>
            <div 
              className="fixed inset-0 z-[99998] bg-black/25" 
              onClick={() => setIsOpen(false)} 
            />
            <div 
              style={{
                position: 'fixed',
                top: coords.openUp ? undefined : `${coords.top}px`,
                bottom: coords.openUp ? `${coords.bottom}px` : undefined,
                left: `${coords.left}px`,
                width: `${coords.width}px`,
                zIndex: 99999
              }}
              className="max-h-72 overflow-hidden rounded-2xl border border-white/15 bg-[#12080f] p-2 shadow-2xl backdrop-blur-3xl ring-1 ring-black/50 animate-in fade-in zoom-in-95 duration-150"
            >
              {isSearchEnabled && (
                <div className="relative mb-2 px-1">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search options..."
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-8 text-xs text-white placeholder:text-[var(--quiet)] outline-none focus:border-rose-400/50 focus:bg-white/10"
                    autoFocus
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch('')}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-white"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              )}

              <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                {filteredOptions.length > 0 ? (
                  filteredOptions.map((opt) => {
                    const isSelected = value === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          onChange(opt.value);
                          setIsOpen(false);
                          setSearch('');
                        }}
                        className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                          isSelected
                            ? 'bg-rose-500/20 text-rose-100 ring-1 ring-rose-400/30'
                            : 'text-[var(--muted)] hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <span className="flex min-w-0 items-center gap-2.5">
                          {opt.icon && <span className="shrink-0 text-base">{opt.icon}</span>}
                          <span className="truncate">
                            <strong className="block text-xs font-semibold">{opt.label}</strong>
                            {opt.description && (
                              <small className="block truncate text-[11px] text-[var(--quiet)]">
                                {opt.description}
                              </small>
                            )}
                          </span>
                        </span>
                        {isSelected && <Check size={14} className="shrink-0 text-rose-300" />}
                      </button>
                    );
                  })
                ) : (
                  <p className="p-3 text-center text-xs text-[var(--muted)]">No matching options found</p>
                )}
              </div>
            </div>
          </>,
          document.body
        )}
      </div>
    </div>
  );
}