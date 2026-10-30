import { useMemo, useState } from 'react';

export interface ExplorerItem {
  id: string;
  name: string;
  category: string;
  tagline: string;
  hosted: boolean;
  chips: string[];
  search: string;
}
export interface ExplorerCategory { id: string; short: string; hue: number }

interface Props { items: ExplorerItem[]; categories: ExplorerCategory[]; initialCategory?: string }

export default function ServerExplorer({ items, categories, initialCategory = 'all' }: Props) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState(initialCategory);
  const [hostedOnly, setHostedOnly] = useState(false);
  const hue = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories]);

  const shown = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return items.filter(
      (s) =>
        (cat === 'all' || s.category === cat) &&
        (!hostedOnly || s.hosted) &&
        words.every((w) => s.search.includes(w)),
    );
  }, [items, q, cat, hostedOnly]);

  const pill = (active: boolean) =>
    `chip cursor-pointer !px-3 !py-1.5 !text-[.84rem] transition-colors ${active ? '!text-fg !border-line-strong bg-surface-2' : 'hover:!text-fg'}`;

  return (
    <div>
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Search servers</span>
          <svg className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search: invoice, PDF, mileage, VAT..."
            className="h-12 w-full rounded-xl border border-line bg-surface pl-11 pr-4 text-[1rem] outline-none transition-colors placeholder:text-faint focus:border-line-strong"
          />
        </label>
        <label className="flex cursor-pointer select-none items-center gap-3 text-[.93rem]">
          <span className="muted">Hosted only</span>
          <button
            type="button"
            role="switch"
            aria-checked={hostedOnly}
            onClick={() => setHostedOnly((v) => !v)}
            className="relative h-6 w-11 rounded-full border border-line-strong transition-colors"
            style={{ background: hostedOnly ? 'var(--accent)' : 'var(--surface-2)' }}
          >
            <span className="absolute top-0.5 h-4.5 w-4.5 rounded-full bg-white shadow transition-all" style={{ left: hostedOnly ? '1.4rem' : '.15rem' }} />
          </button>
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filter by category">
        <button type="button" className={pill(cat === 'all')} aria-pressed={cat === 'all'} onClick={() => setCat('all')}>All</button>
        {categories.map((c) => (
          <button key={c.id} type="button" className={`${pill(cat === c.id)} cat`} style={{ ['--hue' as string]: c.hue }} aria-pressed={cat === c.id} onClick={() => setCat(c.id)}>
            <span className="dot" />
            {c.short}
          </button>
        ))}
      </div>

      <p className="muted mt-6 text-[.9rem]" aria-live="polite">{shown.length} of {items.length} servers</p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((s) => {
          const c = hue[s.category];
          return (
            <a key={s.id} href={`/servers/${s.id}/`} className="card card-hover cat flex h-full flex-col p-5" style={{ ['--hue' as string]: c?.hue ?? 285 }}>
              <div className="flex items-center justify-between gap-3">
                <span className="cat-text flex items-center gap-2 text-[.78rem] font-medium"><span className="dot" />{c?.short}</span>
                {s.hosted && <span className="chip !py-0.5 !text-[.7rem]">Hosted</span>}
              </div>
              <h3 className="mt-4 text-[1.2rem] font-semibold tracking-tight">{s.name}</h3>
              <p className="muted mt-1.5 line-clamp-3 text-[.94rem] leading-relaxed">{s.tagline}</p>
              <div className="mt-auto flex flex-wrap gap-1.5 pt-5">
                {s.chips.map((x) => <span key={x} className="chip">{x}</span>)}
              </div>
            </a>
          );
        })}
      </div>
      {shown.length === 0 && (
        <div className="card mt-4 p-10 text-center">
          <p className="font-semibold">No server matches.</p>
          <button type="button" className="btn btn-sm mt-4" onClick={() => { setQ(''); setCat('all'); setHostedOnly(false); }}>Reset filters</button>
        </div>
      )}
    </div>
  );
}
