import { useState } from 'react'
import { useStore } from '../store'
import { Button, Card, Field, Input, Select } from '../components/ui'
import NumberInput from '../components/NumberInput'
import KeyScope from '../components/KeyScope'
import Rich from '../i18n/Rich'
import { LANGUAGES, getLanguage, useT } from '../i18n'
import type { BaseKey } from '../i18n'

const STEPS: BaseKey[] = [
  'ob.s.language',
  'ob.s.name',
  'ob.s.rhythm',
  'ob.s.goals',
  'ob.s.reward',
  'ob.s.subjects',
  'ob.s.ai',
]

export default function Onboarding() {
  const { t } = useT()
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
      <h1 className="mb-1 text-2xl font-bold">{t('ob.title')}</h1>
      <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
        {t('ob.step', { n: step + 1, total: STEPS.length, name: t(STEPS[step]) })}
      </p>
      <KeyScope onEnter={next} onEscape={back} focusKey={step}>
        <Card className="space-y-4">
          {step === 0 && (
            <>
              <p className="text-sm">{t('ob.lang.intro')}</p>
              <Field label={t('set.language')}>
                <Select
                  value={draft.language || ''}
                  onChange={(e) => {
                    set('language', e.target.value)
                    // the screen switches language right away
                    setSettings({ language: e.target.value })
                  }}
                >
                  <option value="">
                    {t('set.langAuto')} · {LANGUAGES.find((l) => l.code === getLanguage())?.name}
                  </option>
                  {LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </>
          )}
          {step === 1 && (
            <Field label={t('ob.name.label')} optional>
              <Input
                value={draft.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder={t('ob.name.placeholder')}
              />
            </Field>
          )}
          {step === 2 && (
            <>
              <Field label={t('ob.wake')}>
                <Input
                  type="time"
                  value={draft.wakeTime}
                  onChange={(e) => set('wakeTime', e.target.value)}
                />
              </Field>
              <Field label={t('ob.bed')}>
                <Input
                  type="time"
                  value={draft.bedTime}
                  onChange={(e) => set('bedTime', e.target.value)}
                />
              </Field>
              <Field label={t('ob.sleepGoal')}>
                <NumberInput
                  min={4}
                  max={12}
                  value={draft.sleepGoalHours}
                  onChange={(v) => set('sleepGoalHours', v)}
                />
              </Field>
            </>
          )}
          {step === 3 && (
            <>
              <Field label={t('ob.workouts')}>
                <NumberInput
                  min={0}
                  max={7}
                  value={draft.workoutsPerWeek}
                  onChange={(v) => set('workoutsPerWeek', v)}
                />
              </Field>
              <Field label={t('ob.study')}>
                <NumberInput
                  min={0}
                  max={12}
                  value={draft.studyHoursPerDay}
                  onChange={(v) => set('studyHoursPerDay', v)}
                />
              </Field>
              <Field label={t('ob.protein')}>
                <NumberInput
                  min={0}
                  value={draft.proteinGoal}
                  onChange={(v) => set('proteinGoal', v)}
                />
              </Field>
            </>
          )}
          {step === 4 && (
            <>
              <p className="text-sm">{t('ob.reward.intro')}</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <Field label={t('set.reward.name')} optional>
                    <Input
                      value={draft.rewardName}
                      onChange={(e) => set('rewardName', e.target.value)}
                      placeholder={t('reward.default')}
                    />
                  </Field>
                </div>
                <Field label={t('set.reward.emoji')}>
                  <Input
                    value={draft.rewardEmoji}
                    onChange={(e) => set('rewardEmoji', e.target.value)}
                  />
                </Field>
              </div>
              <Field label={t('ob.reward.perHour')}>
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
          {step === 5 && (
            <>
              <p className="text-sm">
                <Rich text={t('ob.subjects.text')} />
              </p>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={demo}
                  onChange={(e) => setDemo(e.target.checked)}
                  className="size-5"
                />
                {t('ob.demo')}
              </label>
            </>
          )}
          {step === 6 && (
            <>
              <p className="text-sm">{t('ob.ai.intro')}</p>
              <fieldset className="space-y-2">
                <legend className="sr-only">{t('ob.ai.legend')}</legend>
                <label className="flex items-start gap-2 rounded-xl border border-slate-300 p-3 text-sm dark:border-slate-700">
                  <input
                    type="radio"
                    name="ai-mode"
                    className="mt-1 size-4"
                    checked={draft.aiMode === 'manual'}
                    onChange={() => set('aiMode', 'manual')}
                  />
                  <span>
                    <strong>{t('ob.ai.manualTitle')}</strong>
                    <br />
                    {t('ob.ai.manualDesc')}
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
                    <strong>{t('ob.ai.apiTitle')}</strong>
                    <br />
                    {t('ob.ai.apiDesc')}
                  </span>
                </label>
              </fieldset>
              <a
                className="block text-sm font-medium text-blue-700 underline dark:text-blue-300"
                href="https://www.anthropic.com/pricing"
                target="_blank"
                rel="noreferrer"
              >
                {t('ob.ai.more')}
              </a>
              {draft.aiMode === 'api' && (
                <>
                  <Field label={t('ob.ai.keyLabel')} optional>
                    <Input
                      type="password"
                      autoComplete="off"
                      value={draft.apiKey}
                      onChange={(e) => set('apiKey', e.target.value)}
                      placeholder="sk-ant-…"
                    />
                  </Field>
                  <p className="text-xs text-amber-700 dark:text-amber-400">{t('ob.ai.keyWarn')}</p>
                </>
              )}
            </>
          )}
          <div className="flex justify-between pt-2">
            <Button variant="soft" disabled={step === 0} onClick={back}>
              {t('common.back')}
            </Button>
            <Button onClick={next}>{last ? t('common.finish') : t('common.next')}</Button>
          </div>
        </Card>
      </KeyScope>
    </div>
  )
}
