import { render, screen } from '@testing-library/react'
import ErrorBoundary from './ErrorBoundary'

function Broken(): never {
  throw new Error('boom')
}

test('a crashed screen shows a way out instead of a blank page', () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  render(
    <ErrorBoundary>
      <Broken />
    </ErrorBoundary>,
  )
  expect(screen.getByRole('heading', { name: 'Nešto je pošlo naopako' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Učitaj ponovo' })).toBeInTheDocument()
})

test('without a crash it shows its children', () => {
  render(
    <ErrorBoundary>
      <p>radi</p>
    </ErrorBoundary>,
  )
  expect(screen.getByText('radi')).toBeInTheDocument()
})
