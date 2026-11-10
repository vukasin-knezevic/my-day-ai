import { get, set, del } from 'idb-keyval'
import type { StateStorage } from 'zustand/middleware'

let writable = false
let pending: Promise<void> = Promise.resolve()

/**
 * Saving is switched on only after the saved data was read successfully. Otherwise a failed read
 * (IndexedDB sometimes drops the connection on iOS) would look like "no data" and overwrite the real data.
 */
export function allowWrites(on = true) {
  writable = on
}

/** Resolves when the write that is on its way (if any) has reached the database. */
export function flushStorage(): Promise<void> {
  return pending
}

/** IndexedDB storage for zustand persist. A failed READ is reported (thrown); failed writes only warn. */
export const idbStorage: StateStorage = {
  getItem: async (name) => (await get<string>(name)) ?? null,
  setItem: (name, value) => {
    if (!writable) return Promise.resolve()
    const write = pending
      .then(() => set(name, value))
      .catch((e: unknown) => console.warn('IndexedDB write failed', e))
    pending = write
    return write
  },
  removeItem: async (name) => {
    try {
      await del(name)
    } catch (e) {
      console.warn('IndexedDB delete failed', e)
    }
  },
}
