// How the app addresses the user by name. The user types the name once, as they normally write it;
// Serbian grammar (the vocative) is worked out here, every other language uses the name unchanged.
import { vocative } from './vocative'

/** Serbian, Latin or Cyrillic ("sr", "sr-Latn", "sr-Cyrl"). */
export const isSerbian = (locale: string) => locale.toLowerCase().startsWith('sr')

/** The name to put into a greeting, a notification or a share text. Pure. */
export function greetingName(name: string, locale: string): string {
  const clean = name.trim().replace(/\s+/g, ' ')
  return isSerbian(locale) ? vocative(clean) : clean
}
