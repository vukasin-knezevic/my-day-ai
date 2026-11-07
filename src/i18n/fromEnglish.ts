// Helper for languages translated from the English file.
// Every UI text must be translated (TypeScript checks it). The AI prompts (`prompt.*`) and the JSON
// schemas (`schema.*`) stay in English on purpose: the model understands them in any language and the
// JSON keys must not change. Only the two language rules tell the model which language to answer in.
import en from './locales/en'
import type { MessageKey } from './locales/sr-Latn'

type Technical = Extract<MessageKey, `prompt.${string}` | `schema.${string}`>
export type OwnMessages = Record<Exclude<MessageKey, Technical>, string> &
  Record<'prompt.langRule' | 'prompt.chat.instruction', string>

export function fromEnglish(own: OwnMessages): Record<MessageKey, string> {
  return { ...en.messages, ...own }
}
