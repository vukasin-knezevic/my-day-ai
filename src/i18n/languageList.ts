// The languages the app offers (the code and the name of each in its own language). A new language is a
// new file in `locales/` AND a line here, so the picker can show it without downloading every language;
// a test checks that this list and the folder agree.
export const LANGUAGE_LIST: { code: string; name: string }[] = [
  { code: 'de', name: 'Deutsch' },
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'ru', name: 'Русский' },
  { code: 'sr-Cyrl', name: 'Српски (ћирилица)' },
  { code: 'sr-Latn', name: 'Srpski (latinica)' },
]
