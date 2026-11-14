// Phases E and F on screen: the morning routine card, the daily challenge, the week ring, "Close the
// day", the splash screen, the guided tour and the achievements page.
import { MemoryRouter } from 'react-router-dom'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MorningRoutine from './MorningRoutine'
import DailyChallenge from './DailyChallenge'
import WeekRing from './WeekRing'
import CloseDay from './CloseDay'
import Splash from './Splash'
import Tutorial from './Tutorial'
import Achievements from '../pages/Achievements'
import Settings from '../pages/Settings'
import { useStore } from '../store'
import { emptyData } from '../lib/defaults'
import { useTour } from '../lib/tour'
import { CLOSE_XP } from '../lib/closeDay'

const TODAY = '2026-11-10'
const at = (h: number, m = 0) =>
  new Date(`${TODAY}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`)
const st = () => useStore.getState()

beforeEach(() => {
  const d = emptyData()
  useStore.setState({
    ...d,
    settings: {
      ...d.settings,
      onboarded: true,
      tutorialDone: true,
      name: 'Vukašin',
      wakeTime: '08:00',
      bedTime: '00:30',
    },
    hydrated: true,
  })
  useTour.getState().stop()
})

describe('morning routine card', () => {
  test('ticks a step (XP once), shows the progress, and the greeting uses the Serbian vocative worked out from the name', async () => {
    const user = userEvent.setup()
    render(<MorningRoutine now={at(8, 30)} today={TODAY} />)
    expect(screen.getByText(/Dobro jutro, Vukašine!/)).toBeInTheDocument()
    await user.click(screen.getByRole('checkbox', { name: /Namesti krevet/ }))
    expect(st().days[TODAY]?.routine).toEqual([0])
    expect(st().progress.xp).toBe(2)
    expect(screen.getByText('1 od 4 koraka')).toBeInTheDocument()
    await user.click(screen.getByRole('checkbox', { name: /Namesti krevet/ }))
    expect(st().progress.xp).toBe(0)
  })

  test('only the box ticks a step: a tap on the text (e.g. while scrolling) does nothing', async () => {
    const user = userEvent.setup()
    render(<MorningRoutine now={at(8, 30)} today={TODAY} />)
    await user.click(screen.getByText(/Namesti krevet/))
    expect(st().days[TODAY]?.routine ?? []).toEqual([])
    await user.click(screen.getByRole('checkbox', { name: /Namesti krevet/ }))
    expect(st().days[TODAY]?.routine).toEqual([0])
  })

  test('late in the day it offers "Save the day" with two steps, kindly', () => {
    render(<MorningRoutine now={at(14)} today={TODAY} />)
    expect(screen.getByText(/Spasi dan/)).toBeInTheDocument()
    expect(screen.getByText(/Nije kasno, kreni od jednog malog koraka/)).toBeInTheDocument()
    expect(screen.getAllByRole('checkbox')).toHaveLength(2)
  })

  test('is not shown when switched off', () => {
    st().setSettings({ routineOn: false })
    const { container } = render(<MorningRoutine now={at(9)} today={TODAY} />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('daily challenge, ring and closing the day', () => {
  test('a manual challenge is marked done once and pays 15 XP; "give me another" is offered once', async () => {
    const user = userEvent.setup()
    // a day on which the pick is a manual one (no exams, no habits): "study early" is automatic, "bed"/"walk" are manual
    st().setSettings({ language: 'sr-Latn' })
    let day = TODAY
    const { challengeFor } = await import('../lib/challenge')
    for (let i = 0; i < 30; i++) {
      const d = new Date(`${TODAY}T12:00:00`)
      d.setDate(d.getDate() + i)
      const s = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      if (!challengeFor(useStore.getState() as never, s).auto) {
        day = s
        break
      }
    }
    render(<DailyChallenge today={day} />)
    expect(screen.getByRole('button', { name: 'Daj mi drugi' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Izazov ispunjen' }))
    expect(st().days[day]?.challengeDone).toBe(true)
    expect(st().progress.xp).toBe(15)
    expect(screen.queryByRole('button', { name: 'Daj mi drugi' })).toBeNull()
  })

  test('the ring shows the active days of the week and the streak', () => {
    st().setDay('2026-11-09', { routine: [0] })
    st().setDay(TODAY, { routine: [0] })
    render(<WeekRing today={TODAY} />)
    expect(
      screen.getByRole('img', { name: 'Aktivnih dana ove nedelje: 2 od 7' }),
    ).toBeInTheDocument()
    expect(screen.getByText('🔥 2 dana')).toBeInTheDocument()
  })

  test('in the evening a card offers to close the day; three steps close it, pay 10 XP and set tomorrow’s main thing', async () => {
    const user = userEvent.setup()
    st().add('activities', {
      id: 'a1',
      title: 'Čitanje',
      category: 'habits',
      date: TODAY,
      start: '20:00',
      end: '20:30',
      recurrence: 'none',
      status: 'planned',
      source: 'me',
    })
    render(<CloseDay now={at(23)} today={TODAY} />)
    await user.click(screen.getByRole('button', { name: 'Počni' }))
    const panel = screen.getByRole('dialog')
    await user.click(within(panel).getByRole('button', { name: 'Prebaci na sutra' }))
    await user.click(within(panel).getByRole('button', { name: 'Dalje' }))
    await user.click(within(panel).getByRole('radio', { name: '4/5' }))
    await user.click(within(panel).getByRole('button', { name: 'Dalje' }))
    await user.type(within(panel).getByLabelText(/Glavna stvar za sutra/), 'Prijavi kolokvijum')
    await user.click(within(panel).getByRole('button', { name: 'Zatvori dan' }))
    expect(within(panel).getByText(/Dan je zatvoren/)).toBeInTheDocument()
    expect(st().progress.xp).toBe(CLOSE_XP)
    expect(st().days[TODAY]?.closed?.mood).toBe(4)
    expect(st().days['2026-11-11']?.mainThing).toBe('Prijavi kolokvijum')
    expect(st().activities[0].date).toBe('2026-11-11')
  })

  test('during the day it is only a quiet button; a closed day says so', () => {
    const { rerender } = render(<CloseDay now={at(14)} today={TODAY} />)
    expect(screen.getByRole('button', { name: /Zatvori dan/ })).toBeInTheDocument()
    st().setDay(TODAY, { closed: { mood: null, note: '' } })
    rerender(<CloseDay now={at(14)} today={TODAY} />)
    expect(screen.getByText(/Dan je zatvoren/)).toBeInTheDocument()
  })
})

describe('splash', () => {
  test('greets by the vocative of the name and shows the streak; a tap skips it', async () => {
    const user = userEvent.setup()
    const d = new Date()
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    st().setDay(key, { routine: [0] })
    render(<Splash force />)
    expect(screen.getByText('Zdravo, Vukašine')).toBeInTheDocument()
    expect(screen.getByText('🔥 1 dan')).toBeInTheDocument()
    await user.click(screen.getByTestId('splash'))
    expect(screen.queryByTestId('splash')).toBeNull()
  })

  test('says once that a save kept the streak, and not again', () => {
    // the first time only the count is remembered
    render(<Splash force />)
    expect(st().settings.streakSavesSeen).toBe(0)
  })
})

describe('guided tour', () => {
  const renderTour = () =>
    render(
      <MemoryRouter>
        <Tutorial />
      </MemoryRouter>,
    )

  test('is offered to a new user; "Skip" never shows it again', async () => {
    const user = userEvent.setup()
    st().setSettings({ tutorialDone: false })
    renderTour()
    expect(screen.getByText(/hajde da te provedemo kroz aplikaciju/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Preskoči' }))
    expect(st().settings.tutorialDone).toBe(true)
  })

  test('walks through the screens; the sample things are removed with their XP at the end', async () => {
    const user = userEvent.setup()
    st().setSettings({ tutorialDone: false })
    renderTour()
    await user.click(screen.getByRole('button', { name: 'Kreni' }))
    expect(screen.getByText('Korak 1 od 9')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Dalje' }))
    // "Next" waits for the sample task
    expect(screen.getByRole('button', { name: 'Dalje' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Dodaj probnu obavezu' }))
    expect(st().activities).toHaveLength(1)
    await user.click(screen.getByRole('button', { name: 'Dalje' }))
    await user.click(screen.getByRole('button', { name: 'Označi umesto mene' }))
    expect(st().progress.xp).toBe(10)
    await user.click(screen.getByRole('button', { name: 'Dalje' }))
    await user.click(screen.getByRole('button', { name: 'Dodaj probni predmet' }))
    expect(st().subjects).toHaveLength(1)
    for (let i = 0; i < 5; i++) await user.click(screen.getByRole('button', { name: 'Dalje' }))
    await user.click(screen.getByRole('button', { name: 'Gotovo' }))
    expect(st().activities).toHaveLength(0)
    expect(st().subjects).toHaveLength(0)
    expect(st().progress.xp).toBe(0)
    expect(st().settings.tutorialDone).toBe(true)
  })

  test('can be started again from the settings', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <Settings />
        <Tutorial />
      </MemoryRouter>,
    )
    await user.click(screen.getByRole('button', { name: 'Pokreni obilazak' }))
    expect(st().settings.tutorialDone).toBe(false)
    expect(screen.getByRole('dialog', { name: /hajde da te provedemo/ })).toBeInTheDocument()
  })
})

describe('settings and achievements', () => {
  test('the routine steps can be edited, and not below 3', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>,
    )
    const card = screen.getByTestId('routine-settings')
    await user.type(within(card).getByLabelText('Korak 4'), ' i kosa')
    expect(st().settings.routineSteps[3].text).toBe('Umivanje i zubi i kosa')
    await user.click(within(card).getByRole('button', { name: 'Ukloni korak 4' }))
    expect(st().settings.routineSteps).toHaveLength(3)
    expect(within(card).getByRole('button', { name: 'Ukloni korak 3' })).toBeDisabled()
    await user.click(within(card).getByRole('button', { name: 'Vrati podrazumevane' }))
    expect(st().settings.routineSteps).toEqual([])
  })

  test('the achievements page shows locked badges with progress and the records', () => {
    st().add('workouts', {
      date: TODAY,
      type: 'Push',
      durationMin: 30,
      feeling: null,
      exercises: [{ name: 'Bench', sets: [{ reps: 5, weight: 80 }] }],
    })
    render(<Achievements />)
    expect(screen.getByText('Prva nedelja')).toBeInTheDocument()
    expect(screen.getAllByText(/\/ 7/).length).toBeGreaterThan(0)
    expect(screen.getByText('80 kg')).toBeInTheDocument()
  })
})
