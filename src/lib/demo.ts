import type { Activity, Assessment, Habit, Meal, Subject, Workout, AppData } from '../types'
import { addDaysStr } from './dates'
import { uid } from './defaults'
import { t } from '../i18n'

/** Example data, clearly marked as an example. Not real courses or a real schedule. */
export function makeDemoData(today: string): Partial<AppData> {
  const s1 = uid()
  const s2 = uid()
  const subjects: Subject[] = [
    {
      id: s1,
      name: t('demo.math'),
      color: '#2563eb',
      espb: 8,
      passMark: 51,
      demo: true,
      slots: [
        { id: uid(), kind: 'predavanje', day: 1, start: '10:15', end: '12:00', attendance: null },
        { id: uid(), kind: 'vezbe', day: 3, start: '12:15', end: '14:00', attendance: null },
      ],
    },
    {
      id: s2,
      name: t('demo.prog'),
      color: '#0d9488',
      espb: 6,
      passMark: 51,
      demo: true,
      slots: [
        { id: uid(), kind: 'predavanje', day: 2, start: '14:15', end: '16:00', attendance: null },
      ],
    },
  ]
  const assessments: Assessment[] = [
    {
      id: uid(),
      subjectId: s1,
      type: 'kolokvijum',
      title: t('demo.midterm'),
      date: addDaysStr(today, 6),
      time: '10:00',
      registrationDeadline: addDaysStr(today, 3),
      registration: 'nije-prijavljen',
      maxPoints: 30,
      points: null,
      difficulty: 4,
      studyHours: 10,
      demo: true,
    },
    {
      id: uid(),
      subjectId: s2,
      type: 'domaci',
      title: t('demo.homework'),
      date: addDaysStr(today, 9),
      registration: 'ne-treba',
      maxPoints: 10,
      points: null,
      difficulty: 2,
      studyHours: 3,
      demo: true,
    },
  ]
  const activities: Activity[] = [
    {
      id: uid(),
      title: t('demo.workout'),
      category: 'workout',
      date: today,
      start: '18:00',
      end: '19:30',
      recurrence: 'none',
      status: 'planned',
      source: 'me',
      demo: true,
    },
    {
      id: uid(),
      title: t('demo.study'),
      category: 'study',
      date: today,
      start: '15:00',
      end: '17:00',
      recurrence: 'none',
      status: 'planned',
      source: 'me',
      demo: true,
    },
  ]
  const workouts: Workout[] = [
    {
      id: uid(),
      date: addDaysStr(today, -2),
      type: t('demo.upper'),
      durationMin: 70,
      feeling: 4,
      demo: true,
      exercises: [
        {
          name: t('ex.bench'),
          sets: [
            { reps: 8, weight: 60 },
            { reps: 8, weight: 60 },
            { reps: 6, weight: 65 },
          ],
        },
      ],
    },
  ]
  const meals: Meal[] = [
    { id: uid(), date: today, description: t('demo.meal'), protein: 40, demo: true },
  ]
  const habits: Habit[] = [
    { id: uid(), name: t('demo.habit'), emoji: '💧', goal: 2, unit: 'L', entries: {}, demo: true },
  ]
  return { subjects, assessments, activities, workouts, meals, habits }
}
