import { create } from 'zustand'

interface ToastState {
  messages: string[]
  push: (msgs: string[]) => void
  clear: () => void
}

let timer: ReturnType<typeof setTimeout> | undefined

/** Small celebration messages (XP, records, streaks). Disappear after a few seconds. */
export const useToast = create<ToastState>()((set) => ({
  messages: [],
  push: (msgs) => {
    if (!msgs.length) return
    set({ messages: msgs })
    clearTimeout(timer)
    timer = setTimeout(() => set({ messages: [] }), 4500)
  },
  clear: () => set({ messages: [] }),
}))
