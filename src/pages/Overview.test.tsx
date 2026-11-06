import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Overview from './Overview'
import { useStore } from '../store'
import { emptyData } from '../lib/defaults'

beforeEach(() => {
  useStore.setState({ ...emptyData(), hydrated: true })
})

test('pregled nedelje i meseca se prikazuje i na praznim podacima', async () => {
  const user = userEvent.setup()
  render(<Overview />)
  expect(screen.getByText('Treninzi')).toBeInTheDocument()
  expect(screen.queryByText('Poeni po predmetima')).not.toBeInTheDocument()
  await user.click(screen.getByRole('tab', { name: 'Mesec' }))
  expect(screen.getByText('Poeni po predmetima')).toBeInTheDocument()
})
