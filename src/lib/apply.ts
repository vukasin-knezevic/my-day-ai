import type { Store } from '../store'
import type { Parsed } from './quickParse'
import { CATEGORY_META } from '../types'
import { formatShort } from './dates'

type Actions = Pick<Store, 'add' | 'update'> & { sleep: Store['sleep'] }

/** Saves a parsed quick entry into the store. Returns a short Serbian confirmation message. */
export function applyParsed(p: Parsed, st: Actions): string {
  switch (p.kind) {
    case 'activity':
      st.add('activities', {
        title: p.title,
        category: p.category,
        date: p.date,
        start: p.start,
        end: p.end,
        recurrence: 'none',
        status: 'planned',
        source: 'me',
      })
      return `${CATEGORY_META[p.category].emoji} Dodato: ${p.title}, ${formatShort(p.date)} ${p.start}–${p.end}`
    case 'expense':
      st.add('expenses', {
        date: p.date,
        amount: p.amount,
        category: p.category,
        description: p.description,
      })
      return `💰 Trošak ${p.amount} RSD (${p.category}) sačuvan`
    case 'sleep': {
      const iso = `${p.date}T${p.time}:00`
      if (p.event === 'bed') {
        // a bedtime of 00:00–05:59 entered "today" belongs to the night that just started
        st.add('sleep', {
          date: p.date,
          bedtime: iso,
          wakeTime: null,
          quality: null,
          source: 'manual',
        })
        return `😴 Legao u ${p.time}. Laku noć!`
      }
      const open = [...st.sleep].reverse().find((s) => s.wakeTime === null)
      if (open) st.update('sleep', open.id, { wakeTime: iso, date: p.date })
      else
        st.add('sleep', {
          date: p.date,
          bedtime: iso,
          wakeTime: iso,
          quality: null,
          source: 'manual',
        })
      return `🌅 Ustao u ${p.time}. Dobro jutro!`
    }
    default:
      return 'Nisam razumeo. Probaj npr. „trening 18-19:30", „kafa 200" ili „legao 1:30".'
  }
}
