// Serbian vocative of a first name ("Kako si, Vukašine?"). Rules for common names, Latin and Cyrillic.
// It is a suggestion: in the intro the user can correct it. Pure functions.
import { cyrillicToLatin, latinToCyrillic } from '../i18n/translit'

/** Names whose "a" disappears in the vocative (Petar -> Petre). */
const FLEETING_A = new Set(['petar', 'aleksandar', 'dimitar', 'nikolajčar'])

/** Vocative of one name written in Latin. Keeps the capitalisation. */
function vocativeLatin(name: string): string {
  const n = name
  const low = n.toLowerCase()
  if (low.length < 2) return n
  // Milica -> Milice, Slavica -> Slavice
  if (low.endsWith('ica')) return `${n.slice(0, -1)}e`
  // other names ending in a vowel stay: Ana, Marko, Luka, Nikola, Đorđe, Dušani
  if (/[aeiou]$/.test(low)) return n
  // Petar -> Petre, Aleksandar -> Aleksandre
  if (FLEETING_A.has(low)) return `${n.slice(0, -2)}${n.slice(-1)}e`
  // consonant softening: Predrag -> Predraže, Vuk -> Vuče, Zlatomir keeps (only g/k/h change)
  if (low.endsWith('g')) return `${n.slice(0, -1)}že`
  if (low.endsWith('k')) return `${n.slice(0, -1)}če`
  if (low.endsWith('h')) return `${n.slice(0, -1)}še`
  // names ending in a "j": Andrej, Matej stay as they are
  if (low.endsWith('j')) return n
  // Vukašin -> Vukašine, Stefan -> Stefane, Miloš -> Miloše
  return `${n}e`
}

const hasCyrillic = (s: string) => /[Ѐ-ӿ]/.test(s)

/** Vocative of a first name. Only the first name is changed ("Vukašin Knežević" -> "Vukašine"). */
export function vocative(fullName: string): string {
  const first = fullName.trim().split(/\s+/)[0] ?? ''
  if (!first) return ''
  const cyr = hasCyrillic(first)
  const latin = cyr ? cyrillicToLatin(first) : first
  // double names: Ana-Marija -> Ana-Marija, Marko-Petar -> Marko-Petre
  const out = latin.split('-').map(vocativeLatin).join('-')
  return cyr ? latinToCyrillic(out) : out
}
