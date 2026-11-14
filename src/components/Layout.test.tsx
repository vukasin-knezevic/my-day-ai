import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import Layout, { SECTIONS, SETTINGS } from './Layout'
import { useStore } from '../store'
import { emptyData } from '../lib/defaults'

beforeEach(() => {
  const d = emptyData()
  useStore.setState({
    ...d,
    settings: { ...d.settings, onboarded: true, tutorialDone: true },
    hydrated: true,
  })
})

const show = (path = '/') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="*" element={<p>screen</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )

describe('bottom navigation', () => {
  test('all sections are in one scrollable strip, there is no "More"', () => {
    show()
    const bar = screen.getByRole('navigation', { name: 'Donja navigacija' })
    const strip = bar.querySelector('[data-nav-strip]') as HTMLElement
    expect(strip).toBeTruthy()
    expect(within(strip).getAllByRole('link')).toHaveLength(SECTIONS.length)
    for (const s of SECTIONS)
      expect(strip.querySelector(`a[href="#${s.to}"], a[href="${s.to}"]`)).toBeTruthy()
    expect(within(bar).queryByText('Više')).toBeNull()
    // each item is a quarter of the strip: four fit at once
    expect(strip.firstElementChild).toHaveClass('w-1/4', 'flex-none', 'snap-start')
    expect(strip).toHaveClass('overflow-x-auto', 'snap-x', 'snap-proximity', 'overscroll-x-contain')
  })

  test('Settings is outside the scroll container, and not inside the strip', () => {
    show()
    const bar = screen.getByRole('navigation', { name: 'Donja navigacija' })
    const strip = bar.querySelector('[data-nav-strip]') as HTMLElement
    const settings = within(bar).getByRole('link', { name: /Podešavanja/ })
    expect(strip.contains(settings)).toBe(false)
    expect(settings.getAttribute('href')).toContain(SETTINGS.to)
    expect(within(strip).queryByText('Podešavanja')).toBeNull()
  })

  test('the active item has aria-current="page"', () => {
    show('/study')
    const bar = screen.getByRole('navigation', { name: 'Donja navigacija' })
    expect(within(bar).getByRole('link', { current: 'page' })).toHaveTextContent('Faks')
  })

  test('the active tab is scrolled into view (instantly the first time)', () => {
    const spy = vi.fn()
    Element.prototype.scrollIntoView = spy
    show('/ai')
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ inline: 'center', behavior: 'auto' }),
    )
  })
})
