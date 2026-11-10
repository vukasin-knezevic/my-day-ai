import { addKind, assessmentKinds, slotKinds } from '../lib/kinds'
import { useEffect, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useStore } from '../store'
import { Badge, Button, Card, Field, Input, PageTitle, Select, Tabs } from '../components/ui'
import NumberInput from '../components/NumberInput'
import KeyScope from '../components/KeyScope'
import ConfirmButton from '../components/ConfirmButton'
import type { Assessment, AssessmentType, Attendance, ClassSlot, Subject, Weekday } from '../types'
import {
  formatHours,
  formatShort,
  formatTimeOfDay,
  monthName,
  monthOf,
  timeToMin,
  weekdayName,
  weekdayOf,
} from '../lib/dates'
import { uid } from '../lib/defaults'
import {
  URGENCY_CLS,
  autoTitle,
  countdownLabel,
  estimateStudyHours,
  isExam,
  monthRegistrations,
  nextWeekStart,
  slotsToAsk,
  sortAssessments,
  urgency,
} from '../lib/exams'
import { hasSlot } from '../lib/schedule'
import { subjectPoints } from '../lib/grades'
import { XP } from '../lib/xp'
import { deleteWithUndo } from '../lib/undo'
import CalendarButton from '../components/CalendarButton'
import Sheet from '../components/Sheet'
import { useT } from '../i18n'
import { useToday } from '../lib/useToday'
import Rich from '../i18n/Rich'
import { assessmentLabel, attendanceLabel, slotKindLabel } from '../lib/labels'

type Tab = 'raspored' | 'ispiti' | 'poeni'
const ATTENDANCES: Attendance[] = ['idem', 'ne-idem', 'ponekad']

export default function Study() {
  const { t } = useT()
  const [tab, setTab] = useState<Tab>('raspored')
  // "Add an assessment" on the Points tab opens the form on the assessments tab, for that subject
  const [addFor, setAddFor] = useState<string | null>(null)
  const tabs: [Tab, string][] = [
    ['raspored', t('study.tab.schedule')],
    ['ispiti', t('study.tab.exams')],
    ['poeni', t('study.tab.points')],
  ]
  return (
    <>
      <PageTitle>📚 {t('nav.study')}</PageTitle>
      <Tabs tabs={tabs} active={tab} activeClass="bg-blue-600" onChange={setTab} />
      {tab === 'raspored' && <Schedule />}
      {tab === 'ispiti' && <Assessments addFor={addFor} onAddForUsed={() => setAddFor(null)} />}
      {tab === 'poeni' && (
        <Points
          onAdd={(subjectId) => {
            setAddFor(subjectId)
            setTab('ispiti')
          }}
        />
      )}
    </>
  )
}

/* ---------------- Timetable ---------------- */
function Schedule() {
  const { t } = useT()
  const { subjects, add, update, removeSubject } = useStore(
    useShallow((s) => ({
      subjects: s.subjects,
      add: s.add,
      update: s.update,
      removeSubject: s.removeSubject,
    })),
  )
  const today = useToday()
  // "sometimes" is asked on Sunday evening for next week
  const sundayEvening = weekdayOf(today) === 7 && new Date().getHours() >= 17
  const weekly = sundayEvening ? slotsToAsk(subjects, today) : []
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState('')
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
    if (!name.trim()) {
      setNameError(t('common.required'))
      return
    }
    setNameError('')
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
          onRemove={() => deleteWithUndo(() => removeSubject(s.id))}
        />
      ))}

      <Card>
        <h2 className="mb-2 font-semibold">{t('study.newSubject')}</h2>
        <KeyScope onEscape={() => setName('')}>
          <form onSubmit={addSubject} className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Field label={t('study.subjectName')} required error={nameError}>
                <Input
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    setNameError('')
                  }}
                />
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
  // the form for a class lives in a bottom panel: 'new', or the class being edited
  const [slotForm, setSlotForm] = useState<'new' | ClassSlot | null>(null)
  const [removedSlot, setRemovedSlot] = useState<ClassSlot | null>(null)
  const undoTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(undoTimer.current), [])

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
  const attAria = (sl: ClassSlot) =>
    t('study.attAria', {
      subject: subject.name,
      kind: slotKindLabel(sl.kind),
      day: weekdayName(sl.day),
    })
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
        <ConfirmButton
          label={t('study.deleteSubject', { name: subject.name })}
          onConfirm={onRemove}
        >
          {t('common.delete')}
        </ConfirmButton>
      </div>
      <ul className="mb-3 space-y-2 text-sm">
        {slots.length === 0 && <li className="text-slate-500">{t('study.noSlots')}</li>}
        {slots.map((sl) => (
          <li
            key={sl.id}
            className="rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800/50"
          >
            <div className="flex items-center gap-1">
              <span className="min-w-0 flex-1 font-medium">
                <span aria-hidden>✓ </span>
                {t('study.slotLine', {
                  day: weekdayName(sl.day),
                  start: formatTimeOfDay(sl.start),
                  end: formatTimeOfDay(sl.end),
                  kind: slotKindLabel(sl.kind),
                })}
              </span>
              <Button
                variant="ghost"
                aria-label={t('study.editSlot', {
                  kind: slotKindLabel(sl.kind),
                  day: weekdayName(sl.day),
                  start: sl.start,
                })}
                onClick={() => setSlotForm(sl)}
              >
                ✎
              </Button>
              <Button
                variant="ghost"
                aria-label={t('study.deleteSlot', {
                  kind: slotKindLabel(sl.kind),
                  day: weekdayName(sl.day),
                  start: sl.start,
                })}
                onClick={() => removeSlot(sl)}
              >
                ✕
              </Button>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span role="group" aria-label={attAria(sl)} className="inline-flex gap-2">
                {ATTENDANCES.map((a) => (
                  <button
                    key={a}
                    type="button"
                    aria-pressed={sl.attendance === a}
                    aria-label={t('study.ask.aria', {
                      att: attendanceLabel(a),
                      subject: subject.name,
                      kind: slotKindLabel(sl.kind),
                      day: weekdayName(sl.day),
                    })}
                    onClick={() => onSlotAttendance(subject, sl, a)}
                    className={`min-h-11 rounded-lg px-3 text-xs font-medium transition ${
                      sl.attendance === a
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {attendanceLabel(a)}
                  </button>
                ))}
              </span>
              {sl.attendance === 'ne-idem' && (
                <Badge className="bg-emerald-100 text-emerald-800">{t('study.freeBadge')}</Badge>
              )}
            </div>
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
      <Button variant="soft" onClick={() => setSlotForm('new')}>
        {t('study.addSlot')}
      </Button>
      {slotForm && (
        <SlotSheet
          key={slotForm === 'new' ? 'new' : slotForm.id}
          subject={subject}
          initial={slotForm === 'new' ? undefined : slotForm}
          onClose={() => setSlotForm(null)}
        />
      )}
    </Card>
  )
}

/** Bottom panel: a new class of a subject, or changes to an existing one. */
function SlotSheet({
  subject,
  initial,
  onClose,
}: {
  subject: Subject
  initial?: ClassSlot
  onClose: () => void
}) {
  const { t } = useT()
  const update = useStore((s) => s.update)
  const settings = useStore((s) => s.settings)
  const setSettings = useStore((s) => s.setSettings)
  const [kind, setKind] = useState(initial?.kind ?? 'predavanje')
  const [newSlotKind, setNewSlotKind] = useState('')
  const [day, setDay] = useState<Weekday>(initial?.day ?? 1)
  const [start, setStart] = useState(initial?.start ?? '10:00')
  const [end, setEnd] = useState(initial?.end ?? '12:00')
  const [error, setError] = useState('')
  const kinds = slotKinds(settings, subject.slots)
  const first = useRef(JSON.stringify([kind, day, start, end]))
  const dirty = JSON.stringify([kind, day, start, end]) !== first.current || newSlotKind !== ''

  function addSlotKind() {
    const r = addKind(settings.customSlotKinds, newSlotKind)
    if (!r.name) return
    setSettings({ customSlotKinds: r.list })
    setKind(r.name)
    setNewSlotKind('')
  }
  function save(e?: React.FormEvent) {
    e?.preventDefault()
    if (timeToMin(end) <= timeToMin(start)) return setError(t('act.errEnd'))
    const slot: ClassSlot = {
      id: initial?.id ?? uid(),
      kind,
      day,
      start,
      end,
      attendance: initial?.attendance ?? 'idem',
    }
    const others = subject.slots.filter((x) => x.id !== slot.id)
    if (hasSlot(others, slot)) return setError(t('study.slotExists'))
    update('subjects', subject.id, { slots: [...others, slot] })
    onClose()
  }

  return (
    <Sheet
      open
      dirty={dirty}
      onClose={onClose}
      title={`${initial ? t('study.editSlotTitle') : t('study.newSlotTitle')} · ${subject.name}`}
    >
      <form onSubmit={save} className="space-y-3 pb-2">
        <Field label={t('study.kindAria')}>
          <Select value={kind} onChange={(e) => setKind(e.target.value)}>
            {kinds.map((k) => (
              <option key={k} value={k}>
                {slotKindLabel(k)}
              </option>
            ))}
          </Select>
        </Field>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Field label={t('study.newSlotKind')} optional>
              <Input
                value={newSlotKind}
                placeholder={t('study.newSlotKindPlaceholder')}
                onChange={(e) => setNewSlotKind(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addSlotKind()
                  }
                }}
              />
            </Field>
          </div>
          <Button variant="soft" onClick={addSlotKind}>
            {t('study.addKind')}
          </Button>
        </div>
        <Field label={t('study.dayAria')}>
          <Select value={day} onChange={(e) => setDay(Number(e.target.value) as Weekday)}>
            {([1, 2, 3, 4, 5, 6, 7] as Weekday[]).map((d) => (
              <option key={d} value={d}>
                {weekdayName(d)}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label={t('act.start')}>
            <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label={t('act.end')} error={error}>
            <Input
              type="time"
              value={end}
              onChange={(e) => {
                setEnd(e.target.value)
                setError('')
              }}
            />
          </Field>
        </div>
        <div className="flex gap-2">
          <Button type="submit" className="flex-1">
            {initial ? t('common.save') : t('study.saveSlot')}
          </Button>
          <Button variant="soft" onClick={onClose}>
            {t('common.giveUp')}
          </Button>
        </div>
      </form>
    </Sheet>
  )
}

/* ---------------- Exams ---------------- */
function Assessments({
  addFor,
  onAddForUsed,
}: {
  /** Open the form at once, for this subject (asked for on the Points tab). */
  addFor: string | null
  onAddForUsed: () => void
}) {
  const { t } = useT()
  const { subjects, assessments, add, update, remove, award, revoke, settings, setSettings } =
    useStore(
      useShallow((s) => ({
        settings: s.settings,
        setSettings: s.setSettings,
        subjects: s.subjects,
        assessments: s.assessments,
        award: s.award,
        revoke: s.revoke,
        add: s.add,
        update: s.update,
        remove: s.remove,
      })),
    )
  const [newKind, setNewKind] = useState('')
  const kinds = assessmentKinds(settings, assessments)
  function addAssessmentKind() {
    const r = addKind(settings.customAssessmentKinds, newKind)
    if (!r.name) return
    setSettings({ customAssessmentKinds: r.list })
    setF((x) => ({ ...x, type: r.name }))
    setNewKind('')
  }
  const [titleError, setTitleError] = useState('')
  const today = useToday()
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
  })

  function submit(e?: React.FormEvent) {
    e?.preventDefault()
    const subject = subjects.find((s) => s.id === f.subjectId) ?? subjects[0]
    const needsReg = isExam(f)
    // exam and midterm get their name from the app; other kinds are named by the student
    if (!subject || (!needsReg && !f.title.trim())) {
      setTitleError(t('common.required'))
      return
    }
    setTitleError('')
    const subjectId = subject.id
    add('assessments', {
      subjectId,
      type: f.type,
      title: needsReg ? autoTitle(f.type, subject, assessments) : f.title.trim(),
      date: f.date,
      time: f.time || undefined,
      registrationDeadline: needsReg && f.regDeadline ? f.regDeadline : undefined,
      registration: needsReg ? 'nije-prijavljen' : 'ne-treba',
      maxPoints: f.maxPoints,
      points: null,
      difficulty: f.difficulty as Assessment['difficulty'],
    })
    closeForm()
  }
  const [adding, setAdding] = useState(addFor !== null)
  useEffect(() => {
    if (addFor === null) return
    setF((x) => ({ ...x, subjectId: addFor }))
    onAddForUsed()
  }, [addFor, onAddForUsed])
  function closeForm() {
    setAdding(false)
    setF((x) => ({ ...x, title: '', time: '', regDeadline: '' }))
    setNewKind('')
    setTitleError('')
  }

  return (
    <div className="space-y-4">
      {assessments.length > 0 && (
        <Card>
          <CalendarButton compact />
        </Card>
      )}
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
        const exam = isExam(a)
        return (
          <Card key={a.id}>
            <div className="flex flex-wrap items-center gap-2">
              <strong className="user-text">{a.title}</strong>
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
                    className="size-5 shrink-0"
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
                  {a.registrationDeadline ? (
                    <span className="text-slate-500">
                      {t('study.deadline', { date: formatShort(a.registrationDeadline) })}
                    </span>
                  ) : (
                    a.registration === 'nije-prijavljen' && (
                      <span className="text-red-700 dark:text-red-400">
                        {t('study.noDeadline')}
                      </span>
                    )
                  )}
                </label>
              </div>
            )}
            {!exam && (
              <label className="mt-2 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-5 shrink-0"
                  checked={!!a.done}
                  onChange={(e) => update('assessments', a.id, { done: e.target.checked })}
                />
                {t('study.submitted')}
              </label>
            )}
            {exam && (
              <div className="mt-2 text-sm">
                <Field
                  label={t('study.hoursLabel', {
                    d: formatHours(
                      estimateStudyHours(a.type, a.difficulty, subj(a.subjectId)?.espb ?? 6),
                    ),
                  })}
                  optional
                >
                  <NumberInput
                    min={0}
                    max={200}
                    step={0.5}
                    value={a.studyHours ?? null}
                    placeholder={t('study.hoursAuto')}
                    onChange={(v) => update('assessments', a.id, { studyHours: v })}
                    onEmpty={() => update('assessments', a.id, { studyHours: undefined })}
                  />
                </Field>
              </div>
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
                onClick={() => deleteWithUndo(() => remove('assessments', a.id))}
                aria-label={t('study.deleteAssessment', { title: a.title })}
              >
                {t('common.delete')}
              </Button>
            </div>
          </Card>
        )
      })}

      <Card>
        {subjects.length === 0 ? (
          <p className="text-sm text-slate-500">{t('study.addSubjectFirst')}</p>
        ) : (
          <Button className="w-full" onClick={() => setAdding(true)}>
            {t('study.addAssessment')}
          </Button>
        )}
        <p className="mt-3 text-xs text-slate-500">{t('study.importNote')}</p>
      </Card>
      {subjects.length > 0 && (
        <Sheet
          open={adding}
          dirty={f.title !== '' || f.time !== '' || f.regDeadline !== '' || newKind !== ''}
          onClose={closeForm}
          title={t('study.newAssessment')}
        >
          <KeyScope onEscape={closeForm}>
            <form onSubmit={submit} className="grid grid-cols-2 gap-3 pb-2">
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
                  {kinds.map((x) => (
                    <option key={x} value={x}>
                      {assessmentLabel(x)}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="col-span-2 flex items-end gap-2">
                <div className="flex-1">
                  <Field label={t('study.newKind')} optional>
                    <Input
                      value={newKind}
                      placeholder={t('study.newKindPlaceholder')}
                      onChange={(e) => setNewKind(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          e.stopPropagation()
                          addAssessmentKind()
                        }
                      }}
                    />
                  </Field>
                </div>
                <Button variant="soft" onClick={addAssessmentKind}>
                  {t('study.addKind')}
                </Button>
              </div>
              {!isExam(f) && (
                <div className="col-span-2">
                  <Field label={t('study.f.title')} required error={titleError}>
                    <Input
                      value={f.title}
                      onChange={(e) => {
                        setF({ ...f, title: e.target.value })
                        setTitleError('')
                      }}
                    />
                  </Field>
                </div>
              )}
              <Field label={t('study.f.date')} required>
                <Input
                  type="date"
                  value={f.date}
                  onChange={(e) => setF({ ...f, date: e.target.value })}
                />
              </Field>
              <Field label={t('study.f.time')} optional>
                <Input
                  type="time"
                  value={f.time}
                  onChange={(e) => setF({ ...f, time: e.target.value })}
                />
              </Field>
              <Field label={t('study.f.regDeadline')} optional>
                <Input
                  type="date"
                  value={f.regDeadline}
                  onChange={(e) => setF({ ...f, regDeadline: e.target.value })}
                />
                {!f.regDeadline && (
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                    {t('study.f.regDeadlineHint')}
                  </p>
                )}
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
              <Button type="submit" className="col-span-2">
                {t('common.add')}
              </Button>
            </form>
          </KeyScope>
        </Sheet>
      )}
    </div>
  )
}

/* ---------------- Points ---------------- */
function Points({ onAdd }: { onAdd: (subjectId: string) => void }) {
  const { t } = useT()
  const { subjects, assessments, update } = useStore(
    useShallow((s) => ({ subjects: s.subjects, assessments: s.assessments, update: s.update })),
  )
  if (subjects.length === 0) return <Card>{t('study.points.empty')}</Card>
  return (
    <div className="space-y-4">
      {subjects.map((s) => {
        const p = subjectPoints(s, assessments)
        const none = !assessments.some((a) => a.subjectId === s.id)
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
            <p className="mt-1 text-2xl font-bold tabular-nums">
              {p.earned} <span className="text-base font-normal text-slate-500">/ 100</span>
            </p>
            {none ? (
              <div className="my-2 space-y-2">
                <p className="text-sm">{t('study.points.noAssessments')}</p>
                <Button variant="soft" onClick={() => onAdd(s.id)}>
                  {t('study.points.add')}
                </Button>
              </div>
            ) : (
              <>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {t('study.points.graded', { graded: p.maxGraded, total: p.maxTotal })}
                </p>
                <p className="text-sm">
                  {p.missingToPass === 0
                    ? t('study.points.secured')
                    : p.canPass
                      ? t('study.points.missing', { n: p.missingToPass, pass: s.passMark })
                      : t('study.points.cannot', { n: p.remaining, pass: s.passMark })}
                </p>
              </>
            )}
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
