// Tiny i18n layer. A language = ONE file in src/i18n/locales/ (see README: "Kako dodati jezik").
// Everything here is generic: the list of languages is discovered from that folder.
import { useSyncExternalStore } from 'react'
import type { Locale } from 'date-fns'
import type { MessageKey } from './locales/sr-Latn'

export type { MessageKey }

/** What a locale file must export (as its default export). */
export interface LocaleModule {
  /** BCP 47 code, e.g. 'en', 'sr-Latn'. Must match the file name. */
  code: string
  /** Name of the language in that language (shown in the language picker). */
  name: string
  /** date-fns locale: month and weekday names, date formats. */
  dateLocale: Locale
  /** Every key of sr-Latn.ts (TypeScript and a test make sure none is missing). */
  messages: Record<MessageKey, string>
  /**
   * Feminine forms of texts that depend on the speaker's gender ("uradio" -> "uradila").
   * Only for languages that have it; `t()` uses them when the user chose the feminine gender.
   */
  feminine?: Partial<Record<MessageKey, string>>
}

/** Keys without the plural suffix: `t('x.days', { n: 3 })` finds `x.days.one|few|other`. */
type PluralSuffix = 'one' | 'few' | 'other'
export type BaseKey = MessageKey extends infer K
  ? K extends `${infer B}.${PluralSuffix}`
    ? B
    : K
  : never
export type Params = Record<string, string | number>

const modules = import.meta.glob<{ default: LocaleModule }>('./locales/*.ts', { eager: true })
export const LANGUAGES: LocaleModule[] = Object.values(modules)
  .map((m) => m.default)
  .sort((a, b) => a.name.localeCompare(b.name))

const FALLBACK = 'en'
const byCode = (code: string) => LANGUAGES.find((l) => l.code.toLowerCase() === code.toLowerCase())

/** Picks the best supported language for a browser language tag (e.g. 'sr-RS', 'en-US', 'sr-Cyrl'). */
export function detectLanguage(tag: string = globalThis.navigator?.language ?? FALLBACK): string {
  const exact = byCode(tag)
  if (exact) return exact.code
  const parts = tag.split('-')
  const primary = parts[0].toLowerCase()
  const same = LANGUAGES.filter((l) => l.code.split('-')[0].toLowerCase() === primary)
  if (same.length === 0) return byCode(FALLBACK)?.code ?? LANGUAGES[0].code
  // an explicit script wins (sr-Cyrl); otherwise prefer the Latin variant or the plain code
  const script = parts.find((p) => p.length === 4)?.toLowerCase()
  const withScript = script && same.find((l) => l.code.toLowerCase().includes(script))
  const plain = same.find((l) => !l.code.includes('-') || l.code.includes('Latn'))
  return (withScript || plain || same[0]).code
}

/** The language to use for a saved setting ('' = automatic, from the browser). */
export function resolveLanguage(saved: string | undefined): string {
  return saved && byCode(saved) ? byCode(saved)!.code : detectLanguage()
}

let current: LocaleModule = byCode(detectLanguage()) ?? LANGUAGES[0]
if (typeof document !== 'undefined') document.documentElement.lang = current.code
const listeners = new Set<() => void>()

let gender: 'm' | 'f' = 'm'
/** The user's grammatical gender: texts that depend on it use the feminine form for 'f'. */
export function setGender(g: 'm' | 'f') {
  if (g === gender) return
  gender = g
  listeners.forEach((l) => l())
}
export const getGender = () => gender

export function getLanguage(): string {
  return current.code
}
export function getLocaleModule(): LocaleModule {
  return current
}
export function setLanguage(code: string) {
  const next = byCode(code)
  if (!next || next.code === current.code) return
  current = next
  if (typeof document !== 'undefined') document.documentElement.lang = next.code
  listeners.forEach((l) => l())
}
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

function fill(text: string, params?: Params): string {
  if (!params) return text
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m))
}

/**
 * Translates a key. `{name}` placeholders are filled from `params`.
 * If `params.n` is a number, the plural form of the key is used when it exists.
 */
export function t(key: BaseKey, params?: Params): string {
  const msgs = current.messages as Record<string, string>
  const fallback = byCode(FALLBACK)?.messages as Record<string, string> | undefined
  let text: string | undefined
  if (params && typeof params.n === 'number') {
    const rule = new Intl.PluralRules(current.code).select(params.n)
    text = msgs[`${key}.${rule}`] ?? msgs[`${key}.other`]
  }
  if (gender === 'f' && !text)
    text = (current.feminine as Record<string, string> | undefined)?.[key]
  text ??= msgs[key] ?? fallback?.[key] ?? key
  return fill(text, params)
}

/** A message in a specific language (used when old data is migrated: names stay in the user's language). */
export function messageIn(code: string, key: MessageKey): string {
  const msgs = (byCode(code) ?? current).messages as Record<string, string>
  return msgs[key] ?? key
}

/** Hook: re-renders the component when the language changes. */
export function useT() {
  // the snapshot includes the gender so a change of gender re-renders too
  const snapshot = useSyncExternalStore(
    subscribe,
    () => `${current.code}|${gender}`,
    () => `${current.code}|${gender}`,
  )
  return { t, lang: snapshot.split('|')[0] }
}

/** Number formatting in the current language (e.g. 1 234,5 vs 1,234.5). */
export function formatNumber(n: number, opts?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(current.code, opts).format(n)
}
