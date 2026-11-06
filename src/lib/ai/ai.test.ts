import { extractJson, parseAiResponse } from './extract'
import { buildContext, buildPrompt, toneHint, manualQuestions, systemPrompt } from './prompt'
import { AiError, API_URL, callClaude } from './client'
import { addUsage, estimateCost } from './usage'
import { modelFor, runApi } from './run'
import { applyAiResult } from './apply'
import { emptyData } from '../defaults'
import { makeDemoData } from '../demo'
import type { AppData } from '../../types'

const TODAY = '2026-11-06'
const goodPlan = {
  summary: 'Fokus na mat',
  activities: [
    { title: 'Učenje mate', category: 'study', date: TODAY, start: '10:00', end: '12:00' },
  ],
}
const fence = (o: unknown) => '```json\n' + JSON.stringify(o, null, 2) + '\n```'

describe('extractJson', () => {
  it('finds a fenced block surrounded by chatter', () => {
    const r = extractJson(
      `Evo plana! 🎉 Ovo je dosta priče {sa vitičastim zagradama}.\n${fence(goodPlan)}\nSrećno!`,
    )
    expect(r).toEqual({ ok: true, value: goodPlan })
  })
  it('works without code fence (bare JSON in text)', () => {
    const r = extractJson(`Evo: ${JSON.stringify(goodPlan)} gotovo`)
    expect(r).toEqual({ ok: true, value: goodPlan })
  })
  it('last valid block wins (draft first, final later)', () => {
    const r = extractJson(`${fence({ a: 1 })}\nispravka:\n${fence({ a: 2 })}`)
    expect(r).toEqual({ ok: true, value: { a: 2 } })
  })
  it('braces inside strings do not break balancing', () => {
    const r = extractJson('{"summary": "tekst sa } u sredini", "activities": []}')
    expect(r.ok).toBe(true)
  })
  it('empty, no JSON, broken JSON', () => {
    expect(extractJson('   ')).toEqual({ ok: false, reason: 'empty' })
    expect(extractJson('Samo priča bez ikakvog JSON-a.')).toEqual({ ok: false, reason: 'none' })
    const bad = extractJson('```json\n{"a": 1,,}\n```')
    expect(bad).toMatchObject({ ok: false, reason: 'invalid' })
  })
})

describe('parseAiResponse (shared by API and manual mode)', () => {
  it('accepts a valid plan', () => {
    const r = parseAiResponse('plan-dana', `Pitanja… odgovori… ${fence(goodPlan)}`)
    expect(r.ok).toBe(true)
  })
  it('explains what to ask Claude when empty / no JSON / invalid / wrong schema', () => {
    expect(parseAiResponse('plan-dana', '')).toMatchObject({
      ok: false,
      message: expect.stringContaining('prazno'),
    })
    expect(parseAiResponse('plan-dana', 'nema ničega')).toMatchObject({
      message: expect.stringContaining('Napiši Claude-u'),
    })
    expect(parseAiResponse('plan-dana', '```json\n{oops}\n```')).toMatchObject({
      message: expect.stringContaining('nije ispravan'),
    })
    const wrong = parseAiResponse(
      'plan-dana',
      fence({
        summary: 'x',
        activities: [{ title: 't', category: 'nesto', date: 'sutra', start: '1', end: '2' }],
      }),
    )
    expect(wrong).toMatchObject({ ok: false, message: expect.stringContaining('ne prati šemu') })
  })
  it('validates other kinds', () => {
    expect(parseAiResponse('rezime', fence({ summary: 'ok', tips: ['a', 'b', 'c'] })).ok).toBe(true)
    expect(parseAiResponse('rezime', fence({ summary: 'ok', tips: [] })).ok).toBe(false)
    expect(
      parseAiResponse(
        'uvoz',
        fence({
          assessments: [{ subject: 'Mata', type: 'kolokvijum', title: 'K1', date: '2026-11-20' }],
        }),
      ).ok,
    ).toBe(true)
    expect(
      parseAiResponse(
        'uvoz',
        fence({
          assessments: [{ subject: 'Mata', type: 'test', title: 'K1', date: '2026-11-20' }],
        }),
      ).ok,
    ).toBe(false)
    expect(
      parseAiResponse(
        'trening',
        fence({
          name: 'PPL',
          days: [{ day: 1, title: 'Push', exercises: [{ name: 'Bench', sets: 4, reps: '8' }] }],
        }),
      ).ok,
    ).toBe(true)
    expect(
      parseAiResponse(
        'trening',
        fence({ name: 'PPL', days: [{ day: 9, title: 'x', exercises: [] }] }),
      ).ok,
    ).toBe(false)
  })
})

describe('prompt generation', () => {
  const data: AppData = { ...emptyData(), ...makeDemoData(TODAY) } as AppData
  data.settings = { ...data.settings, name: 'Vuk', wakeTime: '09:00', bedTime: '01:00' }
  it('includes my data, schema, tone rules and the ask-questions-first request', () => {
    const { manualText } = buildPrompt('plan-nedelje', data, TODAY, { manual: true })
    expect(manualText).toContain('Matematika 1 (primer)')
    expect(manualText).toContain('"activities"')
    expect(manualText).toContain(systemPrompt().slice(0, 40))
    expect(manualText).toContain(manualQuestions())
    expect(manualText).toContain('JSON')
  })
  it('API prompt does not ask questions first', () => {
    const { user } = buildPrompt('plan-dana', data, TODAY)
    expect(user).not.toContain(manualQuestions())
  })
  it('import prompt carries the pasted text', () => {
    const { user } = buildPrompt('uvoz', data, TODAY, {
      manual: false,
      text: 'MAT1 kolokvijum 20.11.',
    })
    expect(user).toContain('MAT1 kolokvijum 20.11.')
  })
  it('never invents data: empty app gives an empty-ish context', () => {
    expect(buildContext(emptyData(), TODAY)).toContain('nema unetih')
  })
  it('tone: strict with an unregistered exam, support with little sleep, else friendly', () => {
    expect(toneHint(emptyData(), TODAY)).toBe('friendly')
    expect(toneHint(data, TODAY)).toBe('strict') // demo exam is unregistered, deadline within 7 days
    const tired = emptyData()
    tired.sleep = [
      {
        id: 's',
        date: TODAY,
        bedtime: '2026-11-06T03:00:00',
        wakeTime: '2026-11-06T08:00:00',
        quality: 2,
        source: 'manual',
      },
    ]
    expect(toneHint(tired, TODAY)).toBe('support')
  })
})

const okResponse = (text: string, usage = { input_tokens: 100, output_tokens: 50 }) =>
  ({
    ok: true,
    status: 200,
    json: async () => ({ content: [{ type: 'text', text }], usage }),
  }) as unknown as Response

describe('callClaude (mocked fetch)', () => {
  it('sends the right headers and body, returns text and tokens', async () => {
    const f = vi.fn().mockResolvedValue(okResponse('zdravo'))
    const r = await callClaude({
      apiKey: 'sk-test',
      model: 'm',
      system: 's',
      user: 'u',
      fetchImpl: f,
    })
    expect(r).toEqual({ text: 'zdravo', inputTokens: 100, outputTokens: 50 })
    const [url, init] = f.mock.calls[0]
    expect(url).toBe(API_URL)
    expect(init.headers['x-api-key']).toBe('sk-test')
    expect(init.headers['anthropic-version']).toBeTruthy()
    expect(init.headers['anthropic-dangerous-direct-browser-access']).toBe('true')
    expect(JSON.parse(init.body)).toMatchObject({
      model: 'm',
      system: 's',
      messages: [{ role: 'user', content: 'u' }],
    })
  })
  it('no key -> AiError no-key, no network call', async () => {
    const f = vi.fn()
    await expect(
      callClaude({ apiKey: ' ', model: 'm', system: '', user: '', fetchImpl: f }),
    ).rejects.toMatchObject({ kind: 'no-key' })
    expect(f).not.toHaveBeenCalled()
  })
  it('offline, 401, 429, 500', async () => {
    const run = (f: typeof fetch) =>
      callClaude({ apiKey: 'k', model: 'm', system: '', user: '', fetchImpl: f })
    await expect(run(vi.fn().mockRejectedValue(new TypeError('fail')))).rejects.toMatchObject({
      kind: 'offline',
    })
    const status = (s: number) =>
      vi.fn().mockResolvedValue({
        ok: false,
        status: s,
        json: async () => ({ error: { message: 'x' } }),
      })
    await expect(run(status(401))).rejects.toMatchObject({ kind: 'auth' })
    await expect(run(status(429))).rejects.toMatchObject({ kind: 'rate' })
    await expect(run(status(500))).rejects.toBeInstanceOf(AiError)
  })
})

describe('runApi', () => {
  const data = emptyData()
  data.settings.apiKey = 'sk-test'
  it('valid answer -> parsed plan; uses the strong model for planning, fast for entry', async () => {
    const f = vi.fn().mockResolvedValue(okResponse(`Evo:\n${fence(goodPlan)}`))
    const r = await runApi('plan-dana', data, TODAY, '', f)
    expect(r.parsed.ok).toBe(true)
    expect(r.model).toBe(data.settings.modelStrong)
    expect(modelFor('unos', data.settings)).toBe(data.settings.modelFast)
  })
  it('invalid JSON from the model -> clear message, no crash', async () => {
    const f = vi.fn().mockResolvedValue(okResponse('```json\n{ nije json }\n```'))
    const r = await runApi('plan-dana', data, TODAY, '', f)
    expect(r.parsed).toMatchObject({ ok: false, message: expect.stringContaining('nije ispravan') })
  })
  it('answer without JSON -> clear message', async () => {
    const f = vi.fn().mockResolvedValue(okResponse('Izvini, ne mogu.'))
    expect((await runApi('rezime', data, TODAY, '', f)).parsed.ok).toBe(false)
  })
})

describe('usage and cost', () => {
  it('accumulates within a month and resets in a new one', () => {
    const a = addUsage({ month: '', inputTokens: 0, outputTokens: 0, calls: 0 }, '2026-11', 100, 50)
    const b = addUsage(a, '2026-11', 10, 5)
    expect(b).toEqual({ month: '2026-11', inputTokens: 110, outputTokens: 55, calls: 2 })
    expect(addUsage(b, '2026-12', 1, 1)).toEqual({
      month: '2026-12',
      inputTokens: 1,
      outputTokens: 1,
      calls: 1,
    })
  })
  it('estimates cost only for known prices', () => {
    expect(estimateCost('claude-sonnet-5-5', 1_000_000, 1_000_000)).toBe(12)
    expect(estimateCost('nepoznat', 1, 1)).toBeNull()
  })
})

describe('applyAiResult', () => {
  const add = vi.fn(() => 'id1')
  const patch = vi.fn()
  beforeEach(() => {
    add.mockClear()
    patch.mockClear()
  })
  it('plan -> dashed suggestions from the AI', () => {
    const r = parseAiResponse('plan-dana', fence(goodPlan))
    if (!r.ok) throw new Error('bad')
    applyAiResult('plan-dana', r.data, { add, patch, subjects: [], workoutPlan: null } as never)
    expect(add).toHaveBeenCalledWith(
      'activities',
      expect.objectContaining({ source: 'ai', suggested: true }),
    )
  })
  it('import creates a missing subject and unregistered exams', () => {
    const r = parseAiResponse(
      'uvoz',
      fence({
        assessments: [{ subject: 'Fizika', type: 'kolokvijum', title: 'K1', date: '2026-11-20' }],
      }),
    )
    if (!r.ok) throw new Error('bad')
    applyAiResult('uvoz', r.data, { add, patch, subjects: [], workoutPlan: null } as never)
    expect(add).toHaveBeenCalledWith('subjects', expect.objectContaining({ name: 'Fizika' }))
    expect(add).toHaveBeenCalledWith(
      'assessments',
      expect.objectContaining({ registration: 'nije-prijavljen' }),
    )
  })
  it('workout plan is stored with source ai', () => {
    const r = parseAiResponse(
      'trening',
      fence({ name: 'PPL', days: [{ day: 1, title: 'Push', exercises: [] }] }),
    )
    if (!r.ok) throw new Error('bad')
    applyAiResult('trening', r.data, { add, patch, subjects: [], workoutPlan: null } as never)
    expect(patch).toHaveBeenCalledWith({ workoutPlan: expect.objectContaining({ source: 'ai' }) })
  })
})
