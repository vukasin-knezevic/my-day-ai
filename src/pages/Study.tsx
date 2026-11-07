import { useEffect, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useStore } from '../store'
import { Badge, Button, Card, Field, Input, PageTitle, Select } from '../components/ui'
import NumberInput from '../components/NumberInput'
import KeyScope from '../components/KeyScope'
import type { Assessment, AssessmentType, Attendance, ClassSlot, Subject, Weekday } from '../types'
import { formatShort, monthName, monthOf, todayStr, weekdayName, weekdayOf } from '../lib/dates'
import {
  URGENCY_CLS,
  countdownLabel,
  monthRegistrations,
  nextWeekStart,
  slotsToAsk,
  sortAssessments,
  unansweredSlots,
  urgency,
} from '../lib/exams'
import { hasSlot } from '../lib/schedule'
import { subjectPoints } from '../lib/grades'
import { XP } from '../lib/xp'
import { useT } from '../i18n'
import type { BaseKey } from '../i18n'
import Rich from '../i18n/Rich'
import { assessmentLabel, attendanceLabel, slotKindLabel } from '../lib/labels'

type Tab = 'raspored' | 'ispiti' | 'poeni'
const ASSESSMENT_TYPES: AssessmentType[] = ['kolokvijum', 'ispit', 'domaci', 'lab']
const ATTENDANCES: Attendance[] = ['idem', 'ne-idem', 'ponekad']

export default function Study() {
  const { t } = useT()
  const [tab, setTab] = useState<Tab>('raspored')
  const tabs: [Tab, BaseKey][] = [
    ['raspored', 'study.tab.schedule'],
    ['ispiti', 'study.tab.exams'],
    ['poeni', 'study.tab.points'],
  ]
  return (
    <>
      <PageTitle>📚 {t('nav.study')}</PageTitle>
      <div role="tablist" className="mb-4 flex gap-2">
        {tabs.map(([k, label]) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={`min-h-10 rounded-xl px-3 text-sm font-medium ${
              tab === k ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800'
            }`}
          >
            {t(label)}
          </button>
        ))}
      </div>
      {tab === 'raspored' && <Schedule />}
      {tab === 'ispiti' && <Assessments />}
      {tab === 'poeni' && <Points />}
    </>
  )
}

/* ---------------- Timetable ---------------- */
function Schedule() {
  const { t } = useT()
  const { subjects, add, update, remove } = useStore(
    useShallow((s) => ({ subjects: s.subjects, add: s.add, update: s.update, remove: s.remove })),
  )
  const today = todayStr()
  const unanswered = unansweredSlots(subjects)
  // "sometimes" is asked on Sunday evening for next week
  const sundayEvening = weekdayOf(today) === 7 && new Date().getHours() >= 17
  const weekly = sundayEvening ? slotsToAsk(subjects, today) : []
  const [name, setName] = useState('')
  const [espb, setEspb] = useState(6)
  const [pass, setPass] = useState(51)

  function setAttendance(s: Subject, slot: ClassSlot, attendance: Attendance) {
    update('subjects', s.id, {
      slots: s.slots.map((x) => (x.id === slot.id ? { ...x, attendance } : x)),
    })
  }
  function answerWeekly(s: Subject, slot: ClassSlot, attending: boolean) {
    const target = nextWeekStart(today)
    const weeks = (slot.attendingWeeks ?? []).filter((w) => w !== target)
    if (attending) weeks.push(target)
    update('subjects', s.id, {
      slots: s.slots.map((x) =>
        x.id === slot.id ? { ...x, attendingWeeks: weeks, askedWeek: target } : x,
      ),
    })
  }
  function addSubject(e?: React.FormEvent) {
    e?.preventDefault()
    if (!name.trim()) return
    const colors = ['#2563eb', '#0d9488', '#9333ea', '#db2777', '#ea580c', '#65a30d']
    add('subjects', {
      name: name.trim(),
      color: colors[subjects.length % colors.length],
      espb,
      passMark: pass,
      slots: [],
    })
    setName('')
  }

  return (
    <div className="space-y-4">
      {unanswered.length > 0 && (
        <Card className="border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
          <h2 className="mb-2 font-semibold">{t('study.ask.title')}</h2>
          <ul className="space-y-3">
            {unanswered.map(({ subject, slot }) => (
              <li key={slot.id} className="text-sm">
                <p>
                  <Rich
                    text={t('study.ask.slot', {
                      subject: subject.name,
                      kind: slotKindLabel(slot.kind),
                      day: weekdayName(slot.day),
                      start: slot.start,
                      end: slot.end,
                    })}
                  />
                </p>
                <div className="mt-1 flex gap-2">
                  {ATTENDANCES.map((a) => (
                    <Button
                      key={a}
                      variant="soft"
                      aria-label={t('study.ask.aria', {
                        att: attendanceLabel(a),
                        subject: subject.name,
                        kind: slotKindLabel(slot.kind),
                        day: weekdayName(slot.day),
                      })}
                      onClick={() => setAttendance(subject, slot, a)}
                    >
                      {attendanceLabel(a)}
                    </Button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {weekly.length > 0 && (
        <Card className="border-violet-300 bg-violet-50 dark:border-violet-800 dark:bg-violet-950">
          <h2 className="mb-2 font-semibold">{t('study.weekly.title')}</h2>
          {weekly.map(({ subject, slot }) => (
            <div key={slot.id} className="mb-2 text-sm">
              {t('study.weekly.slot', {
                subject: subject.name,
                kind: slotKindLabel(slot.kind),
                day: weekdayName(slot.day),
                start: slot.start,
              })}
              <span className="ml-2 inline-flex gap-1">
                <Button variant="soft" onClick={() => answerWeekly(subject, slot, true)}>
                  {attendanceLabel('idem')}
                </Button>
                <Button variant="soft" onClick={() => answerWeekly(subject, slot, false)}>
                  {attendanceLabel('ne-idem')}
                </Button>
              </span>
            </div>
          ))}
        </Card>
      )}

      {subjects.map((s) => (
        <SubjectCard
          key={s.id}
          subject={s}
          onSlotAttendance={setAttendance}
          onRemove={() => remove('subjects', s.id)}
        />
      ))}

      <Card>
        <h2 className="mb-2 font-semibold">{t('study.newSubject')}</h2>
        <KeyScope onEscape={() => setName('')}>
          <form onSubmit={addSubject} className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Field label={t('study.subjectName')}>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
            </div>
            <Field label={t('study.espb')}>
              <NumberInput min={1} max={30} value={espb} onChange={setEspb} />
            </Field>
            <Field label={t('study.pass')}>
              <NumberInput min={0} max={100} value={pass} onChange={setPass} />
            </Field>
            <Button type="submit" className="col-span-2">
              {t('study.addSubject')}
            </Button>
          </form>
        </KeyScope>
      </Card>
    </div>
  )
}

function SubjectCard({
  subject,
  onSlotAttendance,
  onRemove,
}: {
  subject: Subject
  onSlotAttendance: (s: Subject, slot: ClassSlot, a: Attendance) => void
  onRemove: () => void
}) {
  const { t } = useT()
  const update = useStore((s) => s.update)
  const [kind, setKind] = useState<'predavanje' | 'vezbe'>('predavanje')
  const [day, setDay] = useState<Weekday>(1)
  const [start, setStart] = useState('10:00')
  const [end, setEnd] = useState('12:00')
  const [slotMsg, setSlotMsg] = useState('')
  const [removedSlot, setRemovedSlot] = useState<ClassSlot | null>(null)
  const undoTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(undoTimer.current), [])

  function addSlot(e: React.FormEvent) {
    e.preventDefault()
    const slot: ClassSlot = {
      id: Math.random().toString(36).slice(2, 9),
      kind,
      day,
      start,
      end,
      attendance: null,
    }
    if (hasSlot(subject.slots, slot)) {
      setSlotMsg(t('study.slotExists'))
      return
    }
    setSlotMsg('')
    update('subjects', subject.id, { slots: [...subject.slots, slot] })
  }
  function removeSlot(slot: ClassSlot) {
    update('subjects', subject.id, { slots: subject.slots.filter((x) => x.id !== slot.id) })
    clearTimeout(undoTimer.current)
    setRemovedSlot(slot)
    undoTimer.current = setTimeout(() => setRemovedSlot(null), 6000)
  }
  function undoRemoveSlot() {
    if (!removedSlot) return
    clearTimeout(undoTimer.current)
    if (!hasSlot(subject.slots, removedSlot))
      update('subjects', subject.id, { slots: [...subject.slots, removedSlot] })
    setRemovedSlot(null)
  }
  const slots = [...subject.slots].sort((a, b) => a.day - b.day || a.start.localeCompare(b.start))
  return (
    <Card>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-semibold">
          <span
            aria-hidden
            className="inline-block size-3 rounded-full"
            style={{ background: subject.color }}
          />
          {subject.name}{' '}
          <span className="text-xs text-slate-500">
            {t('study.espbBadge', { n: subject.espb })}
          </span>
        </h2>
        <Button
          variant="ghost"
          onClick={onRemove}
          aria-label={t('study.deleteSubject', { name: subject.name })}
        >
          {t('common.delete')}
        </Button>
      </div>
      <ul className="mb-3 space-y-1 text-sm">
        {slots.length === 0 && <li className="text-slate-500">{t('study.noSlots')}</li>}
        {slots.map((sl) => (
          <li key={sl.id} className="flex flex-wrap items-center gap-2">
            <span>
              {t('study.slotLine', {
                day: weekdayName(sl.day),
                start: sl.start,
                end: sl.end,
                kind: slotKindLabel(sl.kind),
              })}
            </span>
            {sl.attendance && (
              <Select
                aria-label={t('study.attAria', {
                  subject: subject.name,
                  kind: slotKindLabel(sl.kind),
                  day: weekdayName(sl.day),
                })}
                className="!w-auto !py-1 text-sm"
                value={sl.attendance}
                onChange={(e) => onSlotAttendance(subject, sl, e.target.value as Attendance)}
              >
                {ATTENDANCES.map((a) => (
                  <option key={a} value={a}>
                    {attendanceLabel(a)}
                  </option>
                ))}
              </Select>
            )}
            {sl.attendance === 'ne-idem' && (
              <Badge className="bg-emerald-100 text-emerald-800">{t('study.freeBadge')}</Badge>
            )}
            <Button
              variant="ghost"
              className="ml-auto"
              aria-label={t('study.deleteSlot', {
                kind: slotKindLabel(sl.kind),
                day: weekdayName(sl.day),
                start: sl.start,
              })}
              onClick={() => removeSlot(sl)}
            >
              ✕
            </Button>
          </li>
        ))}
      </ul>
      {removedSlot && (
        <p role="status" className="mb-2 flex items-center gap-2 text-sm">
          {t('study.slotRemoved')}
          <Button variant="soft" onClick={undoRemoveSlot}>
            {t('common.undo')}
          </Button>
        </p>
      )}
      {slotMsg && (
        <p role="alert" className="mb-2 text-sm text-red-700 dark:text-red-400">
          {slotMsg}
        </p>
      )}
      <form onSubmit={addSlot} className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Select
          aria-label={t('study.kindAria')}
          value={kind}
          onChange={(e) => setKind(e.target.value as typeof kind)}
        >
          <option value="predavanje">{slotKindLabel('predavanje')}</option>
          <option value="vezbe">{slotKindLabel('vezbe')}</option>
        </Select>
        <Select
          aria-label={t('study.dayAria')}
          value={day}
          onChange={(e) => setDay(Number(e.target.value) as Weekday)}
        >
          {([1, 2, 3, 4, 5, 6, 7] as Weekday[]).map((d) => (
            <option key={d} value={d}>
              {weekdayName(d)}
            </option>
          ))}
        </Select>
        <Input
          aria-label={t('act.start')}
          type="time"
          value={start}
          onChange={(e) => setStart(e.target.value)}
        />
        <Input
          aria-label={t('act.end')}
          type="time"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
        />
        <Button type="submit" variant="soft">
          {t('study.addSlot')}
        </Button>
      </form>
    </Card>
  )
}

/* ---------------- Exams ---------------- */
function Assessments() {
  const { t } = useT()
  const { subjects, assessments, add, update, remove, award, revoke } = useStore(
    useShallow((s) => ({
      subjects: s.subjects,
      assessments: s.assessments,
      award: s.award,
      revoke: s.revoke,
      add: s.add,
      update: s.update,
      remove: s.remove,
    })),
  )
  const today = todayStr()
  const month = monthOf(today)
  const regs = monthRegistrations(assessments, month)
  const subj = (id: string) => subjects.find((s) => s.id === id)
  const [f, setF] = useState({
    subjectId: '',
    type: 'kolokvijum' as AssessmentType,
    title: '',
    date: today,
    time: '',
    regDeadline: '',
    maxPoints: 30,
    difficulty: 3,
    studyHours: 6,
  })

  function submit(e?: React.FormEvent) {
    e?.preventDefault()
    const subjectId = f.subjectId || subjects[0]?.id
    if (!subjectId || !f.title.trim()) return
    const needsReg = f.type === 'kolokvijum' || f.type === 'ispit'
    add('assessments', {
      subjectId,
      type: f.type,
      title: f.title.trim(),
      date: f.date,
      time: f.time || undefined,
      registrationDeadline: needsReg && f.regDeadline ? f.regDeadline : undefined,
      registration: needsReg ? 'nije-prijavljen' : 'ne-treba',
      maxPoints: f.maxPoints,
      points: null,
      difficulty: f.difficulty as Assessment['difficulty'],
      studyHours: f.studyHours,
    })
    setF({ ...f, title: '' })
  }

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="mb-2 font-semibold">
          {t('study.monthRegs', { month: monthName(Number(month.slice(5))) })}
        </h2>
        {regs.length === 0 && <p className="text-sm text-slate-500">{t('study.noMonthExams')}</p>}
        <ul className="space-y-2">
          {regs.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-2 text-sm">
              <span>{a.registration === 'prijavljen' ? '✅' : '❌'}</span>
              <span>
                {a.title} · {formatShort(a.date)}
              </span>
              <Badge
                className={
                  a.registration === 'prijavljen'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }
              >
                {a.registration === 'prijavljen' ? t('study.registered') : t('study.notRegistered')}
              </Badge>
            </li>
          ))}
        </ul>
      </Card>

      {sortAssessments(assessments, today).map((a) => {
        const u = urgency(a.date, today)
        const exam = a.type === 'kolokvijum' || a.type === 'ispit'
        return (
          <Card key={a.id}>
            <div className="flex flex-wrap items-center gap-2">
              <strong>{a.title}</strong>
              <Badge className="bg-slate-100 dark:bg-slate-800">{assessmentLabel(a.type)}</Badge>
              <Badge className={URGENCY_CLS[u]}>{countdownLabel(a.date, today)}</Badge>
              <span className="text-sm text-slate-500">
                {subj(a.subjectId)?.name} · {formatShort(a.date)} {a.time ?? ''}
              </span>
            </div>
            {exam && (
              <div className="mt-2 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="size-5"
                    checked={a.registration === 'prijavljen'}
                    onChange={(e) => {
                      update('assessments', a.id, {
                        registration: e.target.checked ? 'prijavljen' : 'nije-prijavljen',
                      })
                      if (e.target.checked)
                        award({
                          id: `reg-${a.id}`,
                          date: today,
                          reason: t('study.xp.registered', { title: a.title }),
                          xp: XP.registration,
                          category: 'study',
                        })
                      else revoke(`reg-${a.id}`)
                    }}
                  />
                  {t('study.askRegistered')}{' '}
                  {a.registrationDeadline && (
                    <span className="text-slate-500">
                      {t('study.deadline', { date: formatShort(a.registrationDeadline) })}
                    </span>
                  )}
                </label>
              </div>
            )}
            {!exam && (
              <label className="mt-2 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-5"
                  checked={!!a.done}
                  onChange={(e) => update('assessments', a.id, { done: e.target.checked })}
                />
                {t('study.submitted')}
              </label>
            )}
            <div className="mt-2 flex items-center gap-2 text-sm">
              <Field label={t('study.pointsLabel', { max: a.maxPoints })}>
                <NumberInput
                  min={0}
                  max={a.maxPoints}
                  step={0.5}
                  value={a.points}
                  onChange={(v) => update('assessments', a.id, { points: v })}
                  onEmpty={() => update('assessments', a.id, { points: null })}
                />
              </Field>
              <Button
                variant="ghost"
                onClick={() => remove('assessments', a.id)}
                aria-label={t('study.deleteAssessment', { title: a.title })}
              >
                {t('common.delete')}
              </Button>
            </div>
          </Card>
        )
      })}

      <Card>
        <h2 className="mb-2 font-semibold">{t('study.newAssessment')}</h2>
        {subjects.length === 0 ? (
          <p className="text-sm text-slate-500">{t('study.addSubjectFirst')}</p>
        ) : (
          <KeyScope onEscape={() => setF({ ...f, title: '' })}>
            <form onSubmit={submit} className="grid grid-cols-2 gap-3">
              <Field label={t('study.f.subject')}>
                <Select
                  value={f.subjectId || subjects[0].id}
                  onChange={(e) => setF({ ...f, subjectId: e.target.value })}
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t('study.f.type')}>
                <Select
                  value={f.type}
                  onChange={(e) => setF({ ...f, type: e.target.value as AssessmentType })}
                >
                  {ASSESSMENT_TYPES.map((x) => (
                    <option key={x} value={x}>
                      {assessmentLabel(x)}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="col-span-2">
                <Field label={t('study.f.title')}>
                  <Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
                </Field>
              </div>
              <Field label={t('study.f.date')}>
                <Input
                  type="date"
                  value={f.date}
                  onChange={(e) => setF({ ...f, date: e.target.value })}
                />
              </Field>
              <Field label={t('study.f.time')}>
                <Input
                  type="time"
                  value={f.time}
                  onChange={(e) => setF({ ...f, time: e.target.value })}
                />
              </Field>
              <Field label={t('study.f.regDeadline')}>
                <Input
                  type="date"
                  value={f.regDeadline}
                  onChange={(e) => setF({ ...f, regDeadline: e.target.value })}
                />
              </Field>
              <Field label={t('study.f.maxPoints')}>
                <NumberInput
                  min={0}
                  max={1000}
                  value={f.maxPoints}
                  onChange={(v) => setF({ ...f, maxPoints: v })}
                />
              </Field>
              <Field label={t('study.f.difficulty')}>
                <NumberInput
                  min={1}
                  max={5}
                  value={f.difficulty}
                  onChange={(v) => setF({ ...f, difficulty: v })}
                />
              </Field>
              <Field label={t('study.f.hours')}>
                <NumberInput
                  min={0}
                  max={200}
                  step={0.5}
                  value={f.studyHours}
                  onChange={(v) => setF({ ...f, studyHours: v })}
                />
              </Field>
              <Button type="submit" className="col-span-2">
                {t('common.add')}
              </Button>
            </form>
          </KeyScope>
        )}
        <p className="mt-3 text-xs text-slate-500">{t('study.importNote')}</p>
      </Card>
    </div>
  )
}

/* ---------------- Points ---------------- */
function Points() {
  const { t } = useT()
  const { subjects, assessments, update } = useStore(
    useShallow((s) => ({ subjects: s.subjects, assessments: s.assessments, update: s.update })),
  )
  if (subjects.length === 0) return <Card>{t('study.points.empty')}</Card>
  return (
    <div className="space-y-4">
      {subjects.map((s) => {
        const p = subjectPoints(s, assessments)
        return (
          <Card key={s.id}>
            <h2 className="flex items-center gap-2 font-semibold">
              <span
                aria-hidden
                className="inline-block size-3 rounded-full"
                style={{ background: s.color }}
              />
              {s.name}
            </h2>
            <p className="mt-1 text-2xl font-bold">
              {p.earned}{' '}
              <span className="text-base font-normal text-slate-500">
                {t('study.points.graded', { graded: p.maxGraded, total: p.maxTotal })}
              </span>
            </p>
            <p className="text-sm">
              {p.missingToPass === 0
                ? t('study.points.secured')
                : p.canPass
                  ? t('study.points.missing', { n: p.missingToPass, pass: s.passMark })
                  : t('study.points.cannot', { n: p.remaining, pass: s.passMark })}
            </p>
            <p className="text-sm">
              <Rich text={t('study.points.grade', { grade: p.grade ?? '—' })} />
              {p.grade !== null && p.earned < 100 && t('study.points.gradeNote', { n: p.earned })}
            </p>
            <Field label={t('study.points.passMark')}>
              <NumberInput
                className="!w-24"
                min={0}
                max={100}
                value={s.passMark}
                onChange={(v) => update('subjects', s.id, { passMark: v })}
              />
            </Field>
            <p className="mt-1 text-xs text-slate-500">
              {t('study.points.to10', { n: Math.max(0, 91 - p.earned) })}
            </p>
          </Card>
        )
      })}
    </div>
  )
}
