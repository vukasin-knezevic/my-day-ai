import { exportJson, importJson } from './dataIO'
import { emptyData } from './defaults'
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
