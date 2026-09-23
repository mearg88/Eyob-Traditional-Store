import { createContext, useContext } from 'react';
import en from './locales/en';

// ---------------------------------------------------------------------------
// Translation.
//
// Launch is English only. Amharic and Tigrinya come later, and the only reason
// this exists now is that retrofitting it is expensive: every hardcoded string
// in every component has to be found and replaced, and the ones in rarely-seen
// error paths get missed.
//
// Adding a language later is now a translation job, not a code change: copy
// locales/en.ts, translate the values, register it below.
//
// Deliberately hand-rolled rather than a library. We need lookup, interpolation
// and a fallback; a full i18n framework would add far more weight to the
// bundle than that is worth on a phone over 3G.
// ---------------------------------------------------------------------------

export type Locale = 'en' | 'am' | 'ti';

export const LOCALES: { code: Locale; name: string; nativeName: string; available: boolean }[] = [
  { code: 'en', name: 'English', nativeName: 'English', available: true },
  // Ethiopic script needs a font that carries it — see index.css before enabling.
  { code: 'am', name: 'Amharic', nativeName: 'አማርኛ', available: false },
  { code: 'ti', name: 'Tigrinya', nativeName: 'ትግርኛ', available: false },
];

export type Dictionary = typeof en;

const dictionaries: Record<Locale, Dictionary | null> = {
  en,
  am: null,
  ti: null,
};

/** Dotted path into the dictionary, e.g. 'cart.empty.title'. */
export type TranslationKey = string;

function lookup(dict: Dictionary, key: string): string | undefined {
  const value = key.split('.').reduce<unknown>(
    (acc, part) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[part] : undefined),
    dict,
  );
  return typeof value === 'string' ? value : undefined;
}

/**
 * Translate, with {placeholder} interpolation.
 *
 * A missing key returns the key itself rather than an empty string, so a gap
 * is visible on screen during development instead of silently disappearing.
 */
export function translate(
  locale: Locale,
  key: TranslationKey,
  vars?: Record<string, string | number>,
): string {
  const dict = dictionaries[locale] ?? dictionaries.en;
  const template = lookup(dict!, key) ?? lookup(dictionaries.en!, key) ?? key;

  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

export const LocaleContext = createContext<Locale>('en');

export function useTranslation() {
  const locale = useContext(LocaleContext);
  return {
    locale,
    t: (key: TranslationKey, vars?: Record<string, string | number>) =>
      translate(locale, key, vars),
  };
}
