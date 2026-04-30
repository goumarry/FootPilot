import { useState, useEffect, useRef, useCallback, type InputHTMLAttributes } from 'react';
import { MapPin } from 'lucide-react';
import { clsx } from '@/lib/clsx';
import type { Locale } from '@/contexts/I18nContext';

interface Suggestion {
  label: string;
  lat: number;
  lng: number;
}

export interface PlaceResult {
  address: string;
  lat: number;
  lng: number;
}

interface PlacesInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect?: (place: PlaceResult) => void;
  locale?: Locale;
}

async function fetchSuggestions(query: string): Promise<Suggestion[]> {
  if (query.length < 3) return [];
  const res = await fetch(
    `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=5`
  );
  const data = await res.json();
  return (data.features ?? []).map((f: {
    properties: { label: string };
    geometry: { coordinates: [number, number] };
  }) => ({
    label: f.properties.label,
    lat: f.geometry.coordinates[1],
    lng: f.geometry.coordinates[0],
  }));
}

export default function PlacesInput({
  label,
  value,
  onChange,
  onPlaceSelect,
  locale = 'fr',
  className,
  placeholder,
  ...props
}: PlacesInputProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const search = useCallback((q: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!q || q.length < 3) { setSuggestions([]); setOpen(false); return; }
    timerRef.current = setTimeout(async () => {
      try {
        const results = await fetchSuggestions(q);
        setSuggestions(results);
        setOpen(results.length > 0);
      } catch {
        setSuggestions([]);
      }
    }, 300);
  }, []);

  function handleChange(v: string) {
    onChange(v);
    if (locale === 'fr') search(v);
  }

  function handleSelect(s: Suggestion) {
    onChange(s.label);
    onPlaceSelect?.({ address: s.label, lat: s.lat, lng: s.lng });
    setSuggestions([]);
    setOpen(false);
  }

  return (
    <div className="mb-4" ref={containerRef}>
      {label && (
        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 tracking-wide uppercase">
          {label}
        </label>
      )}
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none z-10">
          <MapPin size={14} />
        </span>
        <input
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          className={clsx(
            'w-full bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50',
            'rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-900 dark:text-slate-100',
            'placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all duration-150',
            'focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/60',
            className
          )}
          {...props}
        />
        {open && suggestions.length > 0 && (
          <ul className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 rounded-xl shadow-lg z-50 overflow-hidden">
            {suggestions.map((s, i) => (
              <li
                key={i}
                onMouseDown={() => handleSelect(s)}
                className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-violet-50 dark:hover:bg-violet-500/10 cursor-pointer transition-colors"
              >
                <MapPin size={12} className="text-violet-400 flex-shrink-0" />
                {s.label}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
