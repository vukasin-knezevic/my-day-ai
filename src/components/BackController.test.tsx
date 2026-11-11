import { beforeEach, expect, test } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { HashRouter, Link, Route, Routes } from 'react-router-dom'
import BackController from './BackController'
import Sheet from './Sheet'
import { Tabs } from './ui'
import { resetBack } from '../lib/back'

function Section() {
  const [tab, setTab] = useState<'a' | 'b'>('a')
  const [open, setOpen] = useState(false)
  return (
    <>
      <Tabs
        tabs={[
          ['a', 'Prvi'],
          ['b', 'Drugi'],
        ]}
        active={tab}
        activeClass=""
        onChange={setTab}
      />
      <p>tab {tab}</p>
      <button onClick={() => setOpen(true)}>otvori panel</button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Panel">
        <p>u panelu</p>
      </Sheet>
    </>
  )
}

function Demo() {
  return (
    <HashRouter>
      <BackController />
      <Routes>
        <Route
          path="/"
          element={
            <>
              <p>ekran Danas</p>
              <Link to="/study">na Study</Link>
            </>
          }
        />
        <Route path="/study" element={<Section />} />
      </Routes>
    </HashRouter>
  )
}

/** What the browser does on the system Back: it tells the page afterwards. */
const systemBack = () => act(() => void window.dispatchEvent(new PopStateEvent('popstate')))

beforeEach(async () => {
  window.location.hash = '#/'
  // changing the address fires its own "popstate" a moment later: let it pass before the test
  await new Promise((r) => setTimeout(r, 0))
  resetBack()
})

test('A-13: Nazad zatvara panel, pa vraća na prvi tab, pa na Danas, pa pita za izlazak', async () => {
  const user = userEvent.setup()
  render(<Demo />)
  await user.click(screen.getByRole('link', { name: 'na Study' }))
  await user.click(screen.getByRole('tab', { name: 'Drugi' }))
  await user.click(screen.getByRole('button', { name: 'otvori panel' }))
  expect(screen.getByRole('dialog', { name: 'Panel' })).toBeInTheDocument()

  // 1. the panel closes, the screen and the tab stay
  systemBack()
  expect(screen.getByText('tab b')).toBeInTheDocument()
  expect(screen.getByRole('tab', { name: 'Drugi' })).toHaveAttribute('aria-selected', 'true')

  // 4. the first tab of the section
  systemBack()
  expect(screen.getByText('tab a')).toBeInTheDocument()

  // 6. to Today
  systemBack()
  expect(await screen.findByText('ekran Danas')).toBeInTheDocument()

  // 7. "Leave the app?"; Back again or "Ostani" keeps the app open
  systemBack()
  expect(screen.getByRole('alertdialog', { name: 'Napusti aplikaciju?' })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Ostani' }))
  expect(screen.queryByRole('alertdialog')).toBeNull()
  expect(screen.getByText('ekran Danas')).toBeInTheDocument()
})
