import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import BackupNudge from './BackupNudge'
import { useStore } from '../store'
import { emptyData } from '../lib/defaults'
import * as files from '../lib/files'

const habit = { id: 'h', name: 'Voda', goal: 8, entries: {} }

beforeEach(() => useStore.setState({ ...emptyData(), hydrated: true }))
afterEach(() => vi.restoreAllMocks())

test('A-03: prvi dan sa podacima samo pokreće brojanje; posle 7 dana stiže blag podsetnik', () => {
  useStore.setState({ habits: [habit] as never })
  const { rerender } = render(<BackupNudge today="2026-11-01" />)
  expect(screen.queryByRole('button', { name: 'Sačuvaj kopiju' })).not.toBeInTheDocument()
  expect(useStore.getState().settings.backupNudgeAt).toBe('2026-11-01')
  rerender(<BackupNudge today="2026-11-08" />)
  expect(screen.getByText(/Vreme je za rezervnu kopiju \(poslednja: nikad\)/)).toBeInTheDocument()
})

test('„Kasnije“ pomera podsetnik za nedelju dana; isključen podsetnik ćuti', async () => {
  const user = userEvent.setup()
  useStore.setState({ habits: [habit] as never })
  useStore.getState().setSettings({ backupNudgeAt: '2026-10-01' })
  const { rerender } = render(<BackupNudge />)
  await user.click(screen.getByRole('button', { name: 'Kasnije' }))
  expect(screen.queryByRole('button', { name: 'Kasnije' })).not.toBeInTheDocument()
  useStore.getState().setSettings({ backupNudgeAt: '2026-10-01', backupReminder: false })
  rerender(<BackupNudge />)
  expect(screen.queryByRole('button', { name: 'Kasnije' })).not.toBeInTheDocument()
})

test('„Sačuvaj kopiju“ deli ili preuzima fajl i pamti datum; zatvoren meni za deljenje se ne računa', async () => {
  const user = userEvent.setup()
  useStore.setState({ habits: [habit] as never })
  useStore.getState().setSettings({ backupNudgeAt: '2026-10-01' })
  const share = vi.spyOn(files, 'shareOrDownload').mockResolvedValue('cancelled')
  render(<BackupNudge />)
  await user.click(screen.getByRole('button', { name: 'Sačuvaj kopiju' }))
  expect(useStore.getState().settings.lastBackupAt).toBe('')
  share.mockResolvedValue('downloaded')
  await user.click(screen.getByRole('button', { name: 'Sačuvaj kopiju' }))
  expect(share).toHaveBeenCalledWith(
    'my-day-ai-backup.json',
    expect.any(String),
    'application/json',
  )
  expect(useStore.getState().settings.lastBackupAt).not.toBe('')
  expect(screen.queryByRole('button', { name: 'Sačuvaj kopiju' })).not.toBeInTheDocument()
})
