import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Workout from './Workout'
import { useStore } from '../store'
import { emptyData } from '../lib/defaults'
import { pick } from '../test/pick'

beforeEach(() => {
  useStore.setState({ ...emptyData(), hydrated: true })
})

async function schedule(user: ReturnType<typeof userEvent.setup>, kg: string) {
  await user.click(screen.getByRole('button', { name: '+ Dodaj trening' }))
  await user.click(screen.getByRole('button', { name: '+ Dodaj vežbu' }))
  await user.type(screen.getByLabelText('Vežba 1'), 'Bench press')
  const w = screen.getByLabelText('Kilaža 1')
  await user.clear(w)
  await user.type(w, kg)
  await user.click(screen.getByRole('button', { name: 'Zakaži trening' }))
}
async function finish(user: ReturnType<typeof userEvent.setup>, index: number) {
  await user.click(screen.getAllByRole('button', { name: 'Urađeno' })[index])
  await user.click(screen.getByRole('button', { name: 'Sačuvaj trening' }))
}

test('trening se zakaže, pa se označi urađenim; drugi sa većom kilažom javlja rekord', async () => {
  const user = userEvent.setup()
  render(<Workout />)
  await schedule(user, '60')
  expect(screen.getByRole('status')).toHaveTextContent('Trening je zakazan')
  let st = useStore.getState()
  expect(st.activities).toHaveLength(1)
  expect(st.activities[0]).toMatchObject({ category: 'workout', status: 'planned' })
  expect(st.workouts[0]).toMatchObject({ planned: true, activityId: st.activities[0].id })
  expect(st.progress.xp).toBe(0)

  await finish(user, 0)
  expect(screen.getByRole('status')).toHaveTextContent('Trening sačuvan')
  st = useStore.getState()
  expect(st.activities[0].status).toBe('done')
  expect(st.workouts).toHaveLength(1)
  expect(st.workouts[0].planned).toBe(false)
  const xp = st.progress.xp
  expect(xp).toBeGreaterThan(0)

  await schedule(user, '70')
  await finish(user, 0)
  expect(screen.getByRole('status')).toHaveTextContent('Novi rekord')
  expect(useStore.getState().workouts).toHaveLength(2)
})

test('trening bez vežbi se zakaže, a XP daje tek kad je urađen (jednom)', async () => {
  const user = userEvent.setup()
  render(<Workout />)
  await user.click(screen.getByRole('button', { name: '+ Dodaj trening' }))
  await user.click(screen.getByRole('button', { name: 'Zakaži trening' }))
  expect(useStore.getState().workouts).toHaveLength(0)
  expect(useStore.getState().progress.xp).toBe(0)
  await finish(user, 0)
  const xp = useStore.getState().progress.xp
  expect(xp).toBeGreaterThan(0)
  await user.click(screen.getByRole('button', { name: 'Nije urađeno' }))
  expect(useStore.getState().progress.xp).toBe(0)
})

test('obrok povećava protein', async () => {
  const user = userEvent.setup()
  render(<Workout />)
  await user.click(screen.getByRole('tab', { name: 'Ishrana' }))
  await user.type(screen.getByLabelText('Obrok'), 'Jaja')
  await user.click(screen.getByRole('button', { name: 'Dodaj obrok' }))
  expect(useStore.getState().meals[0]).toMatchObject({ description: 'Jaja', protein: 30 })
})

test('sopstveni šablon treninga: sačuvaj i učitaj', async () => {
  const user = userEvent.setup()
  render(<Workout />)
  const open = () => user.click(screen.getByRole('button', { name: '+ Dodaj trening' }))
  await open()
  await user.type(screen.getByLabelText('Naziv'), 'Push dan')
  await user.click(screen.getByRole('button', { name: '+ Dodaj vežbu' }))
  await user.type(screen.getByLabelText('Vežba 1'), 'Bench press')
  await user.click(screen.getByRole('button', { name: /Sačuvaj kao šablon/ }))
  const tpl = useStore.getState().workoutTemplates
  expect(tpl).toHaveLength(1)
  expect(tpl[0]).toMatchObject({ name: 'Push dan' })
  await user.click(screen.getByRole('button', { name: 'Ukloni vežbu 1' }))
  await pick(user, 'Moji šabloni', tpl[0].id)
  expect(screen.getByLabelText('Vežba 1')).toHaveValue('Bench press')
  await user.clear(screen.getByLabelText('Naziv'))
  await user.type(screen.getByLabelText('Naziv'), 'Pull dan')
  await user.click(screen.getByRole('button', { name: /Preimenuj šablon/ }))
  expect(useStore.getState().workoutTemplates[0].name).toBe('Pull dan')
  await user.click(screen.getByRole('button', { name: 'Obriši izabrani šablon' }))
  expect(useStore.getState().workoutTemplates).toHaveLength(0)
})

test('gotov split: "Koristi ovaj plan" pravi nedeljne treninge, "Prekini plan" ih zaustavlja', async () => {
  const user = userEvent.setup()
  render(<Workout />)
  await user.click(screen.getByRole('tab', { name: 'Plan' }))
  await user.click(screen.getByRole('button', { name: '4× Gornji / donji' }))
  expect(useStore.getState().activities).toHaveLength(0)
  await user.click(screen.getByRole('button', { name: 'Koristi ovaj plan' }))
  await user.click(screen.getByRole('button', { name: 'Pokreni plan' }))
  let st = useStore.getState()
  expect(st.workoutPlan?.days).toHaveLength(4)
  expect(st.activities).toHaveLength(4)
  expect(st.activities.every((a) => a.recurrence === 'weekly' && a.planDay)).toBe(true)
  expect(screen.getByText('✓ Aktivan')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Prekini plan' }))
  st = useStore.getState()
  expect(st.activities).toHaveLength(0) // none of them had started yet
  expect(st.workoutPlan?.schedule).toBeUndefined()
})
