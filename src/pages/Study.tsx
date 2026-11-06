import { useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useStore } from '../store'
import { Badge, Button, Card, Field, Input, PageTitle, Select } from '../components/ui'
import type { Assessment, AssessmentType, Attendance, ClassSlot, Subject, Weekday } from '../types'
import { WEEKDAY_NAMES, formatShort, monthOf, todayStr, weekdayOf } from '../lib/dates'
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
import { subjectPoints } from '../lib/grades'
import { XP } from '../lib/xp'

type Tab = 'raspored' | 'ispiti' | 'poeni'
const MONTHS = [
  'Januar',
  'Februar',
  'Mart',
  'April',
  'Maj',
  'Jun',
  'Jul',
  'Avgust',
  'Septembar',
  'Oktobar',
  'Novembar',
  'Decembar',
]
const TYPE_LABEL: Record<AssessmentType, string> = {
  kolokvijum: 'Kolokvijum',
  ispit: 'Ispit',
  domaci: 'Domaći',
  lab: 'Lab vežba',
}
const ATT_LABEL: Record<Attendance, string> = {
  idem: 'Idem',
  'ne-idem': 'Ne idem',
  ponekad: 'Ponekad',
}

export default function Study() {
  const [tab, setTab] = useState<Tab>('raspored')
  const tabs: [Tab, string][] = [
    ['raspored', 'Raspored'],
    ['ispiti', 'Ispiti i domaći'],
    ['poeni', 'Poeni'],
  ]
  return (
    <>
      <PageTitle>📚 Faks</PageTitle>
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
            {label}
          </button>
        ))}
      </div>
      {tab === 'raspored' && <Schedule />}
      {tab === 'ispiti' && <Assessments />}
      {tab === 'poeni' && <Points />}
    </>
  )
}

/* ---------------- Raspored ---------------- */
function Schedule() {
  const { subjects, add, update, remove } = useStore(
    useShallow((s) => ({ subjects: s.subjects, add: s.add, update: s.update, remove: s.remove })),
  )
  const today = todayStr()
  const unanswered = unansweredSlots(subjects)
  // "ponekad" is asked on Sunday evening for next week
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
  function addSubject(e: React.FormEvent) {
    e.preventDefault()
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
          <h2 className="mb-2 font-semibold">Da li ideš na ove termine?</h2>
          <ul className="space-y-3">
            {unanswered.map(({ subject, slot }) => (
              <li key={slot.id} className="text-sm">
                <p>
                  <strong>{subject.name}</strong> — {slot.kind}, {WEEKDAY_NAMES[slot.day]}{' '}
                  {slot.start}–{slot.end}
                </p>
                <div className="mt-1 flex gap-2">
                  {(['idem', 'ne-idem', 'ponekad'] as Attendance[]).map((a) => (
                    <Button
                      key={a}
                      variant="soft"
                      aria-label={`${ATT_LABEL[a]}: ${subject.name} ${slot.kind} ${WEEKDAY_NAMES[slot.day]}`}
                      onClick={() => setAttendance(subject, slot, a)}
                    >
                      {ATT_LABEL[a]}
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
          <h2 className="mb-2 font-semibold">🗓️ Sledeća nedelja: da li ideš?</h2>
          {weekly.map(({ subject, slot }) => (
            <div key={slot.id} className="mb-2 text-sm">
              {subject.name} — {slot.kind}, {WEEKDAY_NAMES[slot.day]} {slot.start}
              <span className="ml-2 inline-flex gap-1">
                <Button variant="soft" onClick={() => answerWeekly(subject, slot, true)}>
                  Idem
                </Button>
                <Button variant="soft" onClick={() => answerWeekly(subject, slot, false)}>
                  Ne idem
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
        <h2 className="mb-2 font-semibold">Novi predmet</h2>
        <form onSubmit={addSubject} className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Field label="Naziv predmeta">
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
          </div>
          <Field label="ESPB">
            <Input
              type="number"
              min={1}
              value={espb}
              onChange={(e) => setEspb(Number(e.target.value))}
            />
          </Field>
          <Field label="Prolaz (poena)">
            <Input
              type="number"
              min={0}
              max={100}
              value={pass}
              onChange={(e) => setPass(Number(e.target.value))}
            />
          </Field>
          <Button type="submit" className="col-span-2">
            Dodaj predmet
          </Button>
        </form>
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
  const update = useStore((s) => s.update)
  const [kind, setKind] = useState<'predavanje' | 'vezbe'>('predavanje')
  const [day, setDay] = useState<Weekday>(1)
  const [start, setStart] = useState('10:00')
  const [end, setEnd] = useState('12:00')

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
    update('subjects', subject.id, { slots: [...subject.slots, slot] })
  }
  const slots = [...subject.slots].sort((a, b) => a.day - b.day || a.start.localeCompare(b.start))
  return (
    <Card>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-semibold" style={{ color: subject.color }}>
          {subject.name} <span className="text-xs text-slate-500">· {subject.espb} ESPB</span>
        </h2>
        <Button variant="ghost" onClick={onRemove} aria-label={`Obriši predmet ${subject.name}`}>
          Obriši
        </Button>
      </div>
      <ul className="mb-3 space-y-1 text-sm">
        {slots.length === 0 && <li className="text-slate-500">Još nema termina.</li>}
        {slots.map((sl) => (
          <li key={sl.id} className="flex flex-wrap items-center gap-2">
            <span>
              {WEEKDAY_NAMES[sl.day]} {sl.start}–{sl.end} ({sl.kind})
            </span>
            {sl.attendance && (
              <Select
                aria-label={`Prisustvo ${subject.name} ${sl.kind} ${WEEKDAY_NAMES[sl.day]}`}
                className="!w-auto !py-1 text-sm"
                value={sl.attendance}
                onChange={(e) => onSlotAttendance(subject, sl, e.target.value as Attendance)}
              >
                {(Object.keys(ATT_LABEL) as Attendance[]).map((a) => (
                  <option key={a} value={a}>
                    {ATT_LABEL[a]}
                  </option>
                ))}
              </Select>
            )}
            {sl.attendance === 'ne-idem' && (
              <Badge className="bg-emerald-100 text-emerald-800">slobodno vreme</Badge>
            )}
          </li>
        ))}
      </ul>
      <form onSubmit={addSlot} className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Select
          aria-label="Vrsta termina"
          value={kind}
          onChange={(e) => setKind(e.target.value as typeof kind)}
        >
          <option value="predavanje">Predavanje</option>
          <option value="vezbe">Vežbe</option>
        </Select>
        <Select
          aria-label="Dan"
          value={day}
          onChange={(e) => setDay(Number(e.target.value) as Weekday)}
        >
          {([1, 2, 3, 4, 5, 6, 7] as Weekday[]).map((d) => (
            <option key={d} value={d}>
              {WEEKDAY_NAMES[d]}
            </option>
          ))}
        </Select>
        <Input
          aria-label="Početak"
          type="time"
          value={start}
          onChange={(e) => setStart(e.target.value)}
        />
        <Input aria-label="Kraj" type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
        <Button type="submit" variant="soft">
          + Termin
        </Button>
      </form>
    </Card>
  )
}

/* ---------------- Ispiti ---------------- */
function Assessments() {
  const { subjects, assessments, add, update, remove, award } = useStore(
    useShallow((s) => ({
      subjects: s.subjects,
      assessments: s.assessments,
      award: s.award,
      add: s.add,
      update: s.update,
      remove: s.remove,
    })),
  )
  const today = todayStr()
  const month = monthOf(today)
  const monthName = MONTHS[Number(month.slice(5)) - 1]
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

  function submit(e: React.FormEvent) {
    e.preventDefault()
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
        <h2 className="mb-2 font-semibold">{monthName}: prijave</h2>
        {regs.length === 0 && (
          <p className="text-sm text-slate-500">Nema kolokvijuma ni ispita ovog meseca.</p>
        )}
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
                {a.registration === 'prijavljen' ? 'prijavljen' : 'nije prijavljen'}
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
              <Badge className="bg-slate-100 dark:bg-slate-800">{TYPE_LABEL[a.type]}</Badge>
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
                          reason: `Prijavljen: ${a.title}`,
                          xp: XP.registration,
                          category: 'study',
                        })
                    }}
                  />
                  Da li si prijavio?{' '}
                  {a.registrationDeadline && (
                    <span className="text-slate-500">
                      (rok {formatShort(a.registrationDeadline)})
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
                Predato
              </label>
            )}
            <div className="mt-2 flex items-center gap-2 text-sm">
              <Field label={`Osvojeno poena (max ${a.maxPoints})`}>
                <Input
                  type="number"
                  min={0}
                  max={a.maxPoints}
                  value={a.points ?? ''}
                  onChange={(e) =>
                    update('assessments', a.id, {
                      points: e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                />
              </Field>
              <Button
                variant="ghost"
                onClick={() => remove('assessments', a.id)}
                aria-label={`Obriši ${a.title}`}
              >
                Obriši
              </Button>
            </div>
          </Card>
        )
      })}

      <Card>
        <h2 className="mb-2 font-semibold">Novi kolokvijum / ispit / domaći / lab</h2>
        {subjects.length === 0 ? (
          <p className="text-sm text-slate-500">Prvo dodaj predmet na tabu Raspored.</p>
        ) : (
          <form onSubmit={submit} className="grid grid-cols-2 gap-3">
            <Field label="Predmet">
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
            <Field label="Vrsta">
              <Select
                value={f.type}
                onChange={(e) => setF({ ...f, type: e.target.value as AssessmentType })}
              >
                {(Object.keys(TYPE_LABEL) as AssessmentType[]).map((t) => (
                  <option key={t} value={t}>
                    {TYPE_LABEL[t]}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="col-span-2">
              <Field label="Naziv">
                <Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
              </Field>
            </div>
            <Field label="Datum">
              <Input
                type="date"
                value={f.date}
                onChange={(e) => setF({ ...f, date: e.target.value })}
              />
            </Field>
            <Field label="Vreme">
              <Input
                type="time"
                value={f.time}
                onChange={(e) => setF({ ...f, time: e.target.value })}
              />
            </Field>
            <Field label="Rok za prijavu">
              <Input
                type="date"
                value={f.regDeadline}
                onChange={(e) => setF({ ...f, regDeadline: e.target.value })}
              />
            </Field>
            <Field label="Maks. poena">
              <Input
                type="number"
                min={0}
                value={f.maxPoints}
                onChange={(e) => setF({ ...f, maxPoints: Number(e.target.value) })}
              />
            </Field>
            <Field label="Težina (1–5)">
              <Input
                type="number"
                min={1}
                max={5}
                value={f.difficulty}
                onChange={(e) => setF({ ...f, difficulty: Number(e.target.value) })}
              />
            </Field>
            <Field label="Sati učenja">
              <Input
                type="number"
                min={0}
                value={f.studyHours}
                onChange={(e) => setF({ ...f, studyHours: Number(e.target.value) })}
              />
            </Field>
            <Button type="submit" className="col-span-2">
              Dodaj
            </Button>
          </form>
        )}
        <p className="mt-3 text-xs text-slate-500">
          Uvoz rasporeda kolokvijuma iz nalepljenog teksta stiže uz AI (stranica 🤖 AI). Do tada
          unosi ručno.
        </p>
      </Card>
    </div>
  )
}

/* ---------------- Poeni ---------------- */
function Points() {
  const { subjects, assessments, update } = useStore(
    useShallow((s) => ({ subjects: s.subjects, assessments: s.assessments, update: s.update })),
  )
  if (subjects.length === 0) return <Card>Dodaj predmete da vidiš poene.</Card>
  return (
    <div className="space-y-4">
      {subjects.map((s) => {
        const p = subjectPoints(s, assessments)
        return (
          <Card key={s.id}>
            <h2 className="font-semibold" style={{ color: s.color }}>
              {s.name}
            </h2>
            <p className="mt-1 text-2xl font-bold">
              {p.earned}{' '}
              <span className="text-base font-normal text-slate-500">
                / {p.maxGraded} ocenjeno ({p.maxTotal} ukupno)
              </span>
            </p>
            <p className="text-sm">
              {p.missingToPass === 0
                ? '✅ Prolaz je obezbeđen.'
                : p.canPass
                  ? `Fali ${p.missingToPass} poena do prolaza (${s.passMark}).`
                  : `⚠️ Sa preostalim obavezama (${p.remaining} poena) ne može se doći do ${s.passMark}.`}
            </p>
            <p className="text-sm">
              Procena ocene: <strong>{p.grade ?? '—'}</strong>
              {p.grade !== null &&
                p.earned < 100 &&
                ` (sa ${p.earned} poena; skala 51–60 = 6 … 91–100 = 10)`}
            </p>
            <Field label="Granica prolaza">
              <Input
                className="!w-24"
                type="number"
                min={0}
                max={100}
                value={s.passMark}
                onChange={(e) => update('subjects', s.id, { passMark: Number(e.target.value) })}
              />
            </Field>
            <p className="mt-1 text-xs text-slate-500">
              Do ocene 10 (91 poen) fali {Math.max(0, 91 - p.earned)} poena.
            </p>
          </Card>
        )
      })}
    </div>
  )
}
