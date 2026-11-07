import { parseQuick, normalize } from './quickParse'

// Friday, 6 Nov 2026, 14:20
const NOW = new Date(2026, 10, 6, 14, 20)
const p = (s: string) => parseQuick(s, NOW)

describe('normalize', () => {
  it('strips diacritics and keeps length', () => {
    expect(normalize('Učenje ŠĐŽČĆ')).toBe('ucenje sdzcc')
    expect(normalize('čćšžđ')).toHaveLength(5)
  })
})

describe('activities: time', () => {
  it('range 18-19:30', () => {
    expect(p('trening 18-19:30')).toMatchObject({
      kind: 'activity',
      category: 'workout',
      date: '2026-11-06',
      start: '18:00',
      end: '19:30',
      title: 'Trening',
    })
  })
  it('range with minutes both sides', () => {
    expect(p('učenje 10:15-12:00')).toMatchObject({
      start: '10:15',
      end: '12:00',
      category: 'study',
    })
  })
  it('range with "do"', () => {
    expect(p('trening od 17 do 18:30')).toMatchObject({ start: '17:00', end: '18:30' })
  })
  it('single time 18:30 uses default duration of the category', () => {
    expect(p('trening 18:30')).toMatchObject({ start: '18:30', end: '20:00' })
  })
  it('18h is a time', () => {
    expect(p('trening 18h')).toMatchObject({ start: '18:00', end: '19:30' })
  })
  it('"u 7h" is a time because of the preposition', () => {
    expect(p('učenje u 7h')).toMatchObject({ start: '07:00' })
  })
  it('bare hour with an activity word', () => {
    expect(p('ručak 14')).toMatchObject({ kind: 'activity', category: 'food', start: '14:00' })
  })
  it('range crossing midnight is clipped to end of day', () => {
    const r = p('igra 23-1')
    expect(r).toMatchObject({ kind: 'activity', category: 'games', start: '23:00' })
  })
  it('no time: starts at next full hour today', () => {
    expect(p('trening')).toMatchObject({ start: '15:00', end: '16:30' })
  })
})

describe('activities: dates', () => {
  it('danas', () => {
    expect(p('danas učenje 16-18')).toMatchObject({ date: '2026-11-06' })
  })
  it('sutra', () => {
    expect(p('sutra trening 18-19')).toMatchObject({ date: '2026-11-07' })
  })
  it('prekosutra', () => {
    expect(p('prekosutra učenje 10-12')).toMatchObject({ date: '2026-11-08' })
  })
  it('weekday name moves to the next such day', () => {
    expect(p('u ponedeljak predavanje 10-12')).toMatchObject({ date: '2026-11-09' })
    expect(p('utorak trening 18')).toMatchObject({ date: '2026-11-10' })
  })
  it('same weekday as today means next week', () => {
    expect(p('petak učenje 10-12')).toMatchObject({ date: '2026-11-13' })
  })
  it('short weekday names and diacritics', () => {
    expect(p('čet trening 19')).toMatchObject({ date: '2026-11-12' })
    expect(p('subotu igra 20-22')).toMatchObject({ date: '2026-11-07' })
  })
  it('future day without time defaults to 18:00', () => {
    expect(p('sutra trening')).toMatchObject({ start: '18:00', end: '19:30' })
  })
})

describe('activities: duration and title', () => {
  it('sutra učenje mata 2h', () => {
    expect(p('sutra učenje mata 2h')).toMatchObject({
      kind: 'activity',
      date: '2026-11-07',
      category: 'study',
      title: 'Učenje mata',
      start: '18:00',
      end: '20:00',
    })
  })
  it('1.5h and minutes', () => {
    expect(p('sutra učenje 1.5h')).toMatchObject({ start: '18:00', end: '19:30' })
    expect(p('sutra trening 45 min')).toMatchObject({ start: '18:00', end: '18:45' })
  })
  it('"2 sata"', () => {
    expect(p('učenje 2 sata')).toMatchObject({ start: '15:00', end: '17:00' })
  })
  it('time + duration', () => {
    expect(p('sutra učenje u 10 2h')).toMatchObject({ start: '10:00', end: '12:00' })
  })
  it('unknown word with a time becomes a generic activity', () => {
    expect(p('frizer 16-17')).toMatchObject({
      kind: 'activity',
      title: 'Frizer',
      start: '16:00',
      end: '17:00',
    })
  })
})

describe('expenses', () => {
  it('kafa 200', () => {
    expect(p('kafa 200')).toMatchObject({
      kind: 'expense',
      amount: 200,
      category: 'hrana',
      description: 'Kafa',
    })
  })
  it('with din / rsd', () => {
    expect(p('kafa 200 din')).toMatchObject({ kind: 'expense', amount: 200 })
    expect(p('450 rsd taxi')).toMatchObject({ kind: 'expense', amount: 450, category: 'prevoz' })
  })
  it('thousands separator', () => {
    expect(p('knjiga 1.200 din')).toMatchObject({ amount: 1200, category: 'faks' })
  })
  it('date for expense', () => {
    expect(p('juče pivo 300')).toMatchObject({
      kind: 'expense',
      date: '2026-11-05',
      category: 'izlasci',
    })
  })
  it('unknown category goes to ostalo', () => {
    expect(p('poklon 2500')).toMatchObject({ kind: 'expense', amount: 2500, category: 'ostalo' })
  })
  it('big number with an activity word is still an expense', () => {
    expect(p('ručak 350')).toMatchObject({ kind: 'expense', amount: 350, category: 'hrana' })
  })
})

describe('sleep', () => {
  it('legao 1:30', () => {
    expect(p('legao 1:30')).toMatchObject({ kind: 'sleep', event: 'bed', time: '01:30' })
  })
  it('ustao 9', () => {
    expect(p('ustao 9')).toMatchObject({ kind: 'sleep', event: 'wake', time: '09:00' })
  })
  it('without time uses the current time', () => {
    expect(p('legao')).toMatchObject({ kind: 'sleep', event: 'bed', time: '14:20' })
  })
  it('"ustao u 9:15"', () => {
    expect(p('ustao u 9:15')).toMatchObject({ event: 'wake', time: '09:15' })
  })
})

describe('edge cases', () => {
  it('empty and gibberish', () => {
    expect(p('')).toMatchObject({ kind: 'unknown' })
    expect(p('   ')).toMatchObject({ kind: 'unknown' })
    expect(p('asdf qwer')).toMatchObject({ kind: 'unknown' })
  })
  it('is case insensitive', () => {
    expect(p('TRENING 18-19:30')).toMatchObject({ category: 'workout', start: '18:00' })
  })
})

describe('activities: recurrence', () => {
  it('every day', () => {
    expect(p('trening svaki dan u 18')).toMatchObject({
      kind: 'activity',
      title: 'Trening',
      start: '18:00',
      recurrence: 'daily',
    })
    expect(p('walk every day at 7')).toMatchObject({ recurrence: 'daily', start: '07:00' })
  })
  it('working days', () => {
    expect(p('učenje radnim danima 10-12')).toMatchObject({ recurrence: 'weekdays' })
    expect(p('study weekdays 10-12')).toMatchObject({ recurrence: 'weekdays' })
  })
  it('a named weekday is weekly and starts on that day', () => {
    expect(p('trening svakog ponedeljka u 18')).toMatchObject({
      recurrence: 'weekly',
      date: '2026-11-09',
    })
    expect(p('trening svake srede u 18')).toMatchObject({
      recurrence: 'weekly',
      date: '2026-11-11',
    })
    expect(p('gym every saturday at 10')).toMatchObject({
      recurrence: 'weekly',
      date: '2026-11-07',
    })
  })
  it('"svake nedelje" is weekly from today, not Sunday', () => {
    expect(p('trening svake nedelje u 18')).toMatchObject({
      recurrence: 'weekly',
      date: '2026-11-06',
      title: 'Trening',
    })
  })
  it('plain sentences stay one-off', () => {
    expect(p('trening u ponedeljak u 18')).not.toHaveProperty('recurrence')
    expect(p('svaki put trening u 18')).not.toHaveProperty('recurrence')
  })
})
