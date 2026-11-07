import { vocative } from './vocative'

describe('vocative', () => {
  it.each([
    ['Vukašin', 'Vukašine'],
    ['Petar', 'Petre'],
    ['Milica', 'Milice'],
    ['Marko', 'Marko'],
    ['Ana', 'Ana'],
    ['Nikola', 'Nikola'],
    ['Luka', 'Luka'],
    ['Stefan', 'Stefane'],
    ['Miloš', 'Miloše'],
    ['Đorđe', 'Đorđe'],
    ['Aleksandar', 'Aleksandre'],
    ['Lazar', 'Lazare'],
    ['Predrag', 'Predraže'],
    ['Vuk', 'Vuče'],
    ['Slavica', 'Slavice'],
    ['Jovan', 'Jovane'],
    ['Ognjen', 'Ognjene'],
  ])('%s -> %s', (name, voc) => {
    expect(vocative(name)).toBe(voc)
  })
  it('works in Cyrillic', () => {
    expect(vocative('Вукашин')).toBe('Вукашине')
    expect(vocative('Петар')).toBe('Петре')
    expect(vocative('Милица')).toBe('Милице')
    expect(vocative('Ана')).toBe('Ана')
    expect(vocative('Огњен')).toBe('Огњене')
  })
  it('changes only the first name and keeps the capital letter', () => {
    expect(vocative('Vukašin Knežević')).toBe('Vukašine')
    expect(vocative('  petar ')).toBe('petre')
    expect(vocative('Marko-Petar')).toBe('Marko-Petre')
  })
  it('empty stays empty', () => {
    expect(vocative('')).toBe('')
    expect(vocative('   ')).toBe('')
  })
})
