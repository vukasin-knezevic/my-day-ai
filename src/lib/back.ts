// Smart "Back". One function decides what Back means right now (Android button and gesture, the
// swipe from the left edge on iPhone, the arrow in the header). The first rule that applies wins:
//   1. an open panel, picker, dialog -> close it
//   2. a form with unsaved changes   -> "Discard changes?"
//   3. a detail                      -> back to its list
//   4. a sub-tab                     -> the first tab of that section
//   5. the screen is scrolled down   -> smoothly to the top
//   6. another section               -> smoothly to Today
//   7. Today, at the top             -> "Leave the app?"
import { useEffect, useRef } from 'react'
import { create } from 'zustand'

export type BackLevel = 'overlay' | 'dirty' | 'detail' | 'tab'
export type BackStep = BackLevel | 'scroll' | 'home' | 'exit' | 'none'

const ORDER: BackLevel[] = ['overlay', 'dirty', 'detail', 'tab']

interface Handler {
  level: BackLevel
  run: () => void
}
const handlers: Handler[] = []

/** Registers what Back does while something is open. Returns the function that removes it. */
export function registerBack(level: BackLevel, run: () => void): () => void {
  const h = { level, run }
  handlers.push(h)
  return () => {
    const i = handlers.indexOf(h)
    if (i >= 0) handlers.splice(i, 1)
  }
}

/** Is anything of this level open? (Keyboard shortcuts stay quiet under a dialog.) */
export const hasBack = (level: BackLevel) => handlers.some((h) => h.level === level)

/** While `active`, Back runs `run` (the latest registered of a level wins). */
export function useBackHandler(level: BackLevel, active: boolean, run: () => void) {
  const ref = useRef(run)
  ref.current = run
  useEffect(() => {
    if (!active) return
    return registerBack(level, () => ref.current())
  }, [level, active])
}

interface PromptState {
  /** The question on screen. */
  prompt: { kind: 'discard'; discard: () => void } | { kind: 'exit' } | null
  ask: (p: NonNullable<PromptState['prompt']>) => void
  close: () => void
}
export const useBackPrompt = create<PromptState>()((set) => ({
  prompt: null,
  ask: (prompt) => set({ prompt }),
  close: () => set({ prompt: null }),
}))

/** A form with unsaved changes: Back asks before throwing them away. */
export function useDirtyBack(dirty: boolean, discard: () => void) {
  useBackHandler('dirty', dirty, () => useBackPrompt.getState().ask({ kind: 'discard', discard }))
}

/** What `handleBack` needs to know about the app; separate so every step can be tested. */
export interface BackEnv {
  scrollY: () => number
  scrollTop: () => void
  /** Is the Today screen showing? */
  atHome: () => boolean
  goHome: () => void
  /** Leaving is possible only for the system Back (Android); the iPhone swipe just stops at Today. */
  canExit: boolean
}

export function handleBack(env: BackEnv): BackStep {
  const prompts = useBackPrompt.getState()
  // a question is already on screen: Back means "no"
  if (prompts.prompt) {
    prompts.close()
    return 'overlay'
  }
  for (const level of ORDER) {
    const h = [...handlers].reverse().find((x) => x.level === level)
    if (h) {
      h.run()
      return level
    }
  }
  if (env.scrollY() > 0) {
    env.scrollTop()
    return 'scroll'
  }
  if (!env.atHome()) {
    env.goHome()
    return 'home'
  }
  if (!env.canExit) return 'none'
  prompts.ask({ kind: 'exit' })
  return 'exit'
}

/** A swipe that starts at the left edge and goes right is "Back" (iPhone has no Back button). */
export const EDGE_PX = 24
export function isEdgeBackSwipe(startX: number, dx: number, dy: number): boolean {
  return startX <= EDGE_PX && dx >= 70 && Math.abs(dy) < dx / 2
}

/** Test helper: forget everything registered. */
export function resetBack() {
  handlers.length = 0
  useBackPrompt.getState().close()
}
