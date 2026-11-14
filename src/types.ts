// All data types of the app. Dates are strings: 'yyyy-MM-dd'; times are 'HH:mm'.

export type Category = 'study' | 'workout' | 'sleep' | 'games' | 'food' | 'money' | 'habits'

export const CATEGORY_META: Record<
  Category,
  { emoji: string; color: string; bg: string; text: string }
> = {
  study: {
    emoji: '📚',
    color: '#2563eb',
    bg: 'bg-blue-100 dark:bg-blue-950',
    text: 'text-blue-700 dark:text-blue-300',
  },
  workout: {
    emoji: '🏋️',
    color: '#f97316',
    bg: 'bg-orange-100 dark:bg-orange-950',
    text: 'text-orange-700 dark:text-orange-300',
  },
  sleep: {
    emoji: '😴',
    color: '#8b5cf6',
    bg: 'bg-violet-100 dark:bg-violet-950',
    text: 'text-violet-700 dark:text-violet-300',
  },
  games: {
    emoji: '🎮',
    color: '#16a34a',
    bg: 'bg-green-100 dark:bg-green-950',
    text: 'text-green-700 dark:text-green-300',
  },
  food: {
    emoji: '🍗',
    color: '#dc2626',
    bg: 'bg-red-100 dark:bg-red-950',
    text: 'text-red-700 dark:text-red-300',
  },
  money: {
    emoji: '💰',
    color: '#eab308',
    bg: 'bg-yellow-100 dark:bg-yellow-950',
    text: 'text-yellow-700 dark:text-yellow-300',
  },
  habits: {
    emoji: '✅',
    color: '#14b8a6',
    bg: 'bg-teal-100 dark:bg-teal-950',
    text: 'text-teal-700 dark:text-teal-300',
  },
}

/** Mon=1 ... Sun=7 (ISO weekday) */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7

export type Attendance = 'idem' | 'ne-idem' | 'ponekad'

export interface ClassSlot {
  id: string
  /** 'predavanje' / 'vezbe' are built in; anything else is a kind the user named (lab, seminar...) */
  kind: string
  day: Weekday
  start: string
  end: string
  room?: string
  attendance: Attendance | null // null = not answered yet
  /** For 'ponekad': weeks (Monday date) for which I confirmed attending */
  attendingWeeks?: string[]
  /** Monday date of the week for which I answered the weekly question */
  askedWeek?: string
}

export interface Subject {
  id: string
  name: string
  color: string
  espb: number
  passMark: number // default 51
  slots: ClassSlot[]
  demo?: boolean
}

/** 'ispit' and 'kolokvijum' are built in; anything else is a kind the user named (homework, lab...). */
export type AssessmentType = string
export type RegistrationStatus = 'nije-prijavljen' | 'prijavljen' | 'ne-treba'

export interface Assessment {
  id: string
  subjectId: string
  type: AssessmentType
  title: string
  date: string
  time?: string
  registrationDeadline?: string
  registration: RegistrationStatus
  maxPoints: number
  points: number | null
  difficulty: 1 | 2 | 3 | 4 | 5
  /** Hours of study set by hand; empty = the planner estimates them (see lib/exams.ts) */
  studyHours?: number
  done?: boolean // for homework / lab
  demo?: boolean
}

export type Recurrence = 'none' | 'daily' | 'weekdays' | 'weekly'
export type ActivityStatus = 'planned' | 'done' | 'skipped'

export interface Activity {
  id: string
  title: string
  category: Category
  date: string
  start: string
  end: string
  recurrence: Recurrence
  status: ActivityStatus
  source: 'me' | 'ai'
  /** true = suggestion (dashed border) until accepted */
  suggested?: boolean
  note?: string
  /** The exam this study block prepares for (set by the planner) */
  assessmentId?: string
  /** For recurring activities: dates on which a particular occurrence was done/skipped */
  doneDates?: string[]
  skippedDates?: string[]
  /** Occurrences removed ("only this day") without deleting the whole series */
  excludedDates?: string[]
  /** Last day of a repeating series (a workout plan that was stopped); none = it goes on */
  until?: string
  /** Set on the weekly workouts made from the active workout plan: which day of the plan this is */
  planDay?: Weekday
  demo?: boolean
}

export interface ExerciseSet {
  reps: number
  weight: number
}
export interface WorkoutExercise {
  name: string
  sets: ExerciseSet[]
}
export interface Workout {
  id: string
  date: string
  type: string
  durationMin: number
  exercises: WorkoutExercise[]
  /** Optional, asked after the workout */
  feeling: 1 | 2 | 3 | 4 | 5 | null
  /** The scheduled workout (an activity) these exercises belong to */
  activityId?: string
  /** true = exercises planned for a scheduled workout that is not done yet (not in the history) */
  planned?: boolean
  demo?: boolean
}

export interface WorkoutPlanDay {
  day: Weekday
  title: string
  exercises: { name: string; sets: number; reps: string }[]
}
export interface WorkoutPlan {
  name: string
  source: 'template' | 'ai' | 'manual'
  days: WorkoutPlanDay[]
  /** Set while the plan is in use: when each of its days is trained (same order as `days`) */
  schedule?: { day: Weekday; start: string }[]
}

/** A saved workout the user can load into the "new workout" form again. */
export interface WorkoutTemplate {
  id: string
  name: string
  type: string
  exercises: { name: string; sets: number; reps: number; weight: number }[]
}

export interface SleepLog {
  id: string
  /** Date of the wake-up day */
  date: string
  bedtime: string // ISO datetime
  wakeTime: string | null // ISO datetime
  quality: 1 | 2 | 3 | 4 | 5 | null
  source: 'manual' | 'watch'
  demo?: boolean
}

export interface Meal {
  id: string
  date: string
  description: string
  protein: number
  calories?: number
  demo?: boolean
}

export type ExpenseCategory = 'hrana' | 'prevoz' | 'igre' | 'faks' | 'izlasci' | 'ostalo'
export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'hrana',
  'prevoz',
  'igre',
  'faks',
  'izlasci',
  'ostalo',
]

export interface Expense {
  id: string
  date: string
  amount: number
  category: ExpenseCategory
  description: string
  demo?: boolean
}
export type Budget = Partial<Record<ExpenseCategory, number>>

export interface Habit {
  id: string
  name: string
  emoji: string
  goal: number // e.g. 2 (liters), 20 (minutes); 1 = yes/no
  unit: string
  /** date -> amount done that day */
  entries: Record<string, number>
  demo?: boolean
}

export interface GameSession {
  id: string
  date: string
  game: string
  durationMin: number
  demo?: boolean
}

export interface XpEvent {
  id: string
  date: string
  reason: string
  xp: number
  category: Category
  /** reward minutes this event gave (so taking the event back can take them back too) */
  rewardMin?: number
  /** When it happened (ISO time). Older events have only the date. */
  at?: string
}

export interface Progress {
  xp: number
  events: XpEvent[]
  /** Reward minutes earned and spent (the reward is named by the user in settings) */
  rewardEarnedMin: number
  rewardSpentMin: number
  /** ids of already awarded things (prevents double XP) */
  awarded: string[]
}

export interface Settings {
  name: string
  /** Grammatical gender for Serbian texts ("spreman / spremna", "uradio / uradila") */
  gender: 'm' | 'f'
  wakeTime: string // 'HH:mm'
  bedTime: string
  sleepGoalHours: number
  workoutsPerWeek: number
  studyHoursPerDay: number
  proteinGoal: number
  theme: 'system' | 'light' | 'dark'
  /** The iPhone card "Add to Home Screen" was closed */
  iosHintDismissed: boolean
  /** Switch to a downloaded new version by itself when the app is out of sight (otherwise the user restarts it) */
  autoUpdate: boolean
  /** 24h (13:00) or 12h (1:00 PM) */
  timeFormat: '24h' | '12h'
  /** Kinds of obligations / class slots the user added (the built-in ones are not listed here) */
  customAssessmentKinds: string[]
  customSlotKinds: string[]
  /** UI language code ('sr-Latn', 'en', ...). '' = automatic, from the browser. */
  language: string
  /** Currency shown next to amounts, e.g. RSD, EUR, $ */
  currency: string
  aiMode: 'api' | 'manual'
  apiKey: string
  modelFast: string
  modelStrong: string
  reminders: boolean
  rewardMinPerStudyHour: number
  /** What the user calls the reward, e.g. "Vreme za igrice" */
  rewardName: string
  rewardEmoji: string
  onboarded: boolean
  /** When a backup was last copied / downloaded / shared (ISO time). '' = never. */
  lastBackupAt: string
  /** The guided tour was finished or skipped (existing users never see it by themselves) */
  tutorialDone: boolean
  /** Morning routine: on/off, the wake-up goal ('' = the wake time above) and the steps ([] = the defaults) */
  routineOn: boolean
  routineGoal: string
  routineSteps: RoutineStep[]
  /** Little sounds, vibration and celebrations (all can be switched off) */
  sound: boolean
  vibration: boolean
  animations: boolean
  /** How many streak saves the user was already told about (-1 = not counted yet) */
  streakSavesSeen: number
  /** Gentle reminder once a week to save a backup */
  backupReminder: boolean
  /** The day ('yyyy-MM-dd') the weekly reminder counts from (set at first use and by "Later") */
  backupNudgeAt: string
}

export interface RoutineStep {
  emoji: string
  text: string
}

/** Everything the app remembers about one calendar day (besides the lists above). */
export interface DayRecord {
  /** Morning routine: indexes of the steps that are ticked */
  routine?: number[]
  /** The daily challenge chosen for this day (so it stays the same when the data changes) */
  challengeId?: string
  /** "Give me another" was used this many times for the daily challenge */
  challengeSkips?: number
  /** The daily challenge was done */
  challengeDone?: boolean
  /** Ids of the awards that got a surprise (so redoing the same thing never rolls again) */
  surprised?: string[]
  /** The day was closed in the evening: how it went (1-5, null = not said) and a note */
  closed?: { mood: 1 | 2 | 3 | 4 | 5 | null; note: string }
  /** The one main thing chosen the evening before */
  mainThing?: string
}

export interface AiUsage {
  month: string // 'yyyy-MM'
  inputTokens: number
  outputTokens: number
  calls: number
}

export interface AppData {
  subjects: Subject[]
  assessments: Assessment[]
  activities: Activity[]
  workouts: Workout[]
  workoutPlan: WorkoutPlan | null
  workoutTemplates: WorkoutTemplate[]
  sleep: SleepLog[]
  meals: Meal[]
  expenses: Expense[]
  budget: Budget
  habits: Habit[]
  games: GameSession[]
  progress: Progress
  settings: Settings
  aiUsage: AiUsage
  days: Record<string, DayRecord>
}
