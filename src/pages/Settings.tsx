import { useState } from 'react'
import DataCard from './DataCard'
import { selectData, useStore } from '../store'
import { buildIcs, downloadText } from '../lib/ics'
import { requestNotifications } from '../lib/useReminders'
import { estimateCost } from '../lib/ai/usage'
import { Button, Card, Field, Input, PageTitle, Select } from '../components/ui'
import NumberInput from '../components/NumberInput'

export default function Settings() {
  const settings = useStore((s) => s.settings)
  const setSettings = useStore((s) => s.setSettings)
  const loadDemo = useStore((s) => s.loadDemo)
  const clearDemo = useStore((s) => s.clearDemo)
  const hasDemo = useStore((s) => s.hasDemo())
  const [notifMsg, setNotifMsg] = useState('')
  const aiUsage = useStore((s) => s.aiUsage)
  // rough estimate: all tokens at the strong model price (upper bound)
  const cost = estimateCost(settings.modelStrong, aiUsage.inputTokens, aiUsage.outputTokens)

  return (
    <>
      <PageTitle>⚙️ Podešavanja</PageTitle>
      <div className="space-y-4">
        <Card className="space-y-3">
          <h2 className="font-semibold">Izgled</h2>
          <Field label="Tema">
            <Select
              value={settings.theme}
              onChange={(e) => setSettings({ theme: e.target.value as typeof settings.theme })}
            >
              <option value="system">Prati sistem</option>
              <option value="light">Svetla</option>
              <option value="dark">Tamna</option>
            </Select>
          </Field>
        </Card>
        <Card className="space-y-3">
          <h2 className="font-semibold">Ritam i ciljevi</h2>
          <Field label="Ime">
            <Input value={settings.name} onChange={(e) => setSettings({ name: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Buđenje">
              <Input
                type="time"
                value={settings.wakeTime}
                onChange={(e) => setSettings({ wakeTime: e.target.value })}
              />
            </Field>
            <Field label="Spavanje">
              <Input
                type="time"
                value={settings.bedTime}
                onChange={(e) => setSettings({ bedTime: e.target.value })}
              />
            </Field>
            <Field label="Treninga nedeljno">
              <NumberInput
                min={0}
                max={7}
                value={settings.workoutsPerWeek}
                onChange={(v) => setSettings({ workoutsPerWeek: v })}
              />
            </Field>
            <Field label="Učenje (h/dan)">
              <NumberInput
                min={0}
                max={12}
                value={settings.studyHoursPerDay}
                onChange={(v) => setSettings({ studyHoursPerDay: v })}
              />
            </Field>
            <Field label="Protein (g/dan)">
              <NumberInput
                min={0}
                value={settings.proteinGoal}
                onChange={(v) => setSettings({ proteinGoal: v })}
              />
            </Field>
            <Field label="PS5 min po satu učenja">
              <NumberInput
                min={0}
                step={5}
                value={settings.ps5MinPerStudyHour}
                onChange={(v) => setSettings({ ps5MinPerStudyHour: v })}
              />
            </Field>
            <Field label="Cilj sna (h)">
              <NumberInput
                min={4}
                max={12}
                value={settings.sleepGoalHours}
                onChange={(v) => setSettings({ sleepGoalHours: v })}
              />
            </Field>
          </div>
        </Card>
        <Card className="space-y-3">
          <h2 className="font-semibold">🔔 Podsetnici</h2>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-5"
              checked={settings.reminders}
              onChange={async (e) => {
                if (e.target.checked) {
                  const ok = await requestNotifications()
                  setNotifMsg(
                    ok ? '' : 'Pregledač nije dozvolio notifikacije (proveri podešavanja sajta).',
                  )
                  setSettings({ reminders: ok })
                } else setSettings({ reminders: false })
              }}
            />
            Notifikacije pregledača (pre predavanja, rokova, prijava i spavanja)
          </label>
          {notifMsg && (
            <p role="alert" className="text-sm text-red-700">
              {notifMsg}
            </p>
          )}
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Iskreno: bez servera notifikacije na telefonu rade pouzdano samo dok je aplikacija
            otvorena ili nedavno korišćena. Za pouzdane podsetnike izvezi kalendar (.ics) i uvezi ga
            u kalendar telefona; kalendar tada podseća sam.
          </p>
          <Button
            variant="soft"
            onClick={() => downloadText('my-day-ai.ics', buildIcs(selectData(useStore.getState())))}
          >
            📅 Izvezi kalendar (.ics)
          </Button>
        </Card>
        <Card className="space-y-3">
          <h2 className="font-semibold">🤖 AI</h2>
          <Field label="AI režim">
            <Select
              value={settings.aiMode}
              onChange={(e) => setSettings({ aiMode: e.target.value as typeof settings.aiMode })}
            >
              <option value="manual">Ručni (besplatno, kopiraš u Claude chat)</option>
              <option value="api">API (direktno, košta po upotrebi)</option>
            </Select>
          </Field>
          <Field label="Anthropic API ključ">
            <Input
              type="password"
              autoComplete="off"
              placeholder="sk-ant-…"
              value={settings.apiKey}
              onChange={(e) => setSettings({ apiKey: e.target.value })}
            />
          </Field>
          <p className="rounded-xl bg-amber-100 p-3 text-xs text-amber-900">
            ⚠️ Ključ se čuva samo na ovom uređaju, ali je vidljiv u pregledaču (alati za
            programere). Nikome ga ne deli, ne stavljaj ga na tuđ računar i postavi mesečni limit
            potrošnje u Anthropic konzoli.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Brži model (unos, uvoz)">
              <Input
                value={settings.modelFast}
                onChange={(e) => setSettings({ modelFast: e.target.value })}
              />
            </Field>
            <Field label="Jači model (planiranje)">
              <Input
                value={settings.modelStrong}
                onChange={(e) => setSettings({ modelStrong: e.target.value })}
              />
            </Field>
          </div>
          <p className="text-sm" data-testid="ai-usage">
            Potrošnja ovog meseca ({aiUsage.month || '—'}): {aiUsage.calls} poziva,{' '}
            {aiUsage.inputTokens} ulaznih i {aiUsage.outputTokens} izlaznih tokena
            {cost !== null && ` ≈ $${cost.toFixed(4)}`}.
          </p>
        </Card>
        <DataCard />
        <Card className="space-y-3">
          <h2 className="font-semibold">Demo podaci</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Primeri označeni sa „(primer)". Ne sadrže tvoje prave podatke.
          </p>
          <div className="flex gap-2">
            <Button variant="soft" onClick={loadDemo}>
              Učitaj demo podatke
            </Button>
            <Button variant="danger" disabled={!hasDemo} onClick={clearDemo}>
              Obriši demo podatke
            </Button>
          </div>
        </Card>
      </div>
    </>
  )
}
