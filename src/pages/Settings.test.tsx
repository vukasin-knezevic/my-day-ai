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

test('0.4.3: Podešavanja pitaju samo za ime, bez polja za vokativ', () => {
  useStore.getState().setSettings({ name: 'Vukašin' })
  show()
  // the name stays exactly as typed (nominative); there is no second "how do I address you" field
  expect(screen.getByDisplayValue('Vukašin')).toBeInTheDocument()
  expect(screen.queryByDisplayValue('Vukašine')).toBeNull()
  expect(screen.queryByLabelText(/obraćam/i)).toBeNull()
})
