import { beforeEach, expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Settings from './Settings'
import { useStore } from '../store'
import { emptyData } from '../lib/defaults'

beforeEach(() => {
  const d = emptyData()
  useStore.setState({ ...d, settings: { ...d.settings, onboarded: true }, hydrated: true })
})

const show = () =>
  render(
    <MemoryRouter>
      <Settings />
    </MemoryRouter>,
  )

test('R-10: prazno „Kako ti se obraćam“ je unapred popunjeno predlogom vokativa', () => {
  useStore.getState().setSettings({ name: 'Vukašin', addressName: '' })
  show()
  expect(useStore.getState().settings.addressName).toBe('Vukašine')
  expect(screen.getByDisplayValue('Vukašine')).toBeInTheDocument()
})

test('R-10: ono što je korisnik sam upisao se ne dira', () => {
  useStore.getState().setSettings({ name: 'Vukašin', addressName: 'Vule' })
  show()
  expect(useStore.getState().settings.addressName).toBe('Vule')
})
