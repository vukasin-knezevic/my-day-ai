import type { Store } from '../../store'
import type { Assessment } from '../../types'
import type { AiKind, AiResult, ImportResult, PlanResult, WorkoutPlanResult } from './schemas'

type Actions = Pick<Store, 'add' | 'patch' | 'subjects' | 'workoutPlan'>

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
    return `🏋️ Plan treninga „${p.name}" sačuvan (tab Plan).`
  }
  if (kind === 'uvoz') {
    const imp = data as ImportResult
    let subjects = st.subjects
    let n = 0
    for (const a of imp.assessments) {
      let sub = subjects.find((s) => s.name.toLowerCase() === a.subject.toLowerCase())
      if (!sub) {
        const id = st.add('subjects', {
          name: a.subject,
          color: '#2563eb',
          espb: 6,
          passMark: 51,
          slots: [],
        })
        sub = { id, name: a.subject, color: '#2563eb', espb: 6, passMark: 51, slots: [] }
        subjects = [...subjects, sub]
      }
      const exam = a.type === 'kolokvijum' || a.type === 'ispit'
      const item: Omit<Assessment, 'id'> = {
        subjectId: sub.id,
        type: a.type,
        title: a.title,
        date: a.date,
        time: a.time,
        registrationDeadline: a.registrationDeadline,
        registration: exam ? 'nije-prijavljen' : 'ne-treba',
        maxPoints: 30,
        points: null,
        difficulty: 3,
        studyHours: 6,
      }
      st.add('assessments', item)
      n++
    }
    return `📚 Uvezeno ${n} stavki. Proveri poene i težinu na ekranu Faks.`
  }
  if (kind === 'rezime') return 'Rezime je prikazan ispod.'
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
  return `🤖 ${plan.activities.length} predloga dodato. Prihvati ih na ekranu Danas ili Planer.`
}
