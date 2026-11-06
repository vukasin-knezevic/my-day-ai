import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Workout from './Workout'
import { useStore } from '../store'
import { emptyData } from '../lib/defaults'

beforeEach(() => {
  useStore.setState({ ...emptyData(), hydrated: true })
})

test('trening se čuva, a drugi sa većom kilažom javlja rekord', async () => {
  const user = userEvent.setup()
  render(<Workout />)
  const log = async (kg: string) => {
    await user.type(screen.getByLabelText('Vežba 1'), 'Bench press')
    const w = screen.getByLabelText('Kilaža 1')
    await user.clear(w)
    await user.type(w, kg)
    await user.click(screen.getByRole('button', { name: 'Sačuvaj trening' }))
  }
  await log('60')
  expect(screen.getByRole('status')).toHaveTextContent('Trening sačuvan')
  await log('70')
  expect(screen.getByRole('status')).toHaveTextContent('Novi rekord')
  expect(useStore.getState().workouts).toHaveLength(2)
})

test('obrok povećava protein', async () => {
  const user = userEvent.setup()
  render(<Workout />)
  await user.click(screen.getByRole('tab', { name: 'Ishrana' }))
  await user.type(screen.getByLabelText('Obrok'), 'Jaja')
  await user.click(screen.getByRole('button', { name: 'Dodaj obrok' }))
  expect(useStore.getState().meals[0]).toMatchObject({ description: 'Jaja', protein: 30 })
})

test('izbor splita', async () => {
  const user = userEvent.setup()
  render(<Workout />)
  await user.click(screen.getByRole('tab', { name: 'Plan' }))
  await user.click(screen.getByRole('button', { name: '4× Gornji / donji' }))
  expect(useStore.getState().workoutPlan?.days).toHaveLength(4)
})
