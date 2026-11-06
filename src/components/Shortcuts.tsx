import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from './ui'
import { useT } from '../i18n'
import type { BaseKey } from '../i18n'

export const SHORTCUTS: [string, BaseKey][] = [
  ['N', 'shortcut.new'],
  ['T', 'shortcut.today'],
  ['W', 'shortcut.week'],
  ['/', 'shortcut.quick'],
  ['?', 'shortcut.help'],
]

function isTyping(el: EventTarget | null) {
  const t = el as HTMLElement | null
  return (
    !!t &&
    (t.tagName === 'INPUT' ||
      t.tagName === 'TEXTAREA' ||
      t.tagName === 'SELECT' ||
      t.isContentEditable)
  )
}

/** Global keyboard shortcuts + the help dialog. Disabled while typing in a field. */
export default function Shortcuts() {
  const { t } = useT()
  const nav = useNavigate()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const focusQuick = () => setTimeout(() => document.getElementById('quick-input')?.focus(), 50)
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key === 'Escape') return setOpen(false)
      if (isTyping(e.target)) return
      switch (e.key) {
        case 'n':
        case 'N':
        case '/':
          e.preventDefault()
          nav('/')
          focusQuick()
          break
        case 't':
        case 'T':
          nav('/')
          break
        case 'w':
        case 'W':
          nav('/pregled')
          break
        case '?':
          setOpen(true)
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [nav])

  if (!open) return null
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('shortcut.title')}
      className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-900">
        <h2 className="mb-3 text-lg font-bold">⌨️ {t('shortcut.heading')}</h2>
        <ul className="space-y-1 text-sm">
          {SHORTCUTS.map(([k, d]) => (
            <li key={k}>
              <kbd className="rounded bg-slate-200 px-2 py-0.5 font-mono dark:bg-slate-700">
                {k}
              </kbd>{' '}
              {t(d)}
            </li>
          ))}
        </ul>
        <Button className="mt-4" onClick={() => setOpen(false)} autoFocus>
          {t('common.close')}
        </Button>
      </div>
    </div>
  )
}
