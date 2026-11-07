// How the app addresses the user: in Serbian with the vocative ("Vukašine"), elsewhere by name.
import type { Settings } from '../types'
import { getLanguage } from '../i18n'
import { vocative } from './vocative'

export const isSerbian = (code: string = getLanguage()) => code.startsWith('sr')

/** The name to use when speaking to the user: their own correction, else the vocative (Serbian) or the name. */
export function addressName(settings: Pick<Settings, 'name' | 'addressName'>): string {
  const own = settings.addressName.trim()
  if (own) return own
  const name = settings.name.trim()
  return isSerbian() ? vocative(name) : name
}
