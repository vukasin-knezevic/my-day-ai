import { beforeEach, expect, test, vi } from 'vitest'
import {
  handleBack,
  hasBack,
  isEdgeBackSwipe,
  registerBack,
  resetBack,
  useBackPrompt,
  type BackEnv,
} from './back'

beforeEach(resetBack)

const env = (over: Partial<BackEnv> = {}): BackEnv => ({
  scrollY: () => 0,
  scrollTop: vi.fn(),
  atHome: () => true,
  goHome: vi.fn(),
  canExit: true,
  ...over,
})

test('1. an open panel is closed first, the latest one before the older', () => {
  const first = vi.fn()
  const second = vi.fn()
  registerBack('overlay', first)
  const off = registerBack('overlay', second)
  registerBack('tab', vi.fn())
  expect(handleBack(env({ scrollY: () => 300 }))).toBe('overlay')
  expect(second).toHaveBeenCalledTimes(1)
  expect(first).not.toHaveBeenCalled()
  off()
  expect(handleBack(env())).toBe('overlay')
  expect(first).toHaveBeenCalledTimes(1)
})

test('2. a form with changes asks "Discard changes?"; Back again means no', () => {
  const discard = vi.fn()
  registerBack('dirty', () => useBackPrompt.getState().ask({ kind: 'discard', discard }))
  registerBack('detail', vi.fn())
  expect(handleBack(env())).toBe('dirty')
  expect(useBackPrompt.getState().prompt?.kind).toBe('discard')
  expect(discard).not.toHaveBeenCalled()
  expect(handleBack(env())).toBe('overlay')
  expect(useBackPrompt.getState().prompt).toBeNull()
})

test('3. a detail goes back to its list before 4. a sub-tab goes to the first tab', () => {
  const detail = vi.fn()
  const tab = vi.fn()
  registerBack('tab', tab)
  const off = registerBack('detail', detail)
  expect(handleBack(env())).toBe('detail')
  expect(tab).not.toHaveBeenCalled()
  off()
  expect(handleBack(env())).toBe('tab')
  expect(tab).toHaveBeenCalled()
})

test('5. a scrolled screen goes to the top', () => {
  const e = env({ scrollY: () => 120, atHome: () => false })
  expect(handleBack(e)).toBe('scroll')
  expect(e.scrollTop).toHaveBeenCalled()
  expect(e.goHome).not.toHaveBeenCalled()
})

test('6. another section goes to Today', () => {
  const e = env({ atHome: () => false })
  expect(handleBack(e)).toBe('home')
  expect(e.goHome).toHaveBeenCalled()
})

test('7. Today at the top asks "Leave the app?"; the iPhone swipe just stops', () => {
  expect(handleBack(env())).toBe('exit')
  expect(useBackPrompt.getState().prompt).toEqual({ kind: 'exit' })
  resetBack()
  expect(handleBack(env({ canExit: false }))).toBe('none')
  expect(useBackPrompt.getState().prompt).toBeNull()
})

test('hasBack tells whether a dialog is open', () => {
  expect(hasBack('overlay')).toBe(false)
  const off = registerBack('overlay', vi.fn())
  expect(hasBack('overlay')).toBe(true)
  off()
  expect(hasBack('overlay')).toBe(false)
})

test('edge swipe: from the left edge, to the right, mostly sideways', () => {
  expect(isEdgeBackSwipe(10, 90, 10)).toBe(true)
  expect(isEdgeBackSwipe(60, 90, 10)).toBe(false)
  expect(isEdgeBackSwipe(10, 40, 0)).toBe(false)
  expect(isEdgeBackSwipe(10, 90, 80)).toBe(false)
})
