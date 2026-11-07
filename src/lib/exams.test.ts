import { autoTitle, estimateStudyHours, studyHoursOf } from './exams'

const subject = { id: 's1', name: 'Matematika 1' }

describe('autoTitle', () => {
  it('numbers midterms by subject', () => {
    expect(autoTitle('kolokvijum', subject, [])).toBe('Kolokvijum 1 · Matematika 1')
    expect(
      autoTitle('kolokvijum', subject, [
        { subjectId: 's1', type: 'kolokvijum' },
        { subjectId: 's2', type: 'kolokvijum' },
      ]),
    ).toBe('Kolokvijum 2 · Matematika 1')
  })
  it('an exam is numbered only from the second one', () => {
    expect(autoTitle('ispit', { id: 's1', name: 'Fizika 1' }, [])).toBe('Ispit · Fizika 1')
    expect(
      autoTitle('ispit', { id: 's1', name: 'Fizika 1' }, [{ subjectId: 's1', type: 'ispit' }]),
    ).toBe('Ispit 2 · Fizika 1')
  })
})

describe('estimateStudyHours', () => {
  it('exam > midterm, harder > easier, more credits > fewer', () => {
    expect(estimateStudyHours('ispit', 3, 6)).toBeGreaterThan(
      estimateStudyHours('kolokvijum', 3, 6),
    )
    expect(estimateStudyHours('kolokvijum', 5, 6)).toBeGreaterThan(
      estimateStudyHours('kolokvijum', 1, 6),
    )
    expect(estimateStudyHours('kolokvijum', 3, 9)).toBeGreaterThan(
      estimateStudyHours('kolokvijum', 3, 3),
    )
  })
  it('rounds to half an hour and stays sane at the edges', () => {
    for (const d of [0, 1, 3, 5, 9]) {
      const h = estimateStudyHours('ispit', d, 0)
      expect(h * 2).toBe(Math.round(h * 2))
      expect(h).toBeGreaterThan(0)
    }
  })
  it('set hours win over the estimate', () => {
    expect(studyHoursOf({ type: 'ispit', difficulty: 3, studyHours: 4 })).toBe(4)
    expect(studyHoursOf({ type: 'ispit', difficulty: 3 }, { espb: 6 })).toBe(10)
  })
})
