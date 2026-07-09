import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import fr from '@/i18n/fr.json';
import en from '@/i18n/en.json';
import es from '@/i18n/es.json';
import de from '@/i18n/de.json';
import it from '@/i18n/it.json';
import zh from '@/i18n/zh.json';
import ar from '@/i18n/ar.json';

export type Locale = 'fr' | 'en' | 'es' | 'de' | 'it' | 'zh' | 'ar';

export const LOCALES: Locale[] = ['fr', 'en', 'es', 'de', 'it', 'zh', 'ar'];

const translations: Record<Locale, Record<string, unknown>> = { fr, en, es, de, it, zh, ar };

function resolve(obj: Record<string, unknown>, path: string): string {
  const keys = path.split('.');
  let cur: unknown = obj;
  for (const k of keys) {
    if (cur && typeof cur === 'object' && k in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[k];
    } else {
      return path;
    }
  }
  return typeof cur === 'string' ? cur : path;
}

function detectLocale(): Locale {
  const saved = localStorage.getItem('fp_locale') as Locale | null;
  if (saved && saved in translations) return saved;
  const lang = navigator.language.split('-')[0] as Locale;
  return lang in translations ? lang : 'fr';
}

interface I18nCtx {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nCtx>({} as I18nCtx);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectLocale);

  const setLocale = useCallback((l: Locale) => {
    localStorage.setItem('fp_locale', l);
    setLocaleState(l);
  }, []);

  // Les fichiers autres que fr.json sont gelés : toute clé absente de la locale
  // courante retombe sur le français au lieu d'afficher la clé brute
  const t = useCallback((key: string) => {
    const value = resolve(translations[locale], key);
    if (value === key && locale !== 'fr') return resolve(translations.fr, key);
    return value;
  }, [locale]);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export const useI18n = () => useContext(I18nContext);
