import { useStore } from '../store'
import { Button, Card, Field, Input, PageTitle, Select } from '../components/ui'

export default function Settings() {
  const settings = useStore((s) => s.settings)
  const setSettings = useStore((s) => s.setSettings)
  const loadDemo = useStore((s) => s.loadDemo)
  const clearDemo = useStore((s) => s.clearDemo)
  const hasDemo = useStore((s) => s.hasDemo())
  const num = (v: string) => (v === '' ? 0 : Number(v))

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
              <Input
                type="number"
                min={0}
                max={7}
                value={settings.workoutsPerWeek}
                onChange={(e) => setSettings({ workoutsPerWeek: num(e.target.value) })}
              />
            </Field>
            <Field label="Učenje (h/dan)">
              <Input
                type="number"
                min={0}
                max={12}
                value={settings.studyHoursPerDay}
                onChange={(e) => setSettings({ studyHoursPerDay: num(e.target.value) })}
              />
            </Field>
            <Field label="Protein (g/dan)">
              <Input
                type="number"
                min={0}
                value={settings.proteinGoal}
                onChange={(e) => setSettings({ proteinGoal: num(e.target.value) })}
              />
            </Field>
            <Field label="PS5 min po satu učenja">
              <Input
                type="number"
                min={0}
                step={5}
                value={settings.ps5MinPerStudyHour}
                onChange={(e) => setSettings({ ps5MinPerStudyHour: num(e.target.value) })}
              />
            </Field>
            <Field label="Cilj sna (h)">
              <Input
                type="number"
                min={4}
                max={12}
                value={settings.sleepGoalHours}
                onChange={(e) => setSettings({ sleepGoalHours: num(e.target.value) })}
              />
            </Field>
          </div>
        </Card>
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
