import { useEffect, useMemo, useRef, useState } from 'react';

export interface ExplorerItem {
  id: string;
  name: string;
  category: string;
  tagline: string;
  hosted: boolean;
  output?: string;
  price?: string;
  free?: boolean;
  satellite?: boolean;
  chips: string[];
  search: string;
}
export interface ExplorerCategory { id: string; short: string; hue: number }

interface Props { items: ExplorerItem[]; categories: ExplorerCategory[]; initialCategory?: string }

const CSS = `
.srv-row { display: grid; gap: .3rem; padding: 1.1rem 0 1.2rem; border-top: 1px solid var(--border); transition: background .15s ease; }
.srv-row:hover .srv-row-name { color: var(--accent); }
.srv-row-out { justify-self: start; font-family: var(--font-mono); font-size: .68rem; font-weight: 600; letter-spacing: .08em; text-transform: uppercase;
  color: var(--text); padding: .15rem .45rem; border: 1px solid var(--border-strong); border-radius: .25rem; background: var(--surface-solid); }
.srv-row-name { font-size: 1.15rem; font-weight: 660; letter-spacing: -0.02em; margin-top: .35rem; transition: color .15s ease; }
.srv-row-tag { color: var(--muted); font-size: .93rem; line-height: 1.45; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.srv-row-meta { display: flex; flex-wrap: wrap; gap: .2rem .9rem; font-size: .78rem; font-weight: 560; color: var(--faint); margin-top: .25rem; }
`;

export default function ServerExplorer({ items, categories, initialCategory = 'all' }: Props) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState(initialCategory);
  const [hostedOnly, setHostedOnly] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') { e.preventDefault(); input.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
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
    `chip shrink-0 cursor-pointer !px-3 !py-1.5 !text-[.84rem] transition-colors ${active ? '!text-fg !border-line-strong bg-surface-2' : 'hover:!text-fg'}`;

  return (
    <div>
      <style>{CSS}</style>
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Search servers</span>
          <svg className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
          <input
            ref={input}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search invoice, PDF, VAT"
            aria-keyshortcuts="/"
            className="h-12 w-full rounded-[3px] border border-line-strong bg-surface-solid pl-11 pr-4 text-[1rem] outline-none transition-colors placeholder:text-faint focus:border-line-strong"
          />
        </label>
        <label className="flex cursor-pointer select-none items-center gap-3 text-[.93rem]">
          <span className="muted">Hosted only</span>
          <button
            type="button"
            role="switch"
            aria-checked={hostedOnly}
            onClick={() => setHostedOnly((v) => !v)}
            className="relative h-6 w-11 rounded-[2px] border border-line-strong transition-colors"
            style={{ background: hostedOnly ? 'var(--accent)' : 'var(--surface-2)' }}
          >
            <span className="absolute top-0.5 h-4.5 w-4.5 rounded-[1px] border border-line-strong bg-surface-solid transition-all" style={{ left: hostedOnly ? '1.4rem' : '.15rem' }} />
          </button>
        </label>
      </div>

      <div className="-mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0" role="group" aria-label="Filter by category">
        <button type="button" className={pill(cat === 'all')} aria-pressed={cat === 'all'} onClick={() => setCat('all')}>All</button>
        {categories.map((c) => (
          <button key={c.id} type="button" className={`${pill(cat === c.id)} cat`} style={{ ['--hue' as string]: c.hue }} aria-pressed={cat === c.id} onClick={() => setCat(c.id)}>
            <span className="dot" />
            {c.short}
          </button>
        ))}
      </div>

      <p className="muted mt-6 min-h-[1.4em] text-[.9rem]" aria-live="polite">{shown.length === items.length ? 'Sorted by what people buy most.' : `${shown.length} match`}</p>

      <div className="mt-3 grid gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((s) => {
          const c = hue[s.category];
          return (
            <a key={s.id} href={`/servers/${s.id}/`} className="srv-row cat group" style={{ ['--hue' as string]: c?.hue ?? 285 }}>
              <span className="srv-row-out">{s.output}</span>
              <span className="srv-row-name">{s.name}</span>
              <span className="srv-row-tag">{s.tagline}</span>
              <span className="srv-row-meta">
                <span className="cat-text">{c?.short}</span>
                {s.price && <span>{s.price}</span>}
                {s.hosted && <span>Hosted</span>}
              </span>
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
