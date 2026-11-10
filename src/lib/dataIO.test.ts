import { exportJson, importJson } from './dataIO'
import { emptyData, normalizeData } from './defaults'
import { makeDemoData } from './demo'
import type { AppData } from '../types'

const full = (): AppData => ({ ...emptyData(), ...makeDemoData('2026-11-06') }) as AppData

describe('export / import', () => {
  it('round trip keeps data', () => {
    const d = full()
    const r = importJson(exportJson(d))
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.data.subjects).toEqual(d.subjects)
      expect(r.data.assessments).toEqual(d.assessments)
    }
  })
  it('API key is not exported by default', () => {
    const d = full()
    d.settings.apiKey = 'sk-secret'
    expect(exportJson(d)).not.toContain('sk-secret')
    expect(exportJson(d, true)).toContain('sk-secret')
  })
  it('refuses a damaged item, which would crash the screens later', () => {
    const noTimes = { id: 'a', title: 'x', date: '2026-11-06' }
    const r = importJson(JSON.stringify({ activities: [noTimes] }))
    expect(r).toMatchObject({ ok: false, message: expect.stringContaining('activities') })
    expect(r).toMatchObject({ message: expect.stringContaining('1') })
  })
  it('keeps fields it does not check', () => {
    const d = full()
    const r = importJson(exportJson(d))
    expect(r.ok && r.data.activities).toEqual(d.activities)
  })
  it('accepts a raw data object too', () => {
    const r = importJson(JSON.stringify({ meals: [] }))
    expect(r.ok).toBe(true)
  })
  it('fills missing fields with defaults', () => {
    const r = importJson(JSON.stringify({ subjects: [] }))
    expect(r.ok && r.data.settings.wakeTime).toBe('09:00')
  })
  it('rejects empty, broken, foreign and wrong-shaped input with clear messages', () => {
    expect(importJson('')).toMatchObject({ ok: false, message: expect.stringContaining('prazno') })
    expect(importJson('{nije json')).toMatchObject({
      ok: false,
      message: expect.stringContaining('nije ispravan JSON'),
    })
    expect(importJson('[1,2]')).toMatchObject({ ok: false })
    expect(importJson('{"foo": 1}')).toMatchObject({
      ok: false,
      message: expect.stringContaining('ne liči'),
    })
    expect(importJson('{"subjects": "x"}')).toMatchObject({
      ok: false,
      message: expect.stringContaining('lista'),
    })
    expect(importJson('{"settings": 5}')).toMatchObject({ ok: false })
  })
  it('0.4: an export made by 0.3 (version 2, without the new fields) still loads, with defaults', () => {
    const d = full()
    const old = JSON.parse(exportJson(d)) as {
      version: number
      data: { settings: Record<string, unknown> }
    }
    old.version = 2
    for (const k of ['lastBackupAt', 'backupReminder', 'backupNudgeAt']) delete old.data.settings[k]
    const r = importJson(JSON.stringify(old))
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.data.subjects).toEqual(d.subjects)
    expect(r.data.settings).toMatchObject({
      lastBackupAt: '',
      backupReminder: true,
      backupNudgeAt: '',
    })
    expect(JSON.parse(exportJson(r.data))).toMatchObject({ version: 4 })
  })
})

describe('migration of older data (PS5 -> reward)', () => {
  it('moves the old PS5 fields to the reward fields', () => {
    const old = {
      progress: { xp: 120, events: [], ps5EarnedMin: 90, ps5SpentMin: 30, awarded: ['a'] },
      settings: { name: 'Mila', ps5MinPerStudyHour: 45 },
    }
    const d = normalizeData(old as never)
    expect(d.progress).toMatchObject({ xp: 120, rewardEarnedMin: 90, rewardSpentMin: 30 })
    expect(d.settings).toMatchObject({ name: 'Mila', rewardMinPerStudyHour: 45 })
    expect('ps5EarnedMin' in d.progress).toBe(false)
    expect('ps5MinPerStudyHour' in d.settings).toBe(false)
    // new fields get their defaults
    expect(d.settings.rewardName).toBe('') // empty = the default name of the current language
    expect(d.settings.rewardEmoji).toBe('🎮')
  })
  it('is safe to run twice and does not overwrite new fields', () => {
    const once = normalizeData({ progress: { rewardEarnedMin: 10 } } as never)
    const twice = normalizeData(once)
    expect(twice).toEqual(once)
    expect(
      normalizeData({ progress: { ps5EarnedMin: 5, rewardEarnedMin: 7 } } as never).progress
        .rewardEarnedMin,
    ).toBe(7)
  })
  it('importing an old backup keeps the minutes', () => {
    const text = JSON.stringify({ data: { progress: { ps5EarnedMin: 40 }, settings: {} } })
    const r = importJson(text)
    expect(r.ok && r.data.progress.rewardEarnedMin).toBe(40)
  })
  it('a user can name the reward (e.g. PS5 time) and it survives', () => {
    const d = normalizeData({ settings: { rewardName: 'PS5 vreme', rewardEmoji: '🕹️' } } as never)
    expect(d.settings.rewardName).toBe('PS5 vreme')
  })
})

test('an old negative reward balance is repaired on load', () => {
  const d = normalizeData({ progress: { rewardEarnedMin: 30, rewardSpentMin: 930 } } as never)
  expect(d.progress.rewardSpentMin).toBe(30)
})

test('old "domaci" and "lab" become kinds the user named, in the language of the data', () => {
  const asm = (type: string) =>
    ({
      id: type,
      subjectId: 's',
      type,
      title: 'T',
      date: '2026-11-20',
      registration: 'ne-treba',
      maxPoints: 10,
      points: null,
      difficulty: 3,
      studyHours: 2,
    }) as never
  const d = normalizeData({
    assessments: [asm('domaci'), asm('lab'), asm('kolokvijum')],
    settings: { language: 'en' },
  } as never)
  expect(d.assessments.map((a) => a.type)).toEqual(['Homework', 'Lab', 'kolokvijum'])
  expect(d.settings.customAssessmentKinds).toEqual(['Homework', 'Lab'])
  // running it again changes nothing
  expect(normalizeData(d).assessments.map((a) => a.type)).toEqual(['Homework', 'Lab', 'kolokvijum'])
})
