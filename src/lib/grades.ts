import type { Assessment, Subject } from '../types'

/** Serbian scale: 51–60 = 6, 61–70 = 7, 71–80 = 8, 81–90 = 9, 91–100 = 10. Below the pass mark = 5. */
export function gradeFor(points: number, passMark = 51): number {
  if (points < passMark) return 5
  if (points >= 91) return 10
  if (points >= 81) return 9
  if (points >= 71) return 8
  if (points >= 61) return 7
  return 6
}

export interface SubjectPoints {
  earned: number
  /** Max points of the assessments that already have a result */
  maxGraded: number
  /** Max points of everything that counts (including not yet taken) */
  maxTotal: number
  missingToPass: number
  /** Points still available from assessments without a result */
  remaining: number
  /** Can I still pass at all? */
  canPass: boolean
  grade: number | null
}

export function subjectPoints(subject: Subject, assessments: Assessment[]): SubjectPoints {
  const mine = assessments.filter((a) => a.subjectId === subject.id)
  const graded = mine.filter((a) => a.points !== null)
  const earned = graded.reduce((n, a) => n + (a.points ?? 0), 0)
  const maxGraded = graded.reduce((n, a) => n + a.maxPoints, 0)
  const maxTotal = mine.reduce((n, a) => n + a.maxPoints, 0)
  const remaining = maxTotal - maxGraded
  const missingToPass = Math.max(0, subject.passMark - earned)
  return {
    earned,
    maxGraded,
    maxTotal,
    missingToPass,
    remaining,
    canPass: earned + remaining >= subject.passMark,
    grade: graded.length ? gradeFor(earned, subject.passMark) : null,
  }
}
