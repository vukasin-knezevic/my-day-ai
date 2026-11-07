// Kinds of obligations (exam, midterm, ...) and of class slots (lecture, exercises, ...).
// Two of each are built in; every other kind is named by the user.
import type { Assessment, AssessmentType, ClassSlot, Settings } from '../types'

export const BUILTIN_ASSESSMENTS = ['ispit', 'kolokvijum'] as const
export const BUILTIN_SLOTS = ['predavanje', 'vezbe'] as const

/** Exam or midterm: needs registration and is planned for by the planner. */
export const isExamType = (type: AssessmentType) => type === 'ispit' || type === 'kolokvijum'
export const isBuiltinSlot = (kind: string) => (BUILTIN_SLOTS as readonly string[]).includes(kind)

const unique = (list: string[]) => {
  const seen = new Set<string>()
  return list.filter((x) => {
    const k = x.trim().toLowerCase()
    if (!k || seen.has(k)) return false
    seen.add(k)
    return true
  })
}

/** Every kind of obligation to offer: built in, the user's own, and any kind already used in the data. */
export function assessmentKinds(
  settings: Pick<Settings, 'customAssessmentKinds'>,
  assessments: Pick<Assessment, 'type'>[],
): string[] {
  return unique([
    ...BUILTIN_ASSESSMENTS,
    ...settings.customAssessmentKinds,
    ...assessments.map((a) => a.type).filter((x) => !isExamType(x)),
  ])
}

/** Every kind of class slot to offer. */
export function slotKinds(
  settings: Pick<Settings, 'customSlotKinds'>,
  slots: Pick<ClassSlot, 'kind'>[],
): string[] {
  return unique([
    ...BUILTIN_SLOTS,
    ...settings.customSlotKinds,
    ...slots.map((s) => s.kind).filter((x) => !isBuiltinSlot(x)),
  ])
}

/** Adds a user kind to a list (trimmed, no duplicates ignoring case). Returns the stored spelling. */
export function addKind(list: string[], name: string): { list: string[]; name: string } {
  const clean = name.trim().replace(/\s+/g, ' ')
  const same = [...BUILTIN_ASSESSMENTS, ...BUILTIN_SLOTS, ...list].find(
    (x) => x.toLowerCase() === clean.toLowerCase(),
  )
  if (!clean) return { list, name: '' }
  if (same) return { list, name: same }
  return { list: [...list, clean], name: clean }
}
