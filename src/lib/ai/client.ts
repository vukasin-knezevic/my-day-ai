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
    public kind: 'no-key' | 'offline' | 'auth' | 'rate' | 'cors' | 'http' | 'refusal',
  ) {
    super(message)
  }
}

export async function callClaude(c: ClaudeCall): Promise<ClaudeReply> {
  if (!c.apiKey.trim()) throw new AiError('Nema API ključa. Koristi ručni režim.', 'no-key')
  const f = c.fetchImpl ?? fetch
  let res: Response
  try {
    res = await f(API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': c.apiKey.trim(),
        'anthropic-version': API_VERSION,
        // opt-in required by Anthropic for calls straight from a browser
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: c.model,
        max_tokens: c.maxTokens ?? 4000,
        system: c.system,
        messages: [{ role: 'user', content: c.user }],
      }),
    })
  } catch {
    throw new AiError(
      'Nema veze sa Anthropic serverom (offline ili je pregledač blokirao poziv). Koristi ručni režim.',
      'offline',
    )
  }
  if (!res.ok) {
    let detail = ''
    try {
      detail = ((await res.json()) as { error?: { message?: string } }).error?.message ?? ''
    } catch {
      /* ignore */
    }
    if (res.status === 401 || res.status === 403)
      throw new AiError(`Ključ nije prihvaćen (${res.status}). ${detail}`, 'auth')
    if (res.status === 429) throw new AiError('Previše zahteva (429). Pokušaj za minut.', 'rate')
    throw new AiError(`Greška API-ja ${res.status}: ${detail}`, 'http')
  }
  const body = (await res.json()) as {
    content?: { type: string; text?: string }[]
    usage?: { input_tokens?: number; output_tokens?: number }
    stop_reason?: string
  }
  if (body.stop_reason === 'refusal')
    throw new AiError('Model je odbio zahtev (refusal).', 'refusal')
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
