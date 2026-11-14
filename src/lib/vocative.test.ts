import { vocative } from './vocative'
import { greetingName } from './greetingName'

describe('vocative (Serbian, automatic)', () => {
  it.each([
    // masculine, consonant: + e
    ['Vukašin', 'Vukašine'],
    ['Stefan', 'Stefane'],
    ['Miloš', 'Miloše'],
    ['Nenad', 'Nenade'],
    ['Jovan', 'Jovane'],
    ['Ognjen', 'Ognjene'],
    ['Dušan', 'Dušane'],
    ['Bojan', 'Bojane'],
    ['Zoran', 'Zorane'],
    ['Lazar', 'Lazare'],
    ['Uroš', 'Uroše'],
    ['Dragan', 'Dragane'],
    ['Mladen', 'Mladene'],
    ['Veselin', 'Veseline'],
    // palatalization
    ['Predrag', 'Predraže'],
    ['Vuk', 'Vuče'],
    // fleeting a
    ['Petar', 'Petre'],
    ['Aleksandar', 'Aleksandre'],
    ['Dimitar', 'Dimitre'],
    // masculine in -o / -e / -a: unchanged
    ['Marko', 'Marko'],
    ['Darko', 'Darko'],
    ['Đorđe', 'Đorđe'],
    ['Pavle', 'Pavle'],
    ['Nikola', 'Nikola'],
    ['Luka', 'Luka'],
    ['Ilija', 'Ilija'],
    ['Nemanja', 'Nemanja'],
    ['Kosta', 'Kosta'],
    // nicknames
    ['Pera', 'Pera'],
    ['Mika', 'Mika'],
    ['Žika', 'Žika'],
    ['Aca', 'Aca'],
    // feminine in -a: -o
    ['Ana', 'Ano'],
    ['Marija', 'Marijo'],
    ['Jelena', 'Jeleno'],
    ['Ivana', 'Ivano'],
    ['Maja', 'Majo'],
    ['Tamara', 'Tamaro'],
    ['Sanja', 'Sanjo'],
    ['Branka', 'Branko'],
    // feminine -ica -> -ice
    ['Milica', 'Milice'],
    ['Slavica', 'Slavice'],
    ['Jovica', 'Jovice'],
    // unsure: unchanged, never garbage
    ['Saša', 'Saša'],
    ['Vanja', 'Vanja'],
    ['Karmen', 'Karmen'],
    ['Andrej', 'Andrej'],
  ])('%s -> %s', (name, voc) => {
    expect(vocative(name)).toBe(voc)
  })

  it('works without diacritics and keeps the user own spelling', () => {
    expect(vocative('Vukasin')).toBe('Vukasine')
    expect(vocative('Milos')).toBe('Milose')
    expect(vocative('Djordje')).toBe('Djordje')
  })

  it('works in Cyrillic (derived from the Latin result)', () => {
    expect(vocative('Вукашин')).toBe('Вукашине')
    expect(vocative('Петар')).toBe('Петре')
    expect(vocative('Милица')).toBe('Милице')
    expect(vocative('Ана')).toBe('Ано')
    expect(vocative('Марко')).toBe('Марко')
    expect(vocative('Огњен')).toBe('Огњене')
    expect(vocative('Предраг')).toBe('Предраже')
  })

  it('ignores case and extra spaces, uses only the first word', () => {
    expect(vocative('Vukašin Knežević')).toBe('Vukašine')
    expect(vocative('  petar ')).toBe('petre')
    expect(vocative('STEFAN')).toBe('STEFANE')
    expect(vocative('ana   marija')).toBe('ano')
    expect(vocative('Marko-Petar')).toBe('Marko-Petre')
  })

  it('never produces garbage for odd input', () => {
    expect(vocative('')).toBe('')
    expect(vocative('   ')).toBe('')
    expect(vocative('X')).toBe('X')
    expect(vocative('R2D2')).toBe('R2D2')
  })
})

describe('greetingName (by language)', () => {
  it('Serbian, Latin and Cyrillic: the vocative', () => {
    expect(greetingName('Vukašin', 'sr-Latn')).toBe('Vukašine')
    expect(greetingName('Vukašin', 'sr')).toBe('Vukašine')
    expect(greetingName('Вукашин', 'sr-Cyrl')).toBe('Вукашине')
    expect(greetingName('  Ana  Marić ', 'sr-Latn')).toBe('Ano')
  })

  it.each(['en', 'fr', 'es', 'de', 'ru'])('%s: the name unchanged', (lang) => {
    expect(greetingName('Vukašin', lang)).toBe('Vukašin')
    expect(greetingName('Vukasin', lang)).toBe('Vukasin')
    expect(greetingName('Petar', lang)).toBe('Petar')
    expect(greetingName('  Ana ', lang)).toBe('Ana')
    expect(greetingName('', lang)).toBe('')
  })
})
