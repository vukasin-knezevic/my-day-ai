// Serbian (Cyrillic). Derived from the Latin text by transliteration (the mapping is 1:1),
// so a fix in sr-Latn.ts automatically appears here too. A key can still be overridden by hand
// in `overrides`. Prompts and JSON schemas for the AI stay in Latin script on purpose (the JSON
// keys must not change); only the language rule tells the model to answer in Cyrillic.
import { sr } from 'date-fns/locale'
import type { LocaleModule } from '../index'
import { latinToCyrillic } from '../translit'
import srLatnLocale, { type MessageKey } from './sr-Latn'

const overrides: Partial<Record<MessageKey, string>> = {
  'prompt.langRule': 'Pišeš na srpskom (ćirilica), kratko, sa emotikonima.',
  'prompt.chat.instruction': 'Odgovori kratko (do 6 rečenica), konkretno, na srpskom (ćirilicom).',
}

const KEEP_LATIN = /^(prompt|schema|zod|date)\./

const messages = Object.fromEntries(
  Object.entries(srLatnLocale.messages).map(([key, text]) => [
    key,
    overrides[key as MessageKey] ?? (KEEP_LATIN.test(key) ? text : latinToCyrillic(text)),
  ]),
) as Record<MessageKey, string>

const locale: LocaleModule = {
  code: 'sr-Cyrl',
  name: 'Српски (ћирилица)',
  dateLocale: sr,
  messages,
  feminine: Object.fromEntries(
    Object.entries(srLatnLocale.feminine ?? {}).map(([k, v]) => [k, latinToCyrillic(v)]),
  ),
}
export default locale
