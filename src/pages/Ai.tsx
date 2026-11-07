import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useShallow } from 'zustand/react/shallow'
import { selectData, useStore } from '../store'
import { Button, Card, Field, Input, PageTitle } from '../components/ui'
import { FieldContext, invalidCls } from '../components/fieldContext'
import { todayStr, monthOf } from '../lib/dates'
import { buildContext, buildPrompt, kindLabel, systemPrompt } from '../lib/ai/prompt'
import { useT } from '../i18n'
import { parseAiResponse } from '../lib/ai/extract'
import { runApi, runChat } from '../lib/ai/run'
import { applyAiResult } from '../lib/ai/apply'
import { addUsage } from '../lib/ai/usage'
import { AiError } from '../lib/ai/client'
import type {
  AiKind,
  AiResult,
  ImportResult,
  PlanResult,
  SummaryResult,
  WorkoutPlanResult,
} from '../lib/ai/schemas'

const KINDS: AiKind[] = ['plan-dana', 'plan-nedelje', 'unos', 'uvoz', 'rezime', 'trening']
const NEEDS_TEXT: Partial<Record<AiKind, 'ai.needs.unos' | 'ai.needs.uvoz'>> = {
  unos: 'ai.needs.unos',
  uvoz: 'ai.needs.uvoz',
}

function Preview({ kind, data }: { kind: AiKind; data: AiResult }) {
  const { t } = useT()
  if (kind === 'rezime') {
    const r = data as SummaryResult
    return (
      <div className="space-y-1 text-sm">
        <p>{r.summary}</p>
        <ul className="list-disc pl-5">
          {r.tips.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </div>
    )
  }
  if (kind === 'uvoz') {
    return (
      <ul className="list-disc pl-5 text-sm">
        {(data as ImportResult).assessments.map((a, i) => (
          <li key={i}>
            {a.date} · {a.subject} · {a.title} ({a.type})
          </li>
        ))}
      </ul>
    )
  }
  if (kind === 'trening') {
    const w = data as WorkoutPlanResult
    return (
      <div className="text-sm">
        <strong>{w.name}</strong>
        <ul className="list-disc pl-5">
          {w.days.map((d) => (
            <li key={d.day + d.title}>
              {t('ai.day', {
                d: d.day,
                title: d.title,
                exercises: t('ai.exercises', { n: d.exercises.length }),
              })}
            </li>
          ))}
        </ul>
      </div>
    )
  }
  const p = data as PlanResult
  return (
    <div className="space-y-1 text-sm">
      <p>{p.summary}</p>
      <ul className="list-disc pl-5">
        {p.activities.map((a, i) => (
          <li key={i}>
            {a.date} {a.start}–{a.end} · {a.title}
          </li>
        ))}
      </ul>
      {p.notes?.map((n) => (
        <p key={n} className="text-slate-500">
          {n}
        </p>
      ))}
    </div>
  )
}

export default function Ai() {
  const { t } = useT()
  const data = useStore(useShallow(selectData))
  const store = useStore()
  const today = todayStr()
  const [params] = useSearchParams()
  const initial = params.get('k') as AiKind | null
  const [kind, setKind] = useState<AiKind>(
    initial && KINDS.includes(initial) ? initial : 'plan-dana',
  )
  const [text, setText] = useState('')
  const [textError, setTextError] = useState('')
  const [pasted, setPasted] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [result, setResult] = useState<{ kind: AiKind; data: AiResult } | null>(null)
  const apiReady = data.settings.aiMode === 'api' && data.settings.apiKey.trim() !== ''
  const needsText = NEEDS_TEXT[kind]

  const manualPrompt = () => buildPrompt(kind, data, today, { manual: true, text }).manualText

  async function copy(content: string) {
    try {
      await navigator.clipboard.writeText(content)
      setInfo(t('ai.copied'))
    } catch {
      setInfo(t('ai.copyFail'))
      setPasted((p) => p)
    }
  }

  function handleParsed(r: ReturnType<typeof parseAiResponse>) {
    if (r.ok) {
      setResult({ kind: r.kind, data: r.data })
      setError('')
    } else {
      setResult(null)
      setError(r.message)
    }
  }

  /** The text this kind of request needs is empty: say so instead of doing nothing. */
  function textMissing() {
    if (!needsText || text.trim()) return false
    setTextError(t('common.required'))
    return true
  }

  async function sendApi() {
    if (textMissing()) return
    setBusy(true)
    setError('')
    setInfo('')
    try {
      const r = await runApi(kind, data, today, text)
      store.patch({
        aiUsage: addUsage(data.aiUsage, monthOf(today), r.reply.inputTokens, r.reply.outputTokens),
      })
      handleParsed(r.parsed)
    } catch (e) {
      setError(e instanceof AiError ? e.message : t('ai.unexpected'))
    } finally {
      setBusy(false)
    }
  }

  function accept() {
    if (!result) return
    setInfo(applyAiResult(result.kind, result.data, store))
    if (result.kind !== 'rezime') setResult(null)
  }

  return (
    <>
      <PageTitle sub={apiReady ? t('ai.sub.api') : t('ai.sub.manual')}>🤖 AI</PageTitle>

      <div className="mb-4 flex flex-wrap gap-2">
        {KINDS.map((k) => (
          <button
            key={k}
            aria-pressed={kind === k}
            onClick={() => {
              setKind(k)
              setResult(null)
              setError('')
              setInfo('')
            }}
            className={`min-h-10 rounded-xl px-3 text-sm font-medium ${kind === k ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}
          >
            {kindLabel(k)}
          </button>
        ))}
      </div>

      <Card className="mb-4 space-y-3">
        {needsText && (
          <Field label={t(needsText)} required error={textError}>
            <textarea
              aria-invalid={!!textError || undefined}
              className={`min-h-24 w-full rounded-xl border border-slate-300 bg-white p-3 dark:border-slate-700 dark:bg-slate-800 ${textError ? invalidCls : ''}`}
              value={text}
              onChange={(e) => {
                setText(e.target.value)
                setTextError('')
              }}
            />
          </Field>
        )}
        <div className="flex flex-wrap gap-2">
          {apiReady && (
            <Button onClick={sendApi} disabled={busy}>
              {busy ? t('ai.sending') : t('ai.send')}
            </Button>
          )}
          <Button
            variant="soft"
            onClick={() => {
              if (!textMissing()) copy(manualPrompt())
            }}
          >
            {t('ai.copy')}
          </Button>
          <a
            href="https://claude.ai/new"
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-10 items-center rounded-xl px-4 text-sm font-medium text-blue-700 underline dark:text-blue-300"
          >
            {t('ai.open')}
          </a>
        </div>
        <Field label={t('ai.pasteLabel')}>
          <textarea
            aria-label={t('ai.pasteAria')}
            className="min-h-28 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-800"
            placeholder={t('ai.pastePlaceholder')}
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
          />
        </Field>
        <Button onClick={() => handleParsed(parseAiResponse(kind, pasted))}>{t('ai.check')}</Button>
        {info && (
          <p role="status" className="text-sm">
            {info}
          </p>
        )}
        {error && (
          <p role="alert" className="rounded-xl bg-red-100 p-3 text-sm text-red-900">
            {error}
          </p>
        )}
      </Card>

      {result && (
        <Card className="mb-4">
          <h2 className="mb-2 font-semibold">{t('ai.suggestion')}</h2>
          <Preview kind={result.kind} data={result.data} />
          {result.kind !== 'rezime' && (
            <Button className="mt-3" onClick={accept}>
              {t('today.accept')}
            </Button>
          )}
        </Card>
      )}

      <Chat apiReady={apiReady} />
    </>
  )
}

function Chat({ apiReady }: { apiReady: boolean }) {
  const { t } = useT()
  const data = useStore(useShallow(selectData))
  const store = useStore()
  const today = todayStr()
  const [q, setQ] = useState('')
  const [qError, setQError] = useState('')
  const [log, setLog] = useState<{ role: 'user' | 'assistant'; content: string }[]>([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [copied, setCopied] = useState(false)

  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (!q.trim()) {
      setQError(t('common.required'))
      return
    }
    setQError('')
    const question = q.trim()
    if (!apiReady) {
      const prompt = `${systemPrompt()}\n\n${t('prompt.dataHeader')}\n${buildContext(data, today)}\n\n${t('prompt.chat.question')}: ${question}`
      try {
        await navigator.clipboard.writeText(prompt)
        setCopied(true)
      } catch {
        setErr(t('ai.chat.copyFail'))
      }
      return
    }
    setBusy(true)
    setErr('')
    try {
      const { reply } = await runChat(data, today, log, question)
      store.patch({
        aiUsage: addUsage(data.aiUsage, monthOf(today), reply.inputTokens, reply.outputTokens),
      })
      setLog((l) => [
        ...l,
        { role: 'user', content: question },
        { role: 'assistant', content: reply.text },
      ])
      setQ('')
    } catch (e2) {
      setErr(e2 instanceof AiError ? e2.message : t('ai.chat.error'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <h2 className="mb-2 font-semibold">{t('ai.chat.title')}</h2>
      <ul className="mb-3 space-y-2 text-sm">
        {log.map((m, i) => (
          <li
            key={i}
            className={
              m.role === 'user' ? 'font-medium' : 'rounded-xl bg-slate-100 p-2 dark:bg-slate-800'
            }
          >
            {m.content}
          </li>
        ))}
      </ul>
      <form onSubmit={send} className="flex gap-2">
        <div className="flex-1">
          <FieldContext.Provider value={{ required: false, invalid: !!qError }}>
            <Input
              aria-label={t('ai.chat.aria')}
              placeholder={t('ai.chat.placeholder')}
              value={q}
              onChange={(e) => {
                setQ(e.target.value)
                setQError('')
              }}
            />
          </FieldContext.Provider>
          {qError && (
            <p role="alert" className="mt-1 text-xs text-red-700 dark:text-red-400">
              {qError}
            </p>
          )}
        </div>
        <Button type="submit" disabled={busy}>
          {apiReady ? t('ai.chat.send') : t('ai.chat.copyQuestion')}
        </Button>
      </form>
      {copied && !apiReady && (
        <p role="status" className="mt-2 text-sm">
          {t('ai.chat.copied')}
        </p>
      )}
      {err && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {err}
        </p>
      )}
      {!apiReady && <p className="mt-2 text-xs text-slate-500">{t('ai.chat.manualNote')}</p>}
    </Card>
  )
}
