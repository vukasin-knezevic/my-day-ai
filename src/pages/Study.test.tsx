import { setTime } from '../test/pick'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Study from './Study'
import { useStore } from '../store'
import { emptyData } from '../lib/defaults'

beforeEach(() => {
  useStore.setState({ ...emptyData(), hydrated: true })
})

const addSubject = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByLabelText('Naziv predmeta'), 'Fizika')
  await user.click(screen.getByRole('button', { name: 'Dodaj predmet' }))
}

test('predmet se briše tek na drugi klik', async () => {
  const user = userEvent.setup()
  render(<Study />)
  await addSubject(user)
  await user.click(screen.getByRole('button', { name: 'Obriši predmet Fizika' }))
  expect(useStore.getState().subjects).toHaveLength(1)
  await user.click(screen.getByRole('button', { name: /Sigurno\?/ }))
  expect(useStore.getState().subjects).toHaveLength(0)
})

test('klik negde drugde otkazuje brisanje predmeta', async () => {
  const user = userEvent.setup()
  render(<Study />)
  await addSubject(user)
  await user.click(screen.getByRole('button', { name: 'Obriši predmet Fizika' }))
  await user.click(screen.getByLabelText('Naziv predmeta'))
  await user.click(screen.getByRole('button', { name: 'Obriši predmet Fizika' }))
  expect(useStore.getState().subjects).toHaveLength(1)
})

const openSlotForm = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole('button', { name: '+ Dodaj termin' }))
const saveSlot = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole('button', { name: 'Dodaj termin' }))
const formGone = () =>
  waitFor(() => expect(screen.queryByRole('button', { name: 'Dodaj termin' })).toBeNull())

test('R-01: forma za termin se ne vidi dok se ne dodirne „+ Dodaj termin“', async () => {
  const user = userEvent.setup()
  render(<Study />)
  await addSubject(user)
  expect(screen.queryByLabelText('Početak')).toBeNull()
  await openSlotForm(user)
  expect(screen.getByRole('dialog', { name: /Nov termin · Fizika/ })).toBeInTheDocument()
  expect(screen.getByLabelText(/Nova vrsta termina/)).toBeInTheDocument()
})

test('termin ne može da se završi pre početka', async () => {
  const user = userEvent.setup()
  render(<Study />)
  await addSubject(user)
  await openSlotForm(user)
  await setTime(user, 'Kraj', '09:00')
  await saveSlot(user)
  expect(screen.getByRole('alert')).toHaveTextContent('Kraj mora biti posle početka')
  expect(useStore.getState().subjects[0].slots).toHaveLength(0)
})

test('predmet + termin: idem / ne idem / ponekad je odmah pored termina', async () => {
  const user = userEvent.setup()
  render(<Study />)
  await addSubject(user)
  await openSlotForm(user)
  await saveSlot(user)
  await formGone()
  // no separate card on top: the choice sits next to the class (new classes start as "Idem")
  expect(screen.queryByText('Da li ideš na ove termine?')).not.toBeInTheDocument()
  expect(useStore.getState().subjects[0].slots[0].attendance).toBe('idem')
  await user.click(screen.getByRole('button', { name: /^Ne idem: Fizika/ }))
  expect(useStore.getState().subjects[0].slots[0].attendance).toBe('ne-idem')
  expect(screen.getByRole('button', { name: /^Ne idem: Fizika/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  expect(screen.getByText('slobodno vreme')).toBeInTheDocument()
})

test('termin se briše sa ✕, može da se poništi i ne dodaje se dvaput; ✎ ga menja', async () => {
  const user = userEvent.setup()
  render(<Study />)
  await addSubject(user)
  await openSlotForm(user)
  await saveSlot(user)
  await formGone()
  await openSlotForm(user)
  await saveSlot(user)
  expect(useStore.getState().subjects[0].slots).toHaveLength(1)
  expect(screen.getByRole('alert')).toHaveTextContent('već postoji')
  await user.click(screen.getByRole('button', { name: 'Odustani' }))
  await formGone()

  await user.click(screen.getByRole('button', { name: /^Izmeni termin/ }))
  await setTime(user, 'Kraj', '13:00')
  await user.click(screen.getByRole('button', { name: 'Sačuvaj' }))
  expect(useStore.getState().subjects[0].slots).toMatchObject([{ start: '10:00', end: '13:00' }])
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Sačuvaj' })).toBeNull())

  await user.click(screen.getByRole('button', { name: /^Obriši termin/ }))
  expect(useStore.getState().subjects[0].slots).toHaveLength(0)
  await user.click(screen.getByRole('button', { name: 'Poništi' }))
  expect(useStore.getState().subjects[0].slots).toHaveLength(1)
})

test('ispit i kolokvijum dobijaju naziv sami, a ostale vrste imenuje korisnik', async () => {
  const user = userEvent.setup()
  render(<Study />)
  await user.type(screen.getByLabelText('Naziv predmeta'), 'Fizika 1')
  await user.click(screen.getByRole('button', { name: 'Dodaj predmet' }))
  await user.click(screen.getByRole('tab', { name: 'Ispit/Kolokvijum' }))
  const open = () => user.click(screen.getByRole('button', { name: '+ Nova obaveza' }))
  const add = () => user.click(screen.getByRole('button', { name: 'Dodaj' }))
  const gone = () =>
    waitFor(() => expect(screen.queryByRole('button', { name: 'Dodaj' })).toBeNull())
  // R-01: the form is behind the button
  expect(screen.queryByRole('button', { name: 'Dodaj' })).toBeNull()
  await open()
  // for the built-in kinds there is no "Naziv" field and no "Sati učenja" in the form
  expect(screen.queryByLabelText('Naziv')).not.toBeInTheDocument()
  expect(screen.queryByLabelText(/Sati učenja/)).not.toBeInTheDocument()
  await add()
  await gone()
  await open()
  await add()
  await gone()
  expect(useStore.getState().assessments.map((a) => a.title)).toEqual([
    'Kolokvijum 1 · Fizika 1',
    'Kolokvijum 2 · Fizika 1',
  ])
  // a kind the student names: the name field appears and is required
  await open()
  await user.type(screen.getByLabelText(/Nova vrsta obaveze/), 'Domaći')
  await user.click(screen.getByRole('button', { name: 'Dodaj vrstu' }))
  expect(useStore.getState().settings.customAssessmentKinds).toEqual(['Domaći'])
  await add()
  expect(screen.getByRole('alert')).toBeInTheDocument()
  await user.type(screen.getByLabelText('Naziv'), 'Domaći 1')
  await add()
  const added = useStore.getState().assessments[2]
  expect(added).toMatchObject({ type: 'Domaći', title: 'Domaći 1', registration: 'ne-treba' })
})

test('R-09, R-11: poeni su u odnosu na 100; predmet bez obaveza nudi dodavanje umesto „ne može se doći do 51“', async () => {
  const user = userEvent.setup()
  render(<Study />)
  await addSubject(user)
  await user.click(screen.getByRole('tab', { name: 'Poeni' }))
  expect(screen.getByText('/ 100')).toBeInTheDocument()
  expect(screen.queryByText(/ne može se doći/)).toBeNull()
  expect(screen.getByText(/Dodaj kolokvijume i ispit/)).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: '+ Dodaj obavezu' }))
  // the form is open on the assessments tab
  expect(await screen.findByRole('dialog', { name: /Novi kolokvijum/ })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Dodaj' }))
  expect(useStore.getState().assessments).toHaveLength(1)
})
