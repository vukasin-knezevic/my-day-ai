import type { z } from 'zod'
import { SCHEMAS, type AiKind, type AiResult } from './schemas'

export type Extracted =
  | { ok: true; value: unknown }
  | { ok: false; reason: 'empty' | 'none' | 'invalid'; detail?: string }

/** Finds the first balanced {...} starting at `start`, ignoring braces inside strings. */
function balanced(text: string, start: number): string | null {
  let depth = 0
  let inStr = false
  for (let i = start; i < text.length; i++) {
    const c = text[i]
    if (inStr) {
      if (c === '\\') i++
      else if (c === '"') inStr = false
    } else if (c === '"') inStr = true
    else if (c === '{') depth++
    else if (c === '}' && --depth === 0) return text.slice(start, i + 1)
  }
  return null
}

/**
 * Finds a JSON object inside a chat answer full of other text.
 * Prefers fenced code blocks (last valid one wins, because the final answer comes last),
 * then falls back to scanning for balanced braces.
 */
export function extractJson(text: string): Extracted {
  if (!text.trim()) return { ok: false, reason: 'empty' }
  let lastError = ''
  const candidates: string[] = []
  for (const m of text.matchAll(/```(?:json|JSON)?\s*\n?([\s\S]*?)```/g))
    candidates.push(m[1].trim())
  for (let i = text.indexOf('{'); i !== -1; i = text.indexOf('{', i + 1)) {
    const b = balanced(text, i)
    if (b) {
      candidates.push(b)
      i += b.length - 1
    }
  }
  if (!candidates.length) return { ok: false, reason: 'none' }
  const parsed: unknown[] = []
  for (const c of candidates) {
    try {
      const v = JSON.parse(c)
      if (v && typeof v === 'object') parsed.push(v)
    } catch (e) {
      lastError = (e as Error).message
    }
  }
  if (!parsed.length) return { ok: false, reason: 'invalid', detail: lastError }
  return { ok: true, value: parsed[parsed.length - 1] }
}

export type ParseResult =
  { ok: true; kind: AiKind; data: AiResult } | { ok: false; message: string }

function issues(err: z.ZodError): string {
  return err.issues
    .slice(0, 3)
    .map((i) => `${i.path.join('.') || '(koren)'}: ${i.message}`)
    .join('; ')
}

/** Extracts + validates. The error messages tell the user what to ask Claude. */
export function parseAiResponse(kind: AiKind, text: string): ParseResult {
  const ex = extractJson(text)
  if (!ex.ok) {
    if (ex.reason === 'empty')
      return { ok: false, message: 'Polje je prazno. Nalepi ceo odgovor iz chata.' }
    if (ex.reason === 'none')
      return {
        ok: false,
        message:
          'Nisam našao JSON u odgovoru. Napiši Claude-u: „Vrati samo JSON u bloku koda po zadatoj šemi."',
      }
    return {
      ok: false,
      message: `JSON nije ispravan (${ex.detail}). Napiši Claude-u: „Ispravi JSON, mora da bude validan, u jednom bloku koda."`,
    }
  }
  const r = SCHEMAS[kind].safeParse(ex.value)
  if (!r.success)
    return {
      ok: false,
      message: `JSON ne prati šemu (${issues(r.error)}). Napiši Claude-u: „Ispravi JSON da tačno prati šemu iz prompta."`,
    }
  return { ok: true, kind, data: r.data as AiResult }
}
