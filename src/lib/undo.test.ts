import { beforeEach, expect, test, vi } from 'vitest'
import { deleteWithUndo, UNDO_MS, useUndo } from './undo'
import { useStore } from '../store'
import { emptyData } from './defaults'

beforeEach(() => {
  vi.useRealTimers()
  useStore.setState({ ...emptyData() })
  useUndo.getState().dismiss()
})

const addActivity = (title: string) =>
  useStore.getState().add('activities', {
    title,
    category: 'study',
    date: '2026-11-10',
    start: '10:00',
    end: '11:00',
    status: 'done',
  } as never)

test('A-07: undo brings back the item at its place and the XP it had paid', () => {
  const a = addActivity('prva')
  const b = addActivity('druga')
  addActivity('treća')
  useStore.getState().award({
    id: `act-${b}-2026-11-10`,
    date: '2026-11-10',
    reason: 'x',
    xp: 20,
    category: 'study',
    rewardMin: 15,
  } as never)
  const xp = useStore.getState().progress.xp
  expect(xp).toBeGreaterThan(0)

  deleteWithUndo(() => useStore.getState().remove('activities', b))
  expect(useStore.getState().activities.map((x) => x.id)).not.toContain(b)
  expect(useStore.getState().progress.xp).toBe(0)
  expect(useUndo.getState().pending).not.toBeNull()

  // something else changes meanwhile: it must survive the undo
  useStore.getState().update('activities', a, { title: 'prva izmenjena' })
  useUndo.getState().undo()

  const s = useStore.getState()
  expect(s.activities.map((x) => x.title)).toEqual(['prva izmenjena', 'druga', 'treća'])
  expect(s.progress.xp).toBe(xp)
  expect(s.progress.rewardEarnedMin).toBe(15)
  expect(s.progress.awarded).toContain(`act-${b}-2026-11-10`)
  expect(useUndo.getState().pending).toBeNull()
})

test('A-07: a subject comes back together with its assessments', () => {
  const s = useStore.getState()
  const sub = s.add('subjects', { name: 'Mata', color: '#000', espb: 6, passMark: 51, slots: [] })
  s.add('assessments', { subjectId: sub, title: 'K1' } as never)
  deleteWithUndo(() => useStore.getState().removeSubject(sub))
  expect(useStore.getState().assessments).toHaveLength(0)
  useUndo.getState().undo()
  expect(useStore.getState().subjects).toHaveLength(1)
  expect(useStore.getState().assessments).toHaveLength(1)
})

test('A-07: the offer goes away after 6 s; deleting nothing offers nothing', () => {
  vi.useFakeTimers()
  deleteWithUndo(() => {})
  expect(useUndo.getState().pending).toBeNull()
  const a = addActivity('x')
  deleteWithUndo(() => useStore.getState().remove('activities', a))
  vi.advanceTimersByTime(UNDO_MS - 1)
  expect(useUndo.getState().pending).not.toBeNull()
  vi.advanceTimersByTime(2)
  expect(useUndo.getState().pending).toBeNull()
})
