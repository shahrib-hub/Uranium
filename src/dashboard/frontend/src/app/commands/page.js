'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BookOpen, Command, Search, Sparkles, Crown, Zap, Shield, ArrowRight, ExternalLink } from 'lucide-react';
import fallbackCommandsData from '@/data/commandsData.json';

export default function CommandsPage() {
  const [categories, setCategories] = useState(fallbackCommandsData || []);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'premium', 'free'
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/commands')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setCategories(data);
        }
      })
      .catch(() => {
        // Fallback data is already loaded
      });
  }, []);

  // Compute total counts
  const { totalCount, premiumCount, freeCount } = useMemo(() => {
    let total = 0;
    let prem = 0;
    categories.forEach((cat) => {
      (cat.commands || []).forEach((cmd) => {
        total++;
        if (cmd.isPremium) prem++;
      });
    });
    return { totalCount: total, premiumCount: prem, freeCount: total - prem };
  }, [categories]);

  // Filter categories and commands based on search, filterType, and selectedCategory
  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase();

    return categories
      .filter((cat) => selectedCategory === 'all' || cat.name === selectedCategory)
      .map((category) => {
        const filteredCmds = (category.commands || []).filter((command) => {
          // Search query matching
          const matchesSearch =
            !q ||
            command.name.toLowerCase().includes(q) ||
            (command.description || '').toLowerCase().includes(q) ||
            category.name.toLowerCase().includes(q);

          // Type filter
          if (!matchesSearch) return false;
          if (filterType === 'premium') return !!command.isPremium;
          if (filterType === 'free') return !command.isPremium;
          return true;
        });

        return {
          ...category,
          commands: filteredCmds
        };
      })
      .filter((category) => category.commands.length > 0);
  }, [categories, search, filterType, selectedCategory]);

  return (
    <div className="lucent-page mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-8">
      {/* Header Banner */}
      <section className="lucent-card rounded-[2rem] p-6 sm:p-10 border border-white/10 bg-gradient-to-b from-white/[0.05] to-transparent">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-4 mb-2">
              <div className="h-px w-12 bg-red-500" />
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-[4px] text-red-500">
                Command Directory
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold uppercase tracking-wider">
                <Crown size={11} className="fill-amber-400 text-amber-400" />
                {premiumCount} Premium
              </span>
            </div>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tighter uppercase italic text-white">
              Commands <span className="text-red-500">Catalog</span>
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-white/50 max-w-2xl leading-relaxed">
              Explore all {totalCount} slash commands available in Uranium. Look for the gold crown icon next to premium-tier commands.
            </p>
          </div>

          {/* Search Box */}
          <div className="w-full lg:max-w-md">
            <label className="flex w-full items-center gap-3 px-4 py-3.5 rounded-xl border border-white/10 bg-white/5 focus-within:border-rose-500/50 focus-within:bg-black/40 transition">
              <Search size={18} className="text-rose-400 shrink-0" />
              <input
                type="text"
                className="w-full bg-transparent outline-none text-sm text-white placeholder:text-white/40"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search commands by name, action, or tag..."
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="text-xs text-white/40 hover:text-white transition"
                >
                  Clear
                </button>
              )}
            </label>
          </div>
        </div>

        {/* Filter Pills / Tabs */}
        <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                filterType === 'all'
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25'
                  : 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10'
              }`}
            >
              All Commands ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('premium')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                filterType === 'premium'
                  ? 'bg-amber-500 text-black shadow-md shadow-amber-500/30'
                  : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}
            >
              <Crown size={13} className={filterType === 'premium' ? 'fill-black text-black' : 'fill-amber-400 text-amber-400'} />
              <span>Premium Only ({premiumCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterType('free')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                filterType === 'free'
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25'
                  : 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10'
              }`}
            >
              Free Commands ({freeCount})
            </button>
          </div>

          {/* Quick link to upgrade */}
          <a
            href="https://discord.gg/26ThFyckFX"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 transition"
          >
            <Crown size={14} className="fill-amber-400 text-amber-400" />
            <span>Unlock All Premium Perks</span>
            <ArrowRight size={13} />
          </a>
        </div>
      </section>

      {/* Category Quick Filter Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          type="button"
          onClick={() => setSelectedCategory('all')}
          className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer ${
            selectedCategory === 'all'
              ? 'bg-white text-black'
              : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-white/10'
          }`}
        >
          All Categories
        </button>
        {categories.map((cat) => {
          const hasPrem = (cat.commands || []).some((c) => c.isPremium);
          const isSelected = selectedCategory === cat.name;
          return (
            <button
              key={cat.name}
              type="button"
              onClick={() => setSelectedCategory(cat.name)}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                isSelected
                  ? 'bg-white text-black'
                  : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-white/10'
              }`}
            >
              <span>{cat.name}</span>
              {hasPrem && <Crown size={11} className="fill-amber-400 text-amber-400 inline" />}
            </button>
          );
        })}
      </div>

      {/* Commands Grid by Category */}
      {filteredCategories.length > 0 ? (
        <div className="space-y-10">
          {filteredCategories.map((category) => {
            const hasPrem = (category.commands || []).some((c) => c.isPremium);
            return (
              <section key={category.name} className="space-y-4">
                {/* Category Header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 text-rose-300 font-bold text-sm">
                      <BookOpen size={16} />
                    </span>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <span>{category.name}</span>
                      {hasPrem && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-[10px] font-black uppercase tracking-wider text-amber-300">
                          <Crown size={10} className="fill-amber-400 text-amber-400" />
                          <span>Includes Premium</span>
                        </span>
                      )}
                    </h2>
                  </div>
                  <span className="text-xs font-medium text-white/40">
                    {category.commands.length} command{category.commands.length === 1 ? '' : 's'}
                  </span>
                </div>

                {/* Command Cards Grid */}
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {category.commands.map((command) => {
                    const isPrem = !!command.isPremium;
                    return (
                      <article
                        key={command.name}
                        className={`group relative rounded-2xl p-5 transition-all duration-200 hover:-translate-y-0.5 ${
                          isPrem
                            ? 'border border-amber-500/30 bg-gradient-to-b from-amber-500/[0.07] via-[#151310] to-[#0e1017] shadow-lg shadow-amber-500/5 hover:border-amber-400/50 hover:shadow-amber-500/15'
                            : 'lucent-card border border-white/10 bg-[#121422] hover:border-white/20'
                        }`}
                      >
                        {/* Top Card Bar */}
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`grid h-8 w-8 place-items-center rounded-lg ${
                              isPrem
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm shadow-amber-500/20'
                                : 'bg-white/10 text-rose-300 border border-white/10'
                            }`}
                          >
                            {isPrem ? (
                              <Crown size={15} className="fill-amber-400 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]" />
                            ) : (
                              <Command size={15} />
                            )}
                          </span>

                          {/* Premium Gold Badge */}
                          {isPrem ? (
                            <span
                              title="Requires Multi-Bot / Uranium Premium"
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-gradient-to-r from-amber-500/25 to-yellow-500/20 border border-amber-500/40 text-[10px] font-black uppercase tracking-wider text-amber-300 shadow-sm shadow-amber-500/10"
                            >
                              <Crown size={11} className="fill-amber-400 text-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.8)]" />
                              <span>PREMIUM</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-white/30">
                              Free
                            </span>
                          )}
                        </div>

                        {/* Command Name with Gold Icon if Premium */}
                        <div className="mt-4 flex items-center gap-2 flex-wrap">
                          <h3
                            className={`font-mono text-sm font-black tracking-tight ${
                              isPrem ? 'text-amber-200' : 'text-white'
                            }`}
                          >
                            {command.name}
                          </h3>
                          {isPrem && (
                            <Crown
                              size={14}
                              className="fill-amber-400 text-amber-400 inline-block drop-shadow-[0_0_8px_rgba(245,158,11,0.7)]"
                              title="Premium Command"
                            />
                          )}
                        </div>

                        {/* Description */}
                        <p className="mt-2 text-xs leading-relaxed text-white/60">
                          {command.description || 'No description available.'}
                        </p>

                        {/* Premium Note */}
                        {isPrem && (
                          <div className="mt-3.5 pt-2.5 border-t border-amber-500/15 flex items-center justify-between text-[10px] font-bold text-amber-300/80">
                            <span>✨ Unlocked with Premium</span>
                            <a
                              href="https://discord.gg/26ThFyckFX"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-amber-400 hover:text-amber-200 underline inline-flex items-center gap-1"
                            >
                              Get Access <ExternalLink size={9} />
                            </a>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="lucent-card mt-8 rounded-[2rem] p-12 text-center space-y-4 border border-white/10 bg-[#121422]">
          <BookOpen className="mx-auto text-rose-400 h-10 w-10" />
          <h2 className="text-xl font-bold text-white">No matching commands found</h2>
          <p className="text-sm text-white/50 max-w-sm mx-auto">
            No commands match your filter or search query "{search}". Try searching with fewer characters or switch filter tabs.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setFilterType('all');
              setSelectedCategory('all');
            }}
            className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-xs font-bold text-white transition"
          >
            Reset Filters
          </button>
        </div>
      )}
    </div>
  );
}
