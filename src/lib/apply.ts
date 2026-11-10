import type { Store } from '../store'
import type { Parsed } from './quickParse'
import { CATEGORY_META } from '../types'
import { formatShort } from './dates'
import { t } from '../i18n'
import { currencyOf, expenseLabel } from './labels'
import { openSleep } from './life'

type Actions = Pick<Store, 'add' | 'update'> & {
  sleep: Store['sleep']
  settings?: { currency: string }
}

/** Saves a parsed quick entry into the store. Returns a short confirmation message (in the current language). */
export function applyParsed(p: Parsed, st: Actions): string {
  switch (p.kind) {
    case 'activity':
      st.add('activities', {
        title: p.title,
        category: p.category,
        date: p.date,
        start: p.start,
        end: p.end,
        recurrence: p.recurrence ?? 'none',
        status: 'planned',
        source: 'me',
      })
      return (
        t('apply.added', {
          emoji: CATEGORY_META[p.category].emoji,
          title: p.title,
          date: formatShort(p.date),
          start: p.start,
          end: p.end,
        }) + (p.recurrence ? ' ' + t('apply.repeats') : '')
      )
    case 'expense':
      st.add('expenses', {
        date: p.date,
        amount: p.amount,
        category: p.category,
        description: p.description,
      })
      return t('apply.expense', {
        amount: p.amount,
        currency: st.settings ? currencyOf(st.settings) : t('currency.default'),
        category: expenseLabel(p.category),
      })
    case 'sleep': {
      const iso = `${p.date}T${p.time}:00`
      if (p.event === 'bed') {
        st.add('sleep', {
          date: p.date,
          bedtime: iso,
          wakeTime: null,
          quality: null,
          source: 'manual',
        })
        return t('apply.bed', { time: p.time })
      }
      // a "went to bed" from days ago (a forgotten "woke up") is not this night
      const open = openSleep(st.sleep, iso)
      if (open) st.update('sleep', open.id, { wakeTime: iso, date: p.date })
      else
        st.add('sleep', {
          date: p.date,
          bedtime: iso,
          wakeTime: iso,
          quality: null,
          source: 'manual',
        })
      return t('apply.wake', { time: p.time })
    }
    default:
      return t('apply.unknown')
  }
}
