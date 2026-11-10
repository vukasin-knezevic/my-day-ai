import { studyHoursOf } from '../exams'
import type { AppData } from '../../types'
import { t } from '../../i18n'
import { categoryLabel, rewardNameOf } from '../labels'
import {
  addDaysStr,
  daysUntil,
  minToTime,
  nowMinutes,
  weekDates,
  weekdayName,
  weekdayOf,
} from '../dates'
import { buildAlerts, occurrencesOn } from '../schedule'
import { avgSleep } from '../life'
import { subjectPoints } from '../grades'
import { computeStreaks, rewardBalance } from '../xp'
import { workoutsDoneInWeek, proteinOn } from '../workout'
import { schemaText, type AiKind } from './schemas'

export type Tone = 'friendly' | 'strict' | 'support'

/** The assistant's tone rules (used in the API system prompt AND at the top of manual prompts). */
export function systemPrompt(): string {
  return [t('prompt.intro'), t('prompt.langRule'), '', t('prompt.rules')].join('\n')
}

/** Which tone fits the data. Pure and testable. */
export function toneHint(data: AppData, today: string): Tone {
  const alerts = buildAlerts(data, today)
  const avg = avgSleep(data.sleep, today)
  const lowSleep = avg !== null && avg < 6
  const lastDays = (d: string) => daysUntil(today, d) >= 0 && daysUntil(today, d) <= 3
  const skipped = data.activities.filter((a) =>
    a.recurrence === 'none'
      ? a.status === 'skipped' && lastDays(a.date)
      : (a.skippedDates ?? []).some(lastDays),
  ).length
  if (lowSleep) return 'support'
  if (alerts.some((a) => a.level === 'red') || skipped >= 3) return 'strict'
  return 'friendly'
}

const toneText = (tone: Tone) => t(`prompt.tone.${tone}`)

/** Compact text with this week's data. Contains only what the user entered. */
export function buildContext(data: AppData, today: string, nowMin = nowMinutes()): string {
  const s = data.settings
  const lines: string[] = []
  lines.push(t('prompt.ctx.today', { date: today, weekday: weekdayName(weekdayOf(today)) }))
  lines.push(t('prompt.ctx.now', { time: minToTime(nowMin) }))
  lines.push(
    t('prompt.ctx.profile', {
      name: s.name || t('prompt.ctx.unknownName'),
      wake: s.wakeTime,
      bed: s.bedTime,
      goal: s.sleepGoalHours,
    }),
  )
  lines.push(
    t('prompt.ctx.goals', { w: s.workoutsPerWeek, s: s.studyHoursPerDay, p: s.proteinGoal }),
  )
  lines.push(t('prompt.ctx.tone', { tone: toneText(toneHint(data, today)) }))
  lines.push('\n' + t('prompt.ctx.weekHeader'))
  for (const d of weekDates(today)) {
    const occ = occurrencesOn(data, d).filter((o) => !o.suggested && o.status !== 'skipped')
    const txt = occ.length
      ? occ
          .map(
            (o) =>
              `${o.start}-${o.end} ${categoryLabel(o.category)}: ${o.title}${o.status === 'done' ? t('prompt.ctx.done') : ''}`,
          )
          .join('; ')
      : t('prompt.ctx.none')
    lines.push(`- ${d} ${weekdayName(weekdayOf(d))}: ${txt}`)
  }
  const free = data.subjects.flatMap((sub) =>
    sub.slots
      .filter((x) => x.attendance === 'ne-idem')
      .map((x) =>
        t('prompt.ctx.freeSlot', {
          day: weekdayName(x.day),
          start: x.start,
          end: x.end,
          subject: sub.name,
        }),
      ),
  )
  if (free.length) lines.push('\n' + t('prompt.ctx.free') + ' ' + free.join('; '))
  lines.push('\n' + t('prompt.ctx.examsHeader'))
  const up = data.assessments
    .filter((a) => daysUntil(a.date, today) >= 0 && daysUntil(a.date, today) <= 30)
    .sort((a, b) => a.date.localeCompare(b.date))
  if (!up.length) lines.push(t('prompt.ctx.noExams'))
  for (const a of up) {
    const sub = data.subjects.find((x) => x.id === a.subjectId)?.name ?? '?'
    lines.push(
      t('prompt.ctx.exam', {
        date: a.date,
        title: a.title,
        subject: sub,
        type: a.type,
        d: a.difficulty,
        h: studyHoursOf(
          a,
          data.subjects.find((s) => s.id === a.subjectId),
        ),
        reg: a.registration,
      }) +
        (a.registrationDeadline ? t('prompt.ctx.deadline', { date: a.registrationDeadline }) : ''),
    )
  }
  const pts = data.subjects
    .map((sub) => ({ sub, p: subjectPoints(sub, data.assessments) }))
    .filter((x) => x.p.maxTotal > 0)
  if (pts.length)
    lines.push(
      '\n' +
        t('prompt.ctx.points') +
        ' ' +
        pts
          .map(({ sub, p }) =>
            t('prompt.ctx.pointsItem', {
              subject: sub.name,
              earned: p.earned,
              graded: p.maxGraded,
              missing: p.missingToPass,
            }),
          )
          .join('; '),
    )
  const avg = avgSleep(data.sleep, today)
  lines.push('\n' + t('prompt.ctx.sleep', { avg: avg ?? t('prompt.ctx.noData') }))
  const st = computeStreaks(data, today)
  lines.push(
    t('prompt.ctx.workout', {
      n: workoutsDoneInWeek(data, today),
      s: st.study,
      w: st.workout,
      sl: st.sleep,
      h: st.habits,
    }),
  )
  lines.push(t('prompt.ctx.food', { g: proteinOn(data.meals, today) }))
  lines.push(
    t('prompt.ctx.reward', {
      name: rewardNameOf(data.settings),
      bal: rewardBalance(data.progress),
      earned: data.progress.rewardEarnedMin,
    }),
  )
  const alerts = buildAlerts(data, today)
  if (alerts.length)
    lines.push('\n' + t('prompt.ctx.alerts') + ' ' + alerts.map((a) => a.text).join(' | '))
  return lines.join('\n')
}

const TASKS: Record<AiKind, (today: string, text: string) => string> = {
  'plan-dana': (d) => t('prompt.task.plan-dana', { date: d }),
  'plan-nedelje': (d) =>
    t('prompt.task.plan-nedelje', { from: d, to: addDaysStr(d, 7 - weekdayOf(d)) }),
  unos: (d, text) => t('prompt.task.unos', { date: d, text }),
  rezime: () => t('prompt.task.rezime'),
  uvoz: (_d, text) => t('prompt.task.uvoz', { text }),
  trening: () => t('prompt.task.trening'),
}

export const manualQuestions = () => t('prompt.questions')

/** `user` is sent in API mode; `manualText` also asks Claude to ask questions first. */
export function buildPrompt(
  kind: AiKind,
  data: AppData,
  today: string,
  text = '',
): { system: string; user: string; manualText: string } {
  const user = [
    buildContext(data, today),
    '',
    TASKS[kind](today, text),
    '',
    t('prompt.schemaHeader'),
    schemaText(kind),
  ].join('\n')
  const manualText = [
    systemPrompt(),
    '',
    t('prompt.dataHeader'),
    user,
    '',
    manualQuestions(),
    t('prompt.jsonAtEnd'),
  ].join('\n')
  return { system: systemPrompt(), user, manualText }
}

/** The chat assistant's instructions, with this week's data. */
export function buildChatSystem(data: AppData, today: string): string {
  return [
    systemPrompt(),
    '',
    t('prompt.dataHeader'),
    buildContext(data, today),
    '',
    t('prompt.chat.instruction'),
  ].join('\n')
}

/** The same chat question as one text to paste into claude.ai (manual mode). */
export function buildManualChat(data: AppData, today: string, question: string): string {
  return `${buildChatSystem(data, today)}\n\n${t('prompt.chat.question')}: ${question}`
}

export const kindLabel = (k: AiKind) => t(`ai.kind.${k}`)
