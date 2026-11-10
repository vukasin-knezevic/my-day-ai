import { afterEach } from 'vitest'
import {
  LANGUAGES,
  LANGUAGE_LIST,
  loadLanguage,
  detectLanguage,
  getLanguage,
  resolveLanguage,
  setGender,
  setLanguage,
  t,
} from './index'
import { latinToCyrillic } from './translit'
import { formatLong, formatShort, weekdayName, monthName } from '../lib/dates'
import { planWeek } from '../lib/planner'
import { parseQuick } from '../lib/quickParse'
import { makeDemoData } from '../lib/demo'
import { currencyOf, rewardNameOf } from '../lib/labels'
import { fmtMoney } from '../lib/life'

afterEach(() => setLanguage('sr-Latn'))

const source = LANGUAGES.find((l) => l.code === 'sr-Latn')!
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()

describe('language list (A-23: languages load on demand)', () => {
  it('names every language file, with the same name the file has', () => {
    const files = Object.keys(import.meta.glob('./locales/*.ts')).map((f) =>
      f.replace('./locales/', '').replace('.ts', ''),
    )
    expect(LANGUAGE_LIST.map((l) => l.code).sort()).toEqual(files.sort())
    for (const l of LANGUAGE_LIST)
      expect(LANGUAGES.find((x) => x.code === l.code)?.name, l.code).toBe(l.name)
  })

  it('an unknown language is refused and a known one can be loaded again', async () => {
    expect(await loadLanguage('xx')).toBe(false)
    expect(await loadLanguage('de')).toBe(true)
    expect(resolveLanguage('de')).toBe('de')
    expect(resolveLanguage('nope')).toBe(detectLanguage())
  })
})

describe('translation files', () => {
  it('there are at least Serbian (Latin), English and Serbian (Cyrillic)', () => {
    const codes = LANGUAGES.map((l) => l.code)
    expect(codes).toEqual(expect.arrayContaining(['sr-Latn', 'en', 'sr-Cyrl']))
  })

  // This test FAILS when a language is missing a key (or has an extra one).
  for (const lang of LANGUAGES) {
    it(`${lang.code}: has exactly the same keys as sr-Latn`, () => {
      const want = Object.keys(source.messages).sort()
      const have = Object.keys(lang.messages).sort()
      expect(
        want.filter((k) => !have.includes(k)),
        'missing keys',
      ).toEqual([])
      expect(
        have.filter((k) => !want.includes(k)),
        'extra keys',
      ).toEqual([])
    })
    it(`${lang.code}: no empty texts and the same {placeholders} as sr-Latn`, () => {
      for (const [key, text] of Object.entries(lang.messages)) {
        expect(text.trim(), `${lang.code} ${key} is empty`).not.toBe('')
        expect(placeholders(text), `${lang.code} ${key}: placeholders differ`).toEqual(
          placeholders((source.messages as Record<string, string>)[key]),
        )
      }
    })
  }

  it('Cyrillic UI texts contain no leftover Latin words (except brands and exercise names)', () => {
    const cyr = LANGUAGES.find((l) => l.code === 'sr-Cyrl')!
    const allowed =
      /\{\w+\}|XP|AI|API|JSON|ICS|PR|Claude|Anthropic|Enter|Esc|Ctrl|Cmd|HH:mm|\.ics|sk-ant-…|https?:\/\/\S+|Bench press|Overhead press|Face pull|Leg press|Plank|Push|Pull|Full body|claude\.ai|YYYY-MM-DD|My Day AI|OS|kg|min|d|h|g|L/g
    const bad: string[] = []
    for (const [key, text] of Object.entries(cyr.messages)) {
      if (/^(prompt|schema|zod|date)\./.test(key)) continue
      const rest = text.replace(allowed, '')
      if (/[A-Za-zČĆŠŽĐčćšžđ]/.test(rest)) bad.push(`${key}: ${text}`)
    }
    expect(bad).toEqual([])
  })
})

describe('t()', () => {
  it('fills {placeholders}', () => {
    setLanguage('en')
    expect(t('xp.gain', { xp: 20, reason: 'Study' })).toBe('+20 XP · Study')
  })

  it('uses Serbian plural forms (1 / 2-4 / 5+)', () => {
    expect(t('when.inDays', { n: 1 })).toBe('za 1 dan')
    expect(t('when.inDays', { n: 3 })).toBe('za 3 dana')
    expect(t('when.inDays', { n: 5 })).toBe('za 5 dana')
    expect(t('when.inDays', { n: 21 })).toBe('za 21 dan')
    expect(t('when.inDays', { n: 12 })).toBe('za 12 dana')
  })

  it('uses English plural forms', () => {
    setLanguage('en')
    expect(t('when.inDays', { n: 1 })).toBe('in 1 day')
    expect(t('when.inDays', { n: 2 })).toBe('in 2 days')
    expect(t('day.classes', { n: 1 })).toBe('1 class')
    expect(t('day.classes', { n: 3 })).toBe('3 classes')
  })

  it('an unknown key shows the key itself (never crashes)', () => {
    expect(t('does.not.exist' as never)).toBe('does.not.exist')
  })
})

describe('language detection', () => {
  it('maps browser tags to supported languages', () => {
    expect(detectLanguage('en-US')).toBe('en')
    expect(detectLanguage('en')).toBe('en')
    expect(detectLanguage('sr-RS')).toBe('sr-Latn')
    expect(detectLanguage('sr')).toBe('sr-Latn')
    expect(detectLanguage('sr-Latn-RS')).toBe('sr-Latn')
    expect(detectLanguage('sr-Cyrl-RS')).toBe('sr-Cyrl')
    expect(detectLanguage('bs')).toBe('en') // unknown language -> English
  })
  it('a saved language wins, an empty setting means automatic', () => {
    expect(resolveLanguage('en')).toBe('en')
    expect(resolveLanguage('sr-Cyrl')).toBe('sr-Cyrl')
    expect(resolveLanguage('')).toBe(detectLanguage())
    expect(resolveLanguage('xx')).toBe(detectLanguage())
  })
  it('setLanguage changes the language and the <html lang>', () => {
    setLanguage('en')
    expect(getLanguage()).toBe('en')
    expect(document.documentElement.lang).toBe('en')
  })
})

describe('dates and names follow the language', () => {
  it('long and short dates', () => {
    expect(formatLong('2026-11-06')).toBe('Petak, 6. novembar')
    setLanguage('en')
    expect(formatLong('2026-11-06')).toBe('Friday, November 6')
    expect(formatShort('2026-11-06')).toBe('Nov 6')
    setLanguage('sr-Cyrl')
    expect(formatLong('2026-11-06')).toBe('Петак, 6. новембар')
  })
  it('weekday and month names', () => {
    expect(weekdayName(1)).toBe('Ponedeljak')
    expect(monthName(11)).toBe('Novembar')
    setLanguage('en')
    expect(weekdayName(1)).toBe('Monday')
    expect(monthName(11)).toBe('November')
    setLanguage('sr-Cyrl')
    expect(weekdayName(7)).toBe('Недеља')
  })
})

describe('transliteration', () => {
  it('converts letters and digraphs', () => {
    expect(latinToCyrillic('Dobrodošao')).toBe('Добродошао')
    expect(latinToCyrillic('Ljubav, njiva, džep, Đorđe')).toBe('Љубав, њива, џеп, Ђорђе')
    expect(latinToCyrillic('ČĆŠŽ čćšž')).toBe('ЧЋШЖ чћшж')
  })
  it('a lone h is the hour unit (ч), not the letter х', () => {
    expect(latinToCyrillic('za 2 h i 15 min, hodnik')).toBe(
      'за 2 ч и 15 мин, хоћник'.replace('хоћник', 'ходник'),
    )
  })
  it('keeps placeholders, markup and brand names in Latin', () => {
    expect(latinToCyrillic('Još {n} XP do **nivoa** za Claude')).toBe(
      'Још {n} XP до **нивоа** за Claude',
    )
  })
})

describe('app texts in other languages', () => {
  it('the planner explains itself in the chosen language', () => {
    setLanguage('en')
    const d = makeDemoData('2026-11-02')
    const r = planWeek({
      from: '2026-11-02',
      settings: {
        wakeTime: '09:00',
        bedTime: '01:00',
        studyHoursPerDay: 3,
        workoutsPerWeek: 3,
        rewardMinPerStudyHour: 30,
        rewardName: 'Series',
      },
      subjects: d.subjects!,
      assessments: d.assessments!,
      activities: [],
    })
    expect(r.suggestions.some((s) => s.title.startsWith('Study:'))).toBe(true)
    expect(r.suggestions.some((s) => s.title === 'Series (reward for studying)')).toBe(true)
    expect(r.notes.join(' ')).toMatch(/Easy day/)
  })

  it('the quick-entry parser understands English and Serbian', () => {
    const now = new Date(2026, 10, 6, 10, 0) // Friday
    expect(parseQuick('workout 18-19:30', now)).toMatchObject({
      kind: 'activity',
      category: 'workout',
      start: '18:00',
      end: '19:30',
    })
    expect(parseQuick('study math tomorrow 2 hours', now)).toMatchObject({
      kind: 'activity',
      category: 'study',
      date: '2026-11-07',
    })
    expect(parseQuick('coffee 200', now)).toMatchObject({ kind: 'expense', amount: 200 })
    expect(parseQuick('slept 1:30', now)).toMatchObject({
      kind: 'sleep',
      event: 'bed',
      time: '01:30',
    })
    expect(parseQuick('woke up 9', now)).toMatchObject({ kind: 'sleep', event: 'wake' })
    expect(parseQuick('gym on monday at 18', now)).toMatchObject({
      kind: 'activity',
      date: '2026-11-09',
      start: '18:00',
    })
    // Serbian still works
    expect(parseQuick('sutra učenje mata 2h', now)).toMatchObject({
      kind: 'activity',
      date: '2026-11-07',
    })
  })
})

describe('defaults that depend on the language', () => {
  it('reward name and currency: user choice wins, otherwise the language default', () => {
    expect(rewardNameOf({ rewardName: '' })).toBe('Vreme za zabavu')
    expect(rewardNameOf({ rewardName: 'PS5 vreme' })).toBe('PS5 vreme')
    expect(currencyOf({ currency: '' })).toBe('RSD')
    setLanguage('en')
    expect(rewardNameOf({ rewardName: '' })).toBe('Fun time')
    expect(rewardNameOf({ rewardName: 'PS5 time' })).toBe('PS5 time')
    expect(currencyOf({ currency: '' })).toBe('USD')
    expect(currencyOf({ currency: 'EUR' })).toBe('EUR')
  })
  it('numbers follow the language', () => {
    expect(fmtMoney(1234567, 'RSD')).toMatch(/^1\.234\.567 RSD$|^1\s?234\s?567 RSD$/)
    setLanguage('en')
    expect(fmtMoney(1234567, 'USD')).toBe('1,234,567 USD')
  })
})

describe('gender (feminine forms)', () => {
  afterEach(() => setGender('m'))
  it('masculine by default, feminine when chosen, other texts unchanged', () => {
    expect(t('life.wake')).toBe('🌅 Ustao')
    setGender('f')
    expect(t('life.wake')).toBe('🌅 Ustala')
    expect(t('progress.use', { n: 30 })).toBe('Iskoristila 30 min')
    expect(t('common.cancel')).toBe(source.messages['common.cancel'])
  })
  it('Cyrillic gets the feminine forms too', () => {
    setLanguage('sr-Cyrl')
    setGender('f')
    expect(t('life.wake')).toBe(latinToCyrillic('🌅 Ustala'))
  })
  it('every feminine key is a real key', () => {
    for (const lang of LANGUAGES)
      for (const k of Object.keys(lang.feminine ?? {}))
        expect(Object.keys(lang.messages)).toContain(k)
  })
})

describe('French, Spanish, German and Russian', () => {
  const NEW = ['fr', 'es', 'de', 'ru']
  const en = LANGUAGES.find((l) => l.code === 'en')!

  it('are there and are picked from the phone language', () => {
    expect(LANGUAGES.map((l) => l.code)).toEqual(expect.arrayContaining(NEW))
    expect(detectLanguage('fr-FR')).toBe('fr')
    expect(detectLanguage('es-MX')).toBe('es')
    expect(detectLanguage('de-AT')).toBe('de')
    expect(detectLanguage('ru-RU')).toBe('ru')
  })

  it('are really translated (not English copied): only prompts, schemas and a few names stay', () => {
    for (const code of NEW) {
      const lang = LANGUAGES.find((l) => l.code === code)!
      const keys = Object.keys(lang.messages).filter((k) => !/^(prompt|schema)\./.test(k))
      const same = keys.filter(
        (k) =>
          (lang.messages as Record<string, string>)[k] ===
          (en.messages as Record<string, string>)[k],
      )
      // identical texts are fine when they are only placeholders and symbols, or the quick-entry
      // example (the parser understands English and Serbian only, so the example stays English)
      const words = (k: string) =>
        (en.messages as Record<string, string>)[k].replace(/\{\w+\}/g, '').replace(/[^\p{L}]/gu, '')
      // a few real cognates remain (Transport, Description, Suggestion...), a copied file would have hundreds
      const copied = same.filter((k) => k !== 'today.quickPlaceholder' && words(k).length > 8)
      expect(copied.length, `${code}: ${copied.join(', ')}`).toBeLessThan(15)
    }
  })

  it('format dates, weekdays and durations in each language', () => {
    for (const code of NEW) {
      setLanguage(code)
      expect(formatLong('2026-11-07').length).toBeGreaterThan(5)
      expect(formatShort('2026-11-07')).toMatch(/\d/)
      expect(weekdayName(1).length).toBeGreaterThan(2)
      expect(monthName(11).length).toBeGreaterThan(2)
    }
  })

  it('Russian has the three plural forms', () => {
    setLanguage('ru')
    expect(t('when.inDays', { n: 1 })).toBe('через 1 день')
    expect(t('when.inDays', { n: 3 })).toBe('через 3 дня')
    expect(t('when.inDays', { n: 5 })).toBe('через 5 дней')
  })

  it('the AI is told to answer in the language', () => {
    expect(LANGUAGES.find((l) => l.code === 'de')!.messages['prompt.langRule']).toContain('Deutsch')
    expect(LANGUAGES.find((l) => l.code === 'fr')!.messages['prompt.chat.instruction']).toContain(
      'français',
    )
  })
})
