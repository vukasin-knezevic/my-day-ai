import type { AppData } from '../../types'
import { callClaude, type ClaudeReply } from './client'
import { parseAiResponse, type ParseResult } from './extract'
import { buildContext, buildPrompt, SYSTEM_PROMPT } from './prompt'
import type { AiKind } from './schemas'

const FAST_KINDS: AiKind[] = ['unos', 'uvoz']

/** Fast cheap model for text entry/import, stronger one for planning. */
export function modelFor(
  kind: AiKind | 'chat',
  s: { modelFast: string; modelStrong: string },
): string {
  return kind !== 'chat' && FAST_KINDS.includes(kind) ? s.modelFast : s.modelStrong
}

export interface ApiRun {
  parsed: ParseResult
  reply: ClaudeReply
  model: string
}

/** API mode: same prompt builder and same parser as the manual mode. */
export async function runApi(
  kind: AiKind,
  data: AppData,
  today: string,
  text = '',
  fetchImpl?: typeof fetch,
): Promise<ApiRun> {
  const { system, user } = buildPrompt(kind, data, today, { manual: false, text })
  const model = modelFor(kind, data.settings)
  const reply = await callClaude({ apiKey: data.settings.apiKey, model, system, user, fetchImpl })
  return { parsed: parseAiResponse(kind, reply.text), reply, model }
}

export async function runChat(
  data: AppData,
  today: string,
  history: { role: 'user' | 'assistant'; content: string }[],
  question: string,
  fetchImpl?: typeof fetch,
) {
  const transcript = history
    .map((m) => `${m.role === 'user' ? 'Student' : 'Asistent'}: ${m.content}`)
    .join('\n')
  const user = `${buildContext(data, today)}\n\n${transcript ? transcript + '\n' : ''}Student: ${question}\n\nOdgovori kratko (do 6 rečenica), konkretno, na srpskom.`
  const model = modelFor('chat', data.settings)
  const reply = await callClaude({
    apiKey: data.settings.apiKey,
    model,
    system: SYSTEM_PROMPT,
    user,
    maxTokens: 1000,
    fetchImpl,
  })
  return { reply, model }
}
