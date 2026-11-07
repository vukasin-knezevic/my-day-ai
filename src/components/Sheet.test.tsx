import { act, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import Sheet from './Sheet'

class FakePointerEvent extends MouseEvent {
  pointerId = 1
  pointerType = 'touch'
}

function Demo({ onClosed }: { onClosed: () => void }) {
  const [open, setOpen] = useState(true)
  return (
    <Sheet
      open={open}
      onClose={() => {
        setOpen(false)
        onClosed()
      }}
      title="Panel"
    >
      <p>sadržaj</p>
    </Sheet>
  )
}

let now = 0
beforeEach(() => {
  vi.stubGlobal('PointerEvent', FakePointerEvent)
  vi.spyOn(performance, 'now').mockImplementation(() => now)
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(400)
  now = 0
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function drag(to: number, ms: number) {
  const grab = screen.getByTestId('sheet-grab')
  fireEvent(grab, new PointerEvent('pointerdown', { clientY: 100, bubbles: true }))
  now += ms
  fireEvent(grab, new PointerEvent('pointermove', { clientY: 100 + to, bubbles: true }))
  fireEvent(grab, new PointerEvent('pointerup', { clientY: 100 + to, bubbles: true }))
}

test('panel prati prst, a pušten ispod praga se vraća', () => {
  const closed = vi.fn()
  render(<Demo onClosed={closed} />)
  const panel = screen.getByRole('dialog')
  const grab = screen.getByTestId('sheet-grab')
  fireEvent(grab, new PointerEvent('pointerdown', { clientY: 100, bubbles: true }))
  now += 1000
  fireEvent(grab, new PointerEvent('pointermove', { clientY: 170, bubbles: true }))
  expect(panel.style.transform).toBe('translateY(70px)')
  fireEvent(grab, new PointerEvent('pointerup', { clientY: 170, bubbles: true }))
  expect(panel.style.transform).toBe('translateY(0px)')
  expect(closed).not.toHaveBeenCalled()
})

test('prevlačenje preko 30% visine zatvara panel', () => {
  const closed = vi.fn()
  render(<Demo onClosed={closed} />)
  drag(150, 1000)
  expect(closed).toHaveBeenCalledTimes(1)
  expect(screen.getByRole('dialog').style.transform).toBe('translateY(400px)')
})

test('brz pokret nadole zatvara i ispod praga', () => {
  const closed = vi.fn()
  render(<Demo onClosed={closed} />)
  drag(60, 50)
  expect(closed).toHaveBeenCalledTimes(1)
})

test('skrol stranice je zaključan dok je panel otvoren; Esc zatvara', () => {
  const closed = vi.fn()
  render(<Demo onClosed={closed} />)
  expect(document.body.style.overflow).toBe('hidden')
  act(() => {
    fireEvent.keyDown(document, { key: 'Escape' })
  })
  expect(closed).toHaveBeenCalled()
})

test('tap na pozadinu zatvara', () => {
  const closed = vi.fn()
  render(<Demo onClosed={closed} />)
  fireEvent.click(screen.getByTestId('sheet-backdrop'))
  expect(closed).toHaveBeenCalled()
})
