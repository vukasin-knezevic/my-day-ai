import { t } from '../../i18n'

// Direct browser -> Anthropic Messages API call (plain fetch, no SDK).
// The API key lives only on this device. See README for the security warning.

export const API_URL = 'https://api.anthropic.com/v1/messages'
/** Version header value from the official API overview (docs, Nov 2026). */
export const API_VERSION = '2026-10-21'

export interface ClaudeCall {
  apiKey: string
  model: string
  system: string
  user: string
  maxTokens?: number
  fetchImpl?: typeof fetch
}
export interface ClaudeReply {
  text: string
  inputTokens: number
  outputTokens: number
}

export class AiError extends Error {
  constructor(
    message: string,
    public kind:
      | 'no-key'
      | 'offline'
      | 'timeout'
      | 'auth'
      | 'rate'
      | 'overloaded'
      | 'http'
      | 'refusal'
      | 'truncated',
  ) {
    super(message)
  }
}

/**
 * Current models think by default and thinking counts towards max_tokens,
 * so this must leave room well beyond the visible answer.
 */
export const DEFAULT_MAX_TOKENS = 16000
/** A non-streaming request with thinking can take a while, but must not hang forever. */
export const REQUEST_TIMEOUT_MS = 180_000

export async function callClaude(c: ClaudeCall): Promise<ClaudeReply> {
  if (!c.apiKey.trim()) throw new AiError(t('aierr.noKey'), 'no-key')
  const f = c.fetchImpl ?? fetch
  let res: Response
  try {
    res = await f(API_URL, {
      method: 'POST',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: {
        'content-type': 'application/json',
        'x-api-key': c.apiKey.trim(),
        'anthropic-version': API_VERSION,
        // opt-in required by Anthropic for calls straight from a browser
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: c.model,
        max_tokens: c.maxTokens ?? DEFAULT_MAX_TOKENS,
        system: c.system,
        messages: [{ role: 'user', content: c.user }],
      }),
    })
  } catch (e) {
    if ((e as Error)?.name === 'TimeoutError') throw new AiError(t('aierr.timeout'), 'timeout')
    throw new AiError(t('aierr.offline'), 'offline')
  }
  if (!res.ok) {
    let detail = ''
    try {
      detail = ((await res.json()) as { error?: { message?: string } }).error?.message ?? ''
    } catch {
      /* ignore */
    }
    if (res.status === 401 || res.status === 403)
      throw new AiError(t('aierr.auth', { status: res.status, detail }), 'auth')
    if (res.status === 429) throw new AiError(t('aierr.rate'), 'rate')
    if (res.status === 529) throw new AiError(t('aierr.overloaded'), 'overloaded')
    throw new AiError(t('aierr.http', { status: res.status, detail }), 'http')
  }
  const body = (await res.json()) as {
    content?: { type: string; text?: string }[]
    usage?: { input_tokens?: number; output_tokens?: number }
    stop_reason?: string
  }
  if (body.stop_reason === 'refusal') throw new AiError(t('aierr.refusal'), 'refusal')
  if (body.stop_reason === 'max_tokens') throw new AiError(t('aierr.truncated'), 'truncated')
  const text = (body.content ?? [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text ?? '')
    .join('\n')
  return {
    text,
    inputTokens: body.usage?.input_tokens ?? 0,
    outputTokens: body.usage?.output_tokens ?? 0,
  }
}
