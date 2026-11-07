// Translated labels for the internal ids used in the data (categories, types, ...).
// The ids stay the same in every language; only the visible text changes.
import { t } from '../i18n'
import { isBuiltinSlot, isExamType } from './kinds'
import type {
  AssessmentType,
  Attendance,
  Category,
  ExpenseCategory,
  Recurrence,
  Settings,
} from '../types'

export const categoryLabel = (c: Category) => t(`cat.${c}`)
export const expenseLabel = (c: ExpenseCategory) => t(`expense.${c}`)
/** Built-in kinds are translated; a kind the user named is shown as typed. */
export const assessmentLabel = (a: AssessmentType) =>
  isExamType(a) ? t(`assess.${a as 'ispit' | 'kolokvijum'}`) : a
export const attendanceLabel = (a: Attendance) => t(`att.${a}`)
export const slotKindLabel = (k: string) =>
  isBuiltinSlot(k) ? t(`slot.${k as 'predavanje' | 'vezbe'}`) : k
export const recurrenceLabel = (r: Recurrence) => t(`rec.${r}`)
/** The reward name the user chose, or the default of the current language. */
export const rewardNameOf = (s: Pick<Settings, 'rewardName'>) =>
  s.rewardName.trim() || t('reward.default')
/** The currency label the user chose, or the default of the current language. */
export const currencyOf = (s: Pick<Settings, 'currency'>) =>
  s.currency.trim() || t('currency.default')
export const themeLabel = (x: Settings['theme']) => t(`theme.${x}`)
