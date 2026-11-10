// Phase G: focus stays in panels, habit steps and editing, all expenses with a date, any number of reward
// minutes, the Overview separates done from planned, AI import kinds, the day change on open screens.
import { act, render, renderHook, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import Sheet, { trapTab } from './Sheet'
import ProgressCard from './ProgressCard'
import Life from '../pages/Life'
import { useStore } from '../store'
import { emptyData } from '../lib/defaults'
import { habitStep } from '../lib/life'
import { overview } from '../lib/overview'
import { applyAiResult } from '../lib/ai/apply'
import { useToday } from '../lib/useToday'
import { addDaysStr } from '../lib/dates'
import type { AppData } from '../types'

const st = () => useStore.getState()
beforeEach(() => {
  const d = emptyData()
  useStore.setState({ ...d, settings: { ...d.settings, onboarded: true }, hydrated: true })
})

describe('A-18 focus in panels', () => {
  function Demo() {
    const [open, setOpen] = useState(true)
    return (
      <div id="root">
        <button>behind</button>
        <Sheet open={open} onClose={() => setOpen(false)} title="Panel">
          <button>first</button>
          <button>last</button>
        </Sheet>
      </div>
    )
  }

  test('Tab wraps around inside the panel, and the page behind is inert while it is open', async () => {
    const user = userEvent.setup()
    render(<Demo />)
    const panel = screen.getByRole('dialog')
    expect(document.getElementById('root')).toHaveAttribute('inert')
    const last = within(panel).getByRole('button', { name: 'last' })
    last.focus()
    await user.tab()
    // after the last one comes the first focusable one again, not the page behind
    expect(panel.contains(document.activeElement)).toBe(true)
    expect(document.activeElement).not.toBe(screen.getByText('behind'))
    await user.keyboard('{Escape}')
    await act(async () => {
      await new Promise((r) => setTimeout(r, 300))
    })
    expect(document.getElementById('root')).not.toHaveAttribute('inert')
  })

  test('trapTab sends Shift+Tab from the first element to the last', () => {
    const panel = document.createElement('div')
    panel.tabIndex = -1
    panel.innerHTML = '<button id="a">a</button><button id="b">b</button>'
    document.body.append(panel)
    ;(panel.querySelector('#a') as HTMLElement).focus()
    const e = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, cancelable: true })
    trapTab(e, panel)
    expect(e.defaultPrevented).toBe(true)
    expect(document.activeElement?.id).toBe('b')
    panel.remove()
  })
})

describe('A-29 habits', () => {
  test('the step follows the goal and the unit', () => {
    expect(habitStep(2, 'l')).toBe(0.5)
    expect(habitStep(2, 'litara')).toBe(0.5)
    expect(habitStep(1, '')).toBe(1)
    expect(habitStep(8, 'čaša')).toBe(1)
    expect(habitStep(30, 'min')).toBe(5)
    expect(habitStep(10000, 'koraka')).toBe(10)
    expect(habitStep(2.5, 'l')).toBe(0.5)
  })

  test('a habit can be edited (name, emoji, goal, unit)', async () => {
    const user = userEvent.setup()
    st().add('habits', { name: 'Voda', emoji: '💧', goal: 2, unit: 'l', entries: {} })
    render(<Life />)
    await user.click(screen.getByRole('tab', { name: /Navike/ }))
    await user.click(screen.getByRole('button', { name: 'Izmeni naviku Voda' }))
    const dialog = screen.getByRole('dialog')
    const name = within(dialog).getByLabelText(/Naziv/)
    await user.clear(name)
    await user.type(name, 'Čaše vode')
    await user.click(within(dialog).getByRole('button', { name: 'Sačuvaj izmene' }))
    expect(st().habits[0]).toMatchObject({ name: 'Čaše vode', goal: 2, unit: 'l' })
  })

  test('the day moves on by itself for a screen left open (A-29)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-10T23:59:00'))
    const { result } = renderHook(() => useToday())
    expect(result.current).toBe('2026-11-10')
    act(() => {
      vi.setSystemTime(new Date('2026-11-11T00:01:00'))
      vi.advanceTimersByTime(31_000)
    })
    expect(result.current).toBe('2026-11-11')
    vi.useRealTimers()
  })
})

describe('A-30 expenses', () => {
  test('an expense can have another date, and all of them can be shown', async () => {
    const user = userEvent.setup()
    for (let i = 0; i < 20; i++)
      st().add('expenses', {
        date: addDaysStr('2026-10-01', i),
        amount: 100 + i,
        category: 'hrana',
        description: `trošak ${i}`,
      })
    render(<Life />)
    await user.click(screen.getByRole('tab', { name: /Novac|Troškovi/ }))
    expect(screen.getAllByRole('button', { name: /Obriši trošak|Obriši/ }).length).toBeGreaterThan(
      0,
    )
    expect(screen.getByText(/trošak 19/)).toBeInTheDocument()
    expect(screen.queryByText(/trošak 2$/)).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Prikaži sve (20)' }))
    expect(screen.getByText(/trošak 2$/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Prikaži manje' }))
    expect(screen.queryByText(/trošak 2$/)).toBeNull()
  })
})

describe('A-28 reward minutes', () => {
  test('any number of minutes up to the balance can be used, with undo', async () => {
    const user = userEvent.setup()
    useStore.setState({ progress: { ...st().progress, rewardEarnedMin: 45 } })
    render(<ProgressCard />)
    expect(screen.getByRole('button', { name: 'Iskoristio 60 min' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Drugo…' }))
    const field = screen.getByLabelText(/Minuti \(najviše 45\)/)
    await user.clear(field)
    await user.type(field, '12')
    await user.click(screen.getByRole('button', { name: 'Iskoristi' }))
    expect(st().progress.rewardSpentMin).toBe(12)
    await user.click(screen.getByRole('button', { name: 'Poništi' }))
    expect(st().progress.rewardSpentMin).toBe(0)
  })
})

describe('A-25 Overview: done is not planned', () => {
  test('study hours and workouts say what is done and what is still planned', () => {
    const d: AppData = emptyData()
    const day = '2026-11-10'
    d.activities = [
      {
        id: 'a',
        title: 'Učenje',
        category: 'study',
        date: day,
        start: '10:00',
        end: '12:00',
        recurrence: 'none',
        status: 'done',
        source: 'me',
      },
      {
        id: 'b',
        title: 'Učenje 2',
        category: 'study',
        date: day,
        start: '14:00',
        end: '15:00',
        recurrence: 'none',
        status: 'planned',
        source: 'me',
      },
      {
        id: 'c',
        title: 'Trening',
        category: 'workout',
        date: day,
        start: '18:00',
        end: '19:00',
        recurrence: 'none',
        status: 'planned',
        source: 'me',
      },
      {
        id: 'e',
        title: 'Trening 2',
        category: 'workout',
        date: day,
        start: '20:00',
        end: '21:00',
        recurrence: 'none',
        status: 'done',
        source: 'me',
      },
    ]
    const o = overview(d, 'week', day)
    expect(o.studyHours).toMatchObject({ done: 2, planned: 1 })
    expect(o.workouts).toMatchObject({ done: 1, planned: 1 })
  })
})

describe('A-26 AI import kinds', () => {
  test('"domaci" gets a proper name and an unknown kind becomes one of the user’s kinds', () => {
    const s = st()
    const out = applyAiResult(
      'uvoz',
      {
        assessments: [
          { subject: 'Fizika', type: 'domaci', title: 'Zadatak 1', date: '2026-11-20' },
          { subject: 'Fizika', type: 'Seminarski', title: 'Rad', date: '2026-11-25' },
          { subject: 'Fizika', type: 'ispit', title: 'Ispit', date: '2026-12-20' },
        ],
      },
      s,
    )
    expect(out).toBeTruthy()
    const types = useStore.getState().assessments.map((a) => a.type)
    expect(types).toEqual(['Domaći', 'Seminarski', 'ispit'])
    expect(useStore.getState().settings.customAssessmentKinds).toEqual(['Domaći', 'Seminarski'])
    // only exams need a registration
    expect(useStore.getState().assessments.map((a) => a.registration)).toEqual([
      'ne-treba',
      'ne-treba',
      'nije-prijavljen',
    ])
  })
})
