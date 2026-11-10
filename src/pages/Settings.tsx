import { currentEnv, notificationSupport } from '../lib/ios'
import { isSerbian } from '../lib/address'
import { vocative } from '../lib/vocative'
import { useEffect, useState } from 'react'
import DataCard from './DataCard'
import { useStore } from '../store'
import CalendarButton from '../components/CalendarButton'
import { requestNotifications, showNotification } from '../lib/useReminders'
import { estimateCost } from '../lib/ai/usage'
import { Button, Card, Field, Input, PageTitle, Select } from '../components/ui'
import NumberInput from '../components/NumberInput'
import { LANGUAGES, getLanguage, useT } from '../i18n'
import { rewardNameOf, themeLabel } from '../lib/labels'
import type { Settings as SettingsT } from '../types'
import { routineGoal, routineSteps } from '../lib/routine'
import { useTour } from '../lib/tour'

export default function Settings() {
  const { t, lang } = useT()
  const settings = useStore((s) => s.settings)
  const setSettings = useStore((s) => s.setSettings)
  const loadDemo = useStore((s) => s.loadDemo)
  const clearDemo = useStore((s) => s.clearDemo)
  const hasDemo = useStore((s) => s.hasDemo())
  const support = notificationSupport(currentEnv())
  // R-10: an empty "how do I address you" starts with the suggested form of the name
  useEffect(() => {
    const s = useStore.getState().settings
    if (isSerbian(getLanguage()) && !s.addressName.trim() && s.name.trim())
      setSettings({ addressName: vocative(s.name) })
  }, [setSettings])
  const [notifMsg, setNotifMsg] = useState('')
  const steps = routineSteps(settings)
  const setSteps = (list: SettingsT['routineSteps']) => setSettings({ routineSteps: list })
  const aiUsage = useStore((s) => s.aiUsage)
  // rough estimate: all tokens at the strong model price (upper bound)
  const cost = estimateCost(settings.modelStrong, aiUsage.inputTokens, aiUsage.outputTokens)

  return (
    <>
      <PageTitle>{t('set.title')}</PageTitle>
      <div className="space-y-4">
        <Card className="space-y-3">
          <h2 className="font-semibold">{t('set.appearance')}</h2>
          <Field label={t('set.theme')}>
            <Select
              value={settings.theme}
              onChange={(e) => setSettings({ theme: e.target.value as SettingsT['theme'] })}
            >
              {(['system', 'light', 'dark'] as const).map((x) => (
                <option key={x} value={x}>
                  {themeLabel(x)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('set.timeFormat')}>
            <Select
              value={settings.timeFormat}
              onChange={(e) =>
                setSettings({ timeFormat: e.target.value as SettingsT['timeFormat'] })
              }
            >
              <option value="24h">{t('set.time24')}</option>
              <option value="12h">{t('set.time12')}</option>
            </Select>
          </Field>
          <Field label={t('set.language')}>
            <Select
              value={settings.language || ''}
              onChange={(e) => setSettings({ language: e.target.value })}
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
        </Card>
        <Card className="space-y-3">
          <h2 className="font-semibold">{t('set.rhythm')}</h2>
          <Field label={t('set.name')} optional>
            <Input
              value={settings.name}
              onChange={(e) => {
                // while the address is not corrected by hand it follows the name
                const follows = settings.addressName === vocative(settings.name)
                setSettings({
                  name: e.target.value,
                  ...(follows || !settings.addressName
                    ? { addressName: vocative(e.target.value) }
                    : {}),
                })
              }}
            />
          </Field>
          {isSerbian(lang) && (
            <>
              <Field label={t('set.address')} optional>
                <Input
                  value={settings.addressName}
                  placeholder={vocative(settings.name)}
                  onChange={(e) => setSettings({ addressName: e.target.value })}
                />
              </Field>
              <Field label={t('set.gender')}>
                <Select
                  value={settings.gender}
                  onChange={(e) => setSettings({ gender: e.target.value as SettingsT['gender'] })}
                >
                  <option value="m">{t('ob.gender.m')}</option>
                  <option value="f">{t('ob.gender.f')}</option>
                </Select>
              </Field>
            </>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('set.wake')}>
              <Input
                type="time"
                value={settings.wakeTime}
                onChange={(e) => setSettings({ wakeTime: e.target.value })}
              />
            </Field>
            <Field label={t('set.bed')}>
              <Input
                type="time"
                value={settings.bedTime}
                onChange={(e) => setSettings({ bedTime: e.target.value })}
              />
            </Field>
            <Field label={t('set.workoutsPerWeek')}>
              <NumberInput
                min={0}
                max={7}
                value={settings.workoutsPerWeek}
                onChange={(v) => setSettings({ workoutsPerWeek: v })}
              />
            </Field>
            <Field label={t('set.studyPerDay')}>
              <NumberInput
                min={0}
                max={12}
                value={settings.studyHoursPerDay}
                onChange={(v) => setSettings({ studyHoursPerDay: v })}
              />
            </Field>
            <Field label={t('set.protein')}>
              <NumberInput
                min={0}
                value={settings.proteinGoal}
                onChange={(v) => setSettings({ proteinGoal: v })}
              />
            </Field>
            <Field label={t('set.sleepGoal')}>
              <NumberInput
                min={4}
                max={12}
                value={settings.sleepGoalHours}
                onChange={(v) => setSettings({ sleepGoalHours: v })}
              />
            </Field>
            <Field label={t('set.currency')}>
              <Input
                maxLength={8}
                value={settings.currency}
                placeholder={t('currency.default')}
                onChange={(e) => setSettings({ currency: e.target.value })}
              />
            </Field>
          </div>
        </Card>
        <Card className="space-y-3">
          <h2 className="font-semibold">{t('set.reward.title')}</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">{t('set.reward.desc')}</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Field label={t('set.reward.name')} optional>
                <Input
                  value={settings.rewardName}
                  onChange={(e) => setSettings({ rewardName: e.target.value })}
                  placeholder={t('reward.default')}
                />
              </Field>
            </div>
            <Field label={t('set.reward.emoji')}>
              <Input
                value={settings.rewardEmoji}
                onChange={(e) => setSettings({ rewardEmoji: e.target.value })}
              />
            </Field>
            <div className="col-span-3">
              <Field
                label={t('set.reward.perHour', {
                  name: rewardNameOf(settings),
                })}
              >
                <NumberInput
                  min={0}
                  step={5}
                  value={settings.rewardMinPerStudyHour}
                  onChange={(v) => setSettings({ rewardMinPerStudyHour: v })}
                />
              </Field>
            </div>
          </div>
        </Card>
        <Card className="space-y-3" data-testid="routine-settings">
          <h2 className="font-semibold">{t('set.routine.title')}</h2>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-5"
              checked={settings.routineOn}
              onChange={(e) => setSettings({ routineOn: e.target.checked })}
            />
            {t('set.routine.on')}
          </label>
          {settings.routineOn && (
            <>
              <Field label={t('set.routine.goal')}>
                <Input
                  type="time"
                  value={routineGoal(settings)}
                  onChange={(e) => setSettings({ routineGoal: e.target.value })}
                />
              </Field>
              <ul className="space-y-2">
                {steps.map((st, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <Input
                      aria-label={t('set.routine.emoji')}
                      className="!w-14 text-center"
                      maxLength={4}
                      value={st.emoji}
                      onChange={(e) =>
                        setSteps(
                          steps.map((x, j) => (j === i ? { ...x, emoji: e.target.value } : x)),
                        )
                      }
                    />
                    <Input
                      aria-label={t('set.routine.step', { n: i + 1 })}
                      value={st.text}
                      onChange={(e) =>
                        setSteps(
                          steps.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)),
                        )
                      }
                    />
                    <Button
                      variant="ghost"
                      disabled={steps.length <= 3}
                      aria-label={t('set.routine.remove', { n: i + 1 })}
                      onClick={() => setSteps(steps.filter((_, j) => j !== i))}
                    >
                      ✕
                    </Button>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="soft"
                  disabled={steps.length >= 5}
                  onClick={() => setSteps([...steps, { emoji: '✨', text: '' }])}
                >
                  {t('set.routine.add')}
                </Button>
                <Button variant="ghost" onClick={() => setSteps([])}>
                  {t('set.routine.reset')}
                </Button>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">{t('set.routine.note')}</p>
            </>
          )}
        </Card>
        <Card className="space-y-3">
          <h2 className="font-semibold">{t('set.effects.title')}</h2>
          {(
            [
              ['sound', 'set.effects.sound'],
              ['vibration', 'set.effects.vibration'],
              ['animations', 'set.effects.animations'],
            ] as const
          ).map(([k, label]) => (
            <label key={k} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-5"
                checked={settings[k]}
                onChange={(e) => setSettings({ [k]: e.target.checked })}
              />
              {t(label)}
            </label>
          ))}
          <p className="text-xs text-slate-600 dark:text-slate-400">{t('set.effects.note')}</p>
        </Card>
        <Card className="space-y-3">
          <h2 className="font-semibold">{t('set.tour.title')}</h2>
          <Button
            variant="soft"
            onClick={() => {
              useTour.getState().stop()
              setSettings({ tutorialDone: false })
            }}
          >
            {t('set.tour.button')}
          </Button>
        </Card>
        <Card className="space-y-3">
          <h2 className="font-semibold">{t('set.updates')}</h2>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-5"
              checked={settings.autoUpdate}
              onChange={(e) => setSettings({ autoUpdate: e.target.checked })}
            />
            {t('set.autoUpdate')}
          </label>
          <p className="text-xs text-slate-600 dark:text-slate-400">{t('set.autoUpdateNote')}</p>
        </Card>
        <Card className="space-y-3">
          <h2 className="font-semibold">{t('set.reminders')}</h2>
          {support === 'ok' ? (
            <>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-5"
                  checked={settings.reminders}
                  onChange={async (e) => {
                    if (e.target.checked) {
                      const ok = await requestNotifications()
                      setNotifMsg(ok ? '' : t('set.notifDenied'))
                      setSettings({ reminders: ok })
                    } else setSettings({ reminders: false })
                  }}
                />
                {t('set.notif')}
              </label>
              {notifMsg && (
                <p role="alert" className="text-sm text-red-700">
                  {notifMsg}
                </p>
              )}
            </>
          ) : (
            <p role="note" className="rounded-xl bg-amber-50 p-3 text-sm dark:bg-amber-950">
              {t(support === 'ios-install' ? 'set.notifIos' : 'set.notifUnsupported')}
            </p>
          )}
          <p className="text-xs text-slate-600 dark:text-slate-400">{t('set.notifNote')}</p>
          {support === 'ok' && settings.reminders && (
            <Button
              variant="soft"
              onClick={async () => {
                const ok = await showNotification(t('set.notifTestTitle'), t('set.notifTestBody'))
                setNotifMsg(ok ? '' : t('set.notifTestFail'))
              }}
            >
              {t('set.notifTest')}
            </Button>
          )}
          <CalendarButton />
        </Card>
        <Card className="space-y-3">
          <h2 className="font-semibold">{t('set.ai')}</h2>
          <Field label={t('set.aiMode')}>
            <Select
              value={settings.aiMode}
              onChange={(e) => setSettings({ aiMode: e.target.value as SettingsT['aiMode'] })}
            >
              <option value="manual">{t('set.aiManual')}</option>
              <option value="api">{t('set.aiApi')}</option>
            </Select>
          </Field>
          <Field label={t('set.apiKey')} optional>
            <Input
              type="password"
              autoComplete="off"
              placeholder="sk-ant-…"
              value={settings.apiKey}
              onChange={(e) => setSettings({ apiKey: e.target.value })}
            />
          </Field>
          <p className="rounded-xl bg-amber-100 p-3 text-xs text-amber-900">{t('set.keyWarn')}</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('set.modelFast')}>
              <Input
                value={settings.modelFast}
                onChange={(e) => setSettings({ modelFast: e.target.value })}
              />
            </Field>
            <Field label={t('set.modelStrong')}>
              <Input
                value={settings.modelStrong}
                onChange={(e) => setSettings({ modelStrong: e.target.value })}
              />
            </Field>
          </div>
          <p className="text-sm" data-testid="ai-usage">
            {t('set.usage', {
              month: aiUsage.month || '—',
              calls: aiUsage.calls,
              input: aiUsage.inputTokens,
              output: aiUsage.outputTokens,
              cost: cost !== null ? ` ≈ $${cost.toFixed(4)}` : '',
            })}
          </p>
        </Card>
        <DataCard />
        <Card className="space-y-3">
          <h2 className="font-semibold">{t('set.demo.title')}</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">{t('set.demo.note')}</p>
          <div className="flex gap-2">
            <Button variant="soft" onClick={loadDemo}>
              {t('set.demo.load')}
            </Button>
            <Button variant="danger" disabled={!hasDemo} onClick={clearDemo}>
              {t('set.demo.clear')}
            </Button>
          </div>
        </Card>
        <p className="text-center text-xs text-slate-600 dark:text-slate-400">
          {t('set.version', { v: __APP_VERSION__ })}
        </p>
      </div>
    </>
  )
}
