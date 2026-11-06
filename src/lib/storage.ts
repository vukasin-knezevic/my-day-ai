import { get, set, del } from 'idb-keyval'
import type { StateStorage } from 'zustand/middleware'

/** IndexedDB storage for zustand persist. Every call is in try/catch so the app still works without it. */
export const idbStorage: StateStorage = {
  getItem: async (name) => {
    try {
      return (await get<string>(name)) ?? null
    } catch (e) {
      console.warn('IndexedDB read failed', e)
      return null
    }
  },
  setItem: async (name, value) => {
    try {
      await set(name, value)
    } catch (e) {
      console.warn('IndexedDB write failed', e)
    }
  },
  removeItem: async (name) => {
    try {
      await del(name)
    } catch (e) {
      console.warn('IndexedDB delete failed', e)
    }
  },
}
