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
    expect(d.settings.rewardName).toBe('Vreme za zabavu')
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
