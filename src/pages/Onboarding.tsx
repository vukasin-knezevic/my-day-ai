import { useState } from 'react'
import { useStore } from '../store'
import { Button, Card, Field, Input } from '../components/ui'
import NumberInput from '../components/NumberInput'
import KeyScope from '../components/KeyScope'

const STEPS = ['Ime', 'Ritam dana', 'Ciljevi', 'Nagrada', 'Predmeti', 'AI režim']

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
    setSettings({ ...draft, onboarded: true })
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
                placeholder="npr. Marko"
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
                Za učenje zarađuješ nagradu koju sam biraš: vreme za igrice, epizodu serije,
                izlazak… Aplikacija je samo broji, bez zamerki.
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <Field label="Naziv nagrade">
                    <Input
                      value={draft.rewardName}
                      onChange={(e) => set('rewardName', e.target.value)}
                      placeholder="npr. Vreme za igrice"
                    />
                  </Field>
                </div>
                <Field label="Emotikon">
                  <Input
                    value={draft.rewardEmoji}
                    onChange={(e) => set('rewardEmoji', e.target.value)}
                  />
                </Field>
              </div>
              <Field label="Minuta nagrade po satu učenja">
                <NumberInput
                  min={0}
                  max={120}
                  step={5}
                  value={draft.rewardMinPerStudyHour}
                  onChange={(v) => set('rewardMinPerStudyHour', v)}
                />
              </Field>
            </>
          )}
          {step === 4 && (
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
          {step === 5 && (
            <>
              <p className="text-sm">
                AI pravi planove, rezime i pametan unos. Izaberi kako da radi (možeš da promeniš u
                podešavanjima):
              </p>
              <fieldset className="space-y-2">
                <legend className="sr-only">AI režim</legend>
                <label className="flex items-start gap-2 rounded-xl border border-slate-300 p-3 text-sm dark:border-slate-700">
                  <input
                    type="radio"
                    name="ai-mode"
                    className="mt-1 size-4"
                    checked={draft.aiMode === 'manual'}
                    onChange={() => set('aiMode', 'manual')}
                  />
                  <span>
                    <strong>Ručni (besplatno)</strong>
                    <br />
                    Kopiraš gotov tekst u Claude chat i nalepiš odgovor nazad.
                  </span>
                </label>
                <label className="flex items-start gap-2 rounded-xl border border-slate-300 p-3 text-sm dark:border-slate-700">
                  <input
                    type="radio"
                    name="ai-mode"
                    className="mt-1 size-4"
                    checked={draft.aiMode === 'api'}
                    onChange={() => set('aiMode', 'api')}
                  />
                  <span>
                    <strong>API (plaća se po upotrebi)</strong>
                    <br />
                    Aplikacija sama zove Claude, bez kopiranja. Treba ti Anthropic API ključ, a
                    plaćaš po potrošnji (obično nekoliko centi mesečno).
                  </span>
                </label>
              </fieldset>
              <a
                className="block text-sm font-medium text-blue-700 underline dark:text-blue-300"
                href="https://www.anthropic.com/pricing"
                target="_blank"
                rel="noreferrer"
              >
                Saznaj više o ceni i ključu ↗
              </a>
              {draft.aiMode === 'api' && (
                <>
                  <Field label="Anthropic API ključ (možeš i kasnije)">
                    <Input
                      type="password"
                      autoComplete="off"
                      value={draft.apiKey}
                      onChange={(e) => set('apiKey', e.target.value)}
                      placeholder="sk-ant-…"
                    />
                  </Field>
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    ⚠️ Ključ se čuva samo na ovom uređaju i vidljiv je u pregledaču. Nikome ga ne
                    deli, ne unosi ga na tuđem računaru i postavi mesečni limit potrošnje u
                    Anthropic konzoli.
                  </p>
                </>
              )}
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
