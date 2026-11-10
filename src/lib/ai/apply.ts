import type { Store } from '../../store'
import type { Assessment } from '../../types'
import { t } from '../../i18n'
import { addKind, isExamType } from '../kinds'
import type { AiKind, AiResult, ImportResult, PlanResult, WorkoutPlanResult } from './schemas'

type Actions = Pick<Store, 'add' | 'patch' | 'subjects' | 'workoutPlan' | 'assessments'> &
  Partial<Pick<Store, 'settings' | 'setSettings'>>

/** "domaci" and "lab" (older answers) become kinds with proper names; any other name is kept as the user's kind. */
function kindName(raw: string): string {
  const key = raw.trim().toLowerCase()
  if (key === 'domaci') return t('assess.domaci')
  if (key === 'lab') return t('assess.lab')
  return raw.trim()
}

/** Saves a validated AI result. Plans become dashed suggestions the user must accept. Returns a short message. */
export function applyAiResult(kind: AiKind, data: AiResult, st: Actions): string {
  if (kind === 'trening') {
    const p = data as WorkoutPlanResult
    st.patch({
      workoutPlan: {
        name: p.name,
        source: 'ai',
        days: p.days.map((d) => ({ ...d, day: d.day as 1 | 2 | 3 | 4 | 5 | 6 | 7 })),
      },
    })
    return t('aiapply.workout', { name: p.name })
  }
  if (kind === 'uvoz') {
    const imp = data as ImportResult
    const subjects = [...st.subjects]
    const known: Pick<Assessment, 'subjectId' | 'date' | 'title'>[] = [...st.assessments]
    const sameText = (x: string, y: string) => x.toLowerCase() === y.toLowerCase()
    let kinds = st.settings?.customAssessmentKinds ?? []
    let n = 0
    for (const a of imp.assessments) {
      let sub = subjects.find((s) => sameText(s.name, a.subject))
      if (!sub) {
        const fresh = { name: a.subject, color: '#2563eb', espb: 6, passMark: 51, slots: [] }
        sub = { ...fresh, id: st.add('subjects', fresh) }
        subjects.push(sub)
      }
      const subjectId = sub.id
      const duplicate = known.some(
        (x) => x.subjectId === subjectId && x.date === a.date && sameText(x.title, a.title),
      )
      if (duplicate) continue
      known.push({ subjectId, date: a.date, title: a.title })
      let type = isExamType(a.type) ? a.type : kindName(a.type)
      // a kind the app does not know becomes one of the user's kinds, so it can be picked later
      if (!isExamType(type) && st.settings) {
        const k = addKind(kinds, type)
        type = k.name || type
        kinds = k.list
      }
      const item: Omit<Assessment, 'id'> = {
        subjectId: sub.id,
        type,
        title: a.title,
        date: a.date,
        time: a.time,
        registrationDeadline: a.registrationDeadline,
        registration: isExamType(type) ? 'nije-prijavljen' : 'ne-treba',
        maxPoints: 30,
        points: null,
        difficulty: 3,
      }
      st.add('assessments', item)
      n++
    }
    if (st.settings && st.setSettings && kinds !== st.settings.customAssessmentKinds)
      st.setSettings({ customAssessmentKinds: kinds })
    return t('aiapply.import', { n })
  }
  if (kind === 'rezime') return t('aiapply.summary')
  const plan = data as PlanResult
  for (const a of plan.activities)
    st.add('activities', {
      title: a.title,
      category: a.category,
      date: a.date,
      start: a.start,
      end: a.end,
      note: a.note,
      recurrence: 'none',
      status: 'planned',
      source: 'ai',
      suggested: true,
    })
  return t('aiapply.plan', { n: plan.activities.length })
}
