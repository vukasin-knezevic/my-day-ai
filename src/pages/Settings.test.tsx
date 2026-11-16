import { beforeEach, expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

test('0.6: AI alati su podrazumevano sakriveni, prekidač ih prikazuje', async () => {
  const user = userEvent.setup()
  show()
  expect(screen.queryByText('🤖 AI')).toBeNull()
  expect(screen.queryByPlaceholderText('sk-ant-…')).toBeNull()
  expect(screen.queryByTestId('ai-usage')).toBeNull()
  await user.click(screen.getByLabelText('AI alati (napredno)'))
  expect(useStore.getState().settings.aiEnabled).toBe(true)
  expect(screen.getByText('🤖 AI')).toBeInTheDocument()
  // the key field is only for the API mode
  expect(screen.queryByPlaceholderText('sk-ant-…')).toBeNull()
  useStore.getState().setSettings({ aiMode: 'api' })
  expect(await screen.findByPlaceholderText('sk-ant-…')).toBeInTheDocument()
})
