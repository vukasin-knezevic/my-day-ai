import type { AppData } from '../../types'
import { callClaude, type ChatMessage, type ClaudeReply } from './client'
import { parseAiResponse, type ParseResult } from './extract'
import { buildChatSystem, buildPrompt } from './prompt'
import type { AiKind } from './schemas'

const FAST_KINDS: (AiKind | 'chat')[] = ['unos', 'uvoz', 'chat']

/** Fast cheap model for text entry, import and chat, stronger one for planning. */
export function modelFor(
  kind: AiKind | 'chat',
  s: { modelFast: string; modelStrong: string },
): string {
  return FAST_KINDS.includes(kind) ? s.modelFast : s.modelStrong
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
  const { system, user } = buildPrompt(kind, data, today, text)
  const model = modelFor(kind, data.settings)
  const reply = await callClaude({
    apiKey: data.settings.apiKey,
    model,
    system,
    messages: [{ role: 'user', content: user }],
    fetchImpl,
  })
  return { parsed: parseAiResponse(kind, reply.text), reply, model }
}

export async function runChat(
  data: AppData,
  today: string,
  history: ChatMessage[],
  question: string,
  fetchImpl?: typeof fetch,
) {
  const model = modelFor('chat', data.settings)
  const reply = await callClaude({
    apiKey: data.settings.apiKey,
    model,
    system: buildChatSystem(data, today),
    messages: [...history, { role: 'user', content: question }],
    maxTokens: 4000,
    fetchImpl,
  })
  return { reply, model }
}
