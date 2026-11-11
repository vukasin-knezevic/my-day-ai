// The guided tour: a short walk through the real screens. The sample things it creates are removed at
// the end (together with the XP they paid).
import { create } from 'zustand'
import { minToTime, timeToMin, todayStr } from './dates'
import { useStore } from '../store'
import { t } from '../i18n'

export interface TourStep {
  id: string
  route: string
  title: Parameters<typeof t>[0]
  text: Parameters<typeof t>[0]
  /** What the user does in this step (the button of the card), if anything */
  action?: 'addTask' | 'tickTask' | 'addSubject'
}

export const TOUR_STEPS: TourStep[] = [
  { id: 'today', route: '/', title: 'tour.today.title', text: 'tour.today.text' },
  { id: 'add', route: '/', title: 'tour.add.title', text: 'tour.add.text', action: 'addTask' },
  { id: 'tick', route: '/', title: 'tour.tick.title', text: 'tour.tick.text', action: 'tickTask' },
  {
    id: 'study',
    route: '/study',
    title: 'tour.study.title',
    text: 'tour.study.text',
    action: 'addSubject',
  },
  { id: 'workout', route: '/workout', title: 'tour.workout.title', text: 'tour.workout.text' },
  { id: 'life', route: '/zivot', title: 'tour.life.title', text: 'tour.life.text' },
  { id: 'routine', route: '/', title: 'tour.routine.title', text: 'tour.routine.text' },
  { id: 'ai', route: '/ai', title: 'tour.ai.title', text: 'tour.ai.text' },
  {
    id: 'settings',
    route: '/settings',
    title: 'tour.settings.title',
    text: 'tour.settings.text',
  },
]

interface TourState {
  started: boolean
  step: number
  start: () => void
  go: (n: number) => void
  stop: () => void
}
export const useTour = create<TourState>()((set) => ({
  started: false,
  step: 0,
  start: () => set({ started: true, step: 0 }),
  go: (step) => set({ step }),
  stop: () => set({ started: false, step: 0 }),
}))

const MARK = '__tour__'

/** The sample task of the tour (a study block, so it pays XP when ticked). */
export function addSampleTask(): string {
  const st = useStore.getState()
  const existing = st.activities.find((a) => a.note === MARK)
  if (existing) return existing.id
  const now = new Date()
  const start = minToTime(
    Math.min(timeToMin(`${String(now.getHours()).padStart(2, '0')}:00`) + 60, 22 * 60),
  )
  return st.add('activities', {
    title: t('tour.sample'),
    category: 'study',
    date: todayStr(),
    start,
    end: minToTime(timeToMin(start) + 30),
    recurrence: 'none',
    status: 'planned',
    source: 'me',
    note: MARK,
  })
}

export function tickSampleTask() {
  const st = useStore.getState()
  const a = st.activities.find((x) => x.note === MARK)
  if (!a || a.status === 'done') return
  st.update('activities', a.id, { status: 'done' })
  st.award({
    id: `act-${a.id}-${a.date}`,
    date: a.date,
    reason: a.title,
    xp: 10,
    category: 'study',
  })
}

export const sampleTaskDone = () =>
  useStore.getState().activities.some((a) => a.note === MARK && a.status === 'done')
export const hasSampleTask = () => useStore.getState().activities.some((a) => a.note === MARK)

export function addSampleSubject() {
  const st = useStore.getState()
  if (st.subjects.some((s) => s.demo && s.name === t('tour.sampleSubject'))) return
  st.add('subjects', {
    name: t('tour.sampleSubject'),
    color: '#2563eb',
    espb: 6,
    passMark: 51,
    slots: [],
    demo: true,
  })
}
export const hasSampleSubject = () =>
  useStore.getState().subjects.some((s) => s.demo && s.name === t('tour.sampleSubject'))

/** Removes everything the tour made, with the XP it paid. */
export function cleanUpTour() {
  const st = useStore.getState()
  for (const a of st.activities.filter((x) => x.note === MARK)) st.remove('activities', a.id)
  for (const s of st.subjects.filter((x) => x.demo && x.name === t('tour.sampleSubject')))
    st.removeSubject(s.id)
}
