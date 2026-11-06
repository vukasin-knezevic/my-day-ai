import { useState } from 'react'
import { useStore } from '../store'
import { Button, Card, Field, Input } from '../components/ui'
import NumberInput from '../components/NumberInput'
import KeyScope from '../components/KeyScope'

const STEPS = ['Ime', 'Ritam dana', 'Ciljevi', 'Predmeti', 'AI ključ']

export default function Onboarding() {
  const settings = useStore((s) => s.settings)
  const setSettings = useStore((s) => s.setSettings)
  const loadDemo = useStore((s) => s.loadDemo)
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState({ ...settings })
  const [demo, setDemo] = useState(true)

  const set = <K extends keyof typeof draft>(k: K, v: (typeof draft)[K]) =>
    setDraft((d) => ({ ...d, [k]: v }))

  const last = step === STEPS.length - 1
  const next = () => (last ? finish() : setStep(step + 1))
  const back = () => step > 0 && setStep(step - 1)

  function finish() {
    setSettings({ ...draft, onboarded: true, aiMode: draft.apiKey.trim() ? 'api' : 'manual' })
    if (demo) loadDemo()
  }

  return (
    <div className="mx-auto max-w-md p-4 pt-10">
      <h1 className="mb-1 text-2xl font-bold">🌅 Dobrodošao u My Day AI</h1>
      <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
        Korak {step + 1} od {STEPS.length}: {STEPS[step]}
      </p>
      <KeyScope onEnter={next} onEscape={back} focusKey={step}>
        <Card className="space-y-4">
          {step === 0 && (
            <Field label="Kako da te zovem?">
              <Input
                value={draft.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="npr. Vukašin"
              />
            </Field>
          )}
          {step === 1 && (
            <>
              <Field label="Obično ustajem u (između 8 i 10)">
                <Input
                  type="time"
                  value={draft.wakeTime}
                  onChange={(e) => set('wakeTime', e.target.value)}
                />
              </Field>
              <Field label="Obično legnem u (između 00 i 02)">
                <Input
                  type="time"
                  value={draft.bedTime}
                  onChange={(e) => set('bedTime', e.target.value)}
                />
              </Field>
              <Field label="Cilj sna (sati)">
                <NumberInput
                  min={4}
                  max={12}
                  value={draft.sleepGoalHours}
                  onChange={(v) => set('sleepGoalHours', v)}
                />
              </Field>
            </>
          )}
          {step === 2 && (
            <>
              <Field label="Treninga nedeljno">
                <NumberInput
                  min={0}
                  max={7}
                  value={draft.workoutsPerWeek}
                  onChange={(v) => set('workoutsPerWeek', v)}
                />
              </Field>
              <Field label="Sati učenja dnevno">
                <NumberInput
                  min={0}
                  max={12}
                  value={draft.studyHoursPerDay}
                  onChange={(v) => set('studyHoursPerDay', v)}
                />
              </Field>
              <Field label="Dnevni cilj proteina (g)">
                <NumberInput
                  min={0}
                  value={draft.proteinGoal}
                  onChange={(v) => set('proteinGoal', v)}
                />
              </Field>
            </>
          )}
          {step === 3 && (
            <>
              <p className="text-sm">
                Predmete i raspored unosiš kasnije na ekranu <strong>Faks</strong>. Aplikacija ne
                zna tvoje predmete, pa možeš da učitaš demo podatke (jasno označene sa „primer") da
                vidiš kako sve izgleda.
              </p>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={demo}
                  onChange={(e) => setDemo(e.target.checked)}
                  className="size-5"
                />
                Učitaj demo podatke (kasnije ih brišeš jednim dugmetom)
              </label>
            </>
          )}
          {step === 4 && (
            <>
              <p className="text-sm">
                Bez ključa radi <strong>Ručni AI režim</strong> (kopiraš prompt u Claude chat,
                besplatno). Ključ možeš da dodaš i kasnije u podešavanjima.
              </p>
              <Field label="Anthropic API ključ (opciono)">
                <Input
                  type="password"
                  autoComplete="off"
                  value={draft.apiKey}
                  onChange={(e) => set('apiKey', e.target.value)}
                  placeholder="sk-ant-…"
                />
              </Field>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                ⚠️ Ključ se čuva samo na ovom uređaju i vidljiv je u pregledaču. Nikome ga ne deli.
              </p>
            </>
          )}
          <div className="flex justify-between pt-2">
            <Button variant="soft" disabled={step === 0} onClick={() => setStep(step - 1)}>
              Nazad
            </Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep(step + 1)}>Dalje</Button>
            ) : (
              <Button onClick={finish}>Završi</Button>
            )}
          </div>
        </Card>
      </KeyScope>
    </div>
  )
}
