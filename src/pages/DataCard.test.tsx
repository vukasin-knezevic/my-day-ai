import { beforeEach, expect, test, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DataCard from './DataCard'
import { selectData, useStore } from '../store'
import { exportJson } from '../lib/dataIO'
import { emptyData } from '../lib/defaults'

beforeEach(() => {
  useStore.getState().resetAll()
  vi.unstubAllGlobals()
})

const backupWithSubject = () => {
  const d = emptyData()
  d.subjects.push({
    id: 's1',
    name: 'Matematika 1',
    espb: 6,
    color: '#2563eb',
    passMark: 51,
    slots: [],
  })
  return exportJson(d)
}

test('A-14: „Izaberi fajl“ učita kopiju, traži potvrdu i uveze je', async () => {
  const user = userEvent.setup()
  render(<DataCard />)
  const file = new File([backupWithSubject()], 'my-day-ai-backup.json', {
    type: 'application/json',
  })
  await user.upload(screen.getByLabelText('Izaberi fajl'), file)
  await user.click(await screen.findByRole('button', { name: 'Da, uvezi' }))
  expect(selectData(useStore.getState()).subjects.map((s) => s.name)).toEqual(['Matematika 1'])
})

test('A-14: fajl koji nije rezervna kopija daje poruku i ništa ne menja', async () => {
  const user = userEvent.setup()
  render(<DataCard />)
  const file = new File(['ovo nije json'], 'slika.json', { type: 'application/json' })
  await user.upload(screen.getByLabelText('Izaberi fajl'), file)
  expect(await screen.findByRole('alert')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Da, uvezi' })).toBeNull()
})

test('A-14: „Podeli fajl“ postoji samo gde uređaj ume da deli fajl; deljenje beleži kopiju, odustajanje ne', async () => {
  const user = userEvent.setup()
  const { unmount } = render(<DataCard />)
  expect(screen.queryByRole('button', { name: 'Podeli fajl' })).toBeNull()
  unmount()

  const share = vi
    .fn()
    .mockRejectedValueOnce(new DOMException('closed', 'AbortError'))
    .mockResolvedValue(undefined)
  vi.stubGlobal(
    'navigator',
    Object.assign(Object.create(navigator), { share, canShare: () => true }),
  )
  render(<DataCard />)
  await user.click(screen.getByRole('button', { name: 'Podeli fajl' }))
  await waitFor(() => expect(share).toHaveBeenCalledTimes(1))
  expect(useStore.getState().settings.lastBackupAt).toBe('')
  await user.click(screen.getByRole('button', { name: 'Podeli fajl' }))
  await waitFor(() => expect(useStore.getState().settings.lastBackupAt).not.toBe(''))
  expect(share.mock.calls[1][0].files[0].name).toBe('my-day-ai-backup.json')
})
