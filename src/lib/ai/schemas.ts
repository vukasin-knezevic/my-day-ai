// Zod schemas for everything the AI may return. One shared validation for API mode and manual mode.
import { z } from 'zod'
import { t } from '../../i18n'

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: () => t('zod.date') })
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, { error: () => t('zod.time') })
const category = z.enum(['study', 'workout', 'sleep', 'games', 'food', 'money', 'habits'])

export const ActivityItem = z.object({
  title: z.string().min(1),
  category,
  date,
  start: time,
  end: time,
  note: z.string().optional(),
})

export const PlanSchema = z.object({
  summary: z.string(),
  activities: z.array(ActivityItem),
  notes: z.array(z.string()).optional(),
})

export const WeeklySummarySchema = z.object({
  summary: z.string().min(1),
  tips: z.array(z.string()).min(1).max(5),
})

export const ExamImportSchema = z.object({
  assessments: z.array(
    z.object({
      subject: z.string().min(1),
      type: z.enum(['kolokvijum', 'ispit', 'domaci', 'lab']),
      title: z.string().min(1),
      date,
      time: time.optional(),
      registrationDeadline: date.optional(),
    }),
  ),
})

export const WorkoutPlanSchema = z.object({
  name: z.string().min(1),
  days: z
    .array(
      z.object({
        day: z.number().int().min(1).max(7),
        title: z.string().min(1),
        exercises: z.array(
          z.object({ name: z.string().min(1), sets: z.number().int().min(1), reps: z.string() }),
        ),
      }),
    )
    .min(1),
})

export type AiKind = 'plan-dana' | 'plan-nedelje' | 'unos' | 'rezime' | 'uvoz' | 'trening'

export const SCHEMAS = {
  'plan-dana': PlanSchema,
  'plan-nedelje': PlanSchema,
  unos: PlanSchema,
  rezime: WeeklySummarySchema,
  uvoz: ExamImportSchema,
  trening: WorkoutPlanSchema,
} as const

export type PlanResult = z.infer<typeof PlanSchema>
export type SummaryResult = z.infer<typeof WeeklySummarySchema>
export type ImportResult = z.infer<typeof ExamImportSchema>
export type WorkoutPlanResult = z.infer<typeof WorkoutPlanSchema>
export type AiResult = PlanResult | SummaryResult | ImportResult | WorkoutPlanResult

/** Human-readable schema shown to the model (same for API and manual mode). The JSON keys never change. */
export const schemaText = (kind: AiKind) => t(`schema.${kind}`)
