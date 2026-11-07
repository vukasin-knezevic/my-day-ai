import type { z } from 'zod'
import { t } from '../../i18n'
import { SCHEMAS, type AiKind, type AiResult } from './schemas'

export type Extracted =
  /** `values` are all JSON objects found, best guess first */
  | { ok: true; values: unknown[] }
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

const fencedBlocks = (text: string) =>
  [...text.matchAll(/```(?:json|JSON)?\s*\n?([\s\S]*?)```/g)].map((m) => m[1].trim())

function bareObjects(text: string): string[] {
  const found: string[] = []
  for (let i = text.indexOf('{'); i !== -1; i = text.indexOf('{', i + 1)) {
    const b = balanced(text, i)
    if (b) {
      found.push(b)
      i += b.length - 1
    }
  }
  return found
}

/**
 * Finds JSON objects inside a chat answer full of other text.
 * Fenced code blocks come first and later ones beat earlier ones, because the final answer
 * comes last. Only an answer without a usable code block is scanned for bare braces.
 */
export function extractJson(text: string): Extracted {
  if (!text.trim()) return { ok: false, reason: 'empty' }
  let lastError = ''
  const parse = (candidates: string[]) =>
    candidates.flatMap((c) => {
      try {
        const v: unknown = JSON.parse(c)
        return v && typeof v === 'object' ? [v] : []
      } catch (e) {
        lastError = (e as Error).message
        return []
      }
    })
  const fenced = fencedBlocks(text)
  const bare = bareObjects(text)
  if (!fenced.length && !bare.length) return { ok: false, reason: 'none' }
  const values = parse(fenced)
  const usable = values.length ? values : parse(bare)
  if (!usable.length) return { ok: false, reason: 'invalid', detail: lastError }
  return { ok: true, values: usable.reverse() }
}

export type ParseResult =
  { ok: true; kind: AiKind; data: AiResult } | { ok: false; message: string }

function issues(err: z.ZodError): string {
  return err.issues
    .slice(0, 3)
    .map((i) => `${i.path.join('.') || t('aiparse.root')}: ${i.message}`)
    .join('; ')
}

/** Extracts + validates. The error messages tell the user what to ask Claude. */
export function parseAiResponse(kind: AiKind, text: string): ParseResult {
  const ex = extractJson(text)
  if (!ex.ok) {
    if (ex.reason === 'empty') return { ok: false, message: t('aiparse.empty') }
    if (ex.reason === 'none') return { ok: false, message: t('aiparse.none') }
    return {
      ok: false,
      message: t('aiparse.invalid', { detail: ex.detail ?? '' }),
    }
  }
  // the first object that really is the answer wins: drafts and examples around it do not matter
  const results = ex.values.map((v) => SCHEMAS[kind].safeParse(v))
  const valid = results.find((r) => r.success)
  if (valid) return { ok: true, kind, data: valid.data as AiResult }
  const failed = results.find((r) => !r.success)
  return {
    ok: false,
    message: t('aiparse.schema', { detail: failed ? issues(failed.error) : '' }),
  }
}
