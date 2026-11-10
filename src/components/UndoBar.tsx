import { useUndo } from '../lib/undo'
import { useT } from '../i18n'

/** "Deleted · Undo" above the bottom navigation, for a few seconds after any delete. */
export default function UndoBar() {
  const { t } = useT()
  const pending = useUndo((s) => s.pending)
  const undo = useUndo((s) => s.undo)
  if (!pending) return null
  return (
    <div
      key={pending.id}
      role="status"
      className="anim-toast fixed inset-x-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 mx-auto flex max-w-sm items-center justify-between gap-3 rounded-2xl bg-slate-900 py-1 pr-1 pl-4 text-sm text-white shadow-lg md:bottom-6"
    >
      <span>{t('undo.deleted')}</span>
      <button
        type="button"
        className="min-h-11 rounded-xl px-4 font-semibold text-blue-300 hover:bg-slate-800"
        onClick={undo}
      >
        {t('common.undo')}
      </button>
    </div>
  )
}
