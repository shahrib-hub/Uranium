'use client';

import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Command, Search, Sparkles } from 'lucide-react';

export default function CommandsPage() {
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/commands').then((response) => response.ok ? response.json() : []).then((data) => setCategories(Array.isArray(data) ? data : [])).catch(() => setCategories([])).finally(() => setLoading(false));
  }, []);

  const results = useMemo(() => categories.map((category) => ({
    ...category,
    commands: category.commands.filter((command) => (command.name + ' ' + command.description).toLowerCase().includes(search.toLowerCase()))
  })).filter((category) => category.commands.length), [categories, search]);

  return <div className="lucent-page mx-auto max-w-7xl">
    <section className="lucent-card rounded-[1.7rem] p-6 sm:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="lucent-kicker mb-3">Help</p><h1 className="lucent-title text-4xl sm:text-5xl">Commands made clear.</h1><p className="lucent-subtitle mt-4">Find the command you need and see what it does.</p></div>
        <label className="lucent-input flex w-full items-center gap-3 px-4 py-3 lg:max-w-sm"><Search size={18} className="text-rose-200" /><input className="w-full bg-transparent outline-none placeholder:text-[var(--quiet)]" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search commands" /></label>
      </div>
    </section>
    {loading ? <div className="grid place-items-center py-24 text-sm text-[var(--muted)]"><Sparkles className="mb-3 animate-pulse text-rose-200" />Loading commands…</div> : <div className="mt-8 space-y-9">{results.map((category) => <section key={category.name}><div className="mb-4 flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-rose-400/15 text-rose-100"><BookOpen size={17} /></span><h2 className="text-lg font-semibold">{category.name}</h2></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{category.commands.map((command) => <article key={command.name} className="lucent-card rounded-[1.3rem] p-5"><span className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 text-rose-100"><Command size={15} /></span><h3 className="mt-4 font-semibold">{command.name}</h3><p className="mt-2 text-sm leading-6 text-[var(--muted)]">{command.description || 'No description available.'}</p></article>)}</div></section>)}</div>}
    {!loading && !results.length && <div className="lucent-card mt-8 rounded-[1.5rem] p-12 text-center"><BookOpen className="mx-auto text-rose-200" /><h2 className="mt-4 text-lg font-semibold">No commands found</h2><p className="mt-2 text-sm text-[var(--muted)]">Try a shorter search.</p></div>}
  </div>;
}
