import { useEffect, useRef, type InputHTMLAttributes } from 'react';
import { MapPin } from 'lucide-react';
import { clsx } from '@/lib/clsx';

/* Minimal type declarations for the Google Maps Places API */
interface GoogleAutocomplete {
  addListener(event: string, handler: () => void): void;
  getPlace(): {
    formatted_address?: string;
    geometry?: { location?: { lat(): number; lng(): number } };
  };
}

declare global {
  interface Window {
    google?: {
      maps: {
        places: {
          Autocomplete: new (
            input: HTMLInputElement,
            opts?: { types?: string[]; fields?: string[] }
          ) => GoogleAutocomplete;
        };
        event: { clearInstanceListeners(obj: unknown): void };
      };
    };
  }
}

interface PlaceResult {
  address: string;
  lat: number;
  lng: number;
}

interface PlacesInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect?: (place: PlaceResult) => void;
}

let _scriptPromise: Promise<void> | null = null;

function loadGoogleMaps(apiKey: string): Promise<void> {
  if (window.google?.maps?.places) return Promise.resolve();
  if (_scriptPromise) return _scriptPromise;
  _scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Google Maps failed to load'));
    document.head.appendChild(script);
  });
  return _scriptPromise;
}

export default function PlacesInput({
  label,
  value,
  onChange,
  onPlaceSelect,
  className,
  placeholder,
  ...props
}: PlacesInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (!apiKey || !inputRef.current) return;
    let autocomplete: GoogleAutocomplete | null = null;

    loadGoogleMaps(apiKey)
      .then(() => {
        if (!inputRef.current || !window.google) return;
        autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
          types: ['establishment', 'geocode'],
          fields: ['formatted_address', 'geometry'],
        });
        autocomplete.addListener('place_changed', () => {
          if (!autocomplete) return;
          const place = autocomplete.getPlace();
          const address = place.formatted_address ?? inputRef.current?.value ?? '';
          onChange(address);
          if (onPlaceSelect && place.geometry?.location) {
            onPlaceSelect({
              address,
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
            });
          }
        });
      })
      .catch(() => {
        /* API key missing or invalid — falls back to plain text input */
      });

    return () => {
      if (autocomplete && window.google) {
        window.google.maps.event.clearInstanceListeners(autocomplete);
      }
    };
  }, [apiKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="mb-4">
      {label && (
        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 tracking-wide uppercase">
          {label}
        </label>
      )}
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none">
          <MapPin size={14} />
        </span>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={clsx(
            'w-full bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50',
            'rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-900 dark:text-slate-100',
            'placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all duration-150',
            'focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/60',
            className
          )}
          {...props}
        />
      </div>
    </div>
  );
}
