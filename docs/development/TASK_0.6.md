# Update 0.6: simple start (AI hidden), haptics, proper notification icon, Today screen upgrade

Version **0.6.0**, branch **`update-0.6`** from an up-to-date `main`. Use the `release-bump` skill.
Four user-visible changes plus a token-saving setup. Do them in the order A → B → C → D → E, one commit series per section. Nothing is deleted: the AI part is only hidden behind a switch, so it can
come back later (with monetization, through our own server, without the user needing an API key).

> **Not in this task:** the rename to a new app name (the name is still being chosen). `TASK_RENAME.md` currently says
> 0.5.3 / `update-0.5.3`: change only those version/branch numbers in that file to **0.6.1 / `update-0.6.1`**, nothing else.
> Also delete the superseded file `docs/development/TASK_HIDE_AI_AND_HAPTICS.md` (this file replaces it), and add one line
> for `TASK_0.6.md` to `docs/development/README.md`.
> If `git status` is not clean when you start, stop and tell me before doing anything.

---

## A. Token saving (do this FIRST, and keep doing it)

- **Ignore the heavy folders.** Create a root `.claudeignore` (project convention) with: `node_modules/`, `dist/`, `coverage/`,
  `graphify-out/`, `test-results/`, `android/.gradle/`, `android/build/`, `android/app/build/`, `android/.kotlin/`,
  `docs/screenshots/`, `*.tsbuildinfo`, `package-lock.json`.
  I am not sure Claude Code reads `.claudeignore` natively: check the current docs and, if it does not, ALSO add the same
  paths as `permissions.deny` `Read(...)` rules in `.claude/settings.json` (keep the existing hooks and settings intact).
  Tell me in the final report which of the two actually works.
- **Graphify first** (see `CLAUDE_GRAPHIFY_GUIDE.md`) for definitions, callers, impact and tests. Grep only for literal strings.
- **headroom / peek** for any file larger than about 150 lines (`Settings.tsx`, `Today.tsx`, `Health.tsx`, `Study.tsx`, `Life.tsx`,
  `README.md`, `REPORT.md`): outline it, then read only the ranges you need. Never dump a whole big file.
- Keep command output short (`| tail`, quiet flags). While iterating run only the affected tests; run the full suite
  (unit, e2e, axe, i18n parity) once per section and once at the end. Use the Explore subagent for wide searches.
  `/compact` between sections. Commit and push after each section.

## B. Hide the AI part (a switch, default OFF)

Why: 99% of users do not know what an API key is, so the first launch must work with zero setup.

Current state (verified): `Settings.aiMode` is `'manual' | 'api'` (default `'manual'`), `Settings.apiKey` exists, there is an
onboarding step `ob.s.ai` (manual vs API choice + key field), a bottom-bar tab `/ai` (`🤖`, `Layout.tsx`), a route `/ai` in
`App.tsx` (page `src/pages/Ai.tsx`, logic `src/lib/ai/*`), a Sunday summary link `/ai?k=rezime` in `Today.tsx`, and an AI card
with usage/cost in `Settings.tsx`.

- Add a setting **`aiEnabled: boolean`** (`types.ts`, `defaults.ts`, the zod schema, and wherever settings are validated or
  migrated). **Default `false` for new users.**
- **Migration, nobody loses anything:** for existing data set `aiEnabled = true` if `apiKey` is non-empty or `aiMode === 'api'`,
  otherwise `false`. Use the existing settings migration/versioning mechanism. Old JSON backups must still import and the new
  field must be optional on import. Add tests.
- When `aiEnabled` is `false`: the `/ai` tab is not in the bottom bar; the `/ai` route redirects to `/` (the route stays in code);
  the Sunday summary link is not rendered; the onboarding AI step is skipped (fix the step list, the progress/step counter and
  the back logic); the Settings AI card is not rendered except the switch below.
- In **Settings**, an "Advanced" section with one switch: **"AI tools (advanced)"** and one line: it needs your own API key, or you
  can use the copy-and-paste mode. Turning it on shows everything that exists today (tab, Settings AI card with mode and key,
  Sunday link). Both modes live behind this switch. The API key field shows only when `aiMode === 'api'`.
- **Never delete** `src/pages/Ai.tsx`, `src/lib/ai/*`, their tests or strings. Never log or export the API key anywhere new.
- New strings in **all 6 locales** (i18n parity test green; Serbian Cyrillic must still derive correctly).
- Update tests that assumed the AI tab/step is always there (unit, `e2e/app.spec.ts`, `e2e/screens.spec.ts`,
  `e2e/screenshots.spec.ts`, onboarding). Add tests: default hidden, switch shows it, migration, redirect.
- README: one short line that AI tools are optional and off by default. Regenerate screenshots only if they show the AI tab.

## C. Haptic feedback (extend what exists, do not duplicate)

Current state (verified): `src/lib/effects.ts` already has `cue()` / `celebrate()` calling `navigator.vibrate`, controlled by the
existing setting `vibration`. iPhone web has no vibration; inside the Android app `navigator.vibrate` is not reliable.

- Add **`@capacitor/haptics`** (version matching the other Capacitor 8 plugins), then `cap sync android`.
- New central module **`src/lib/haptics.ts`**: one entry point `haptic(kind)` and a thin hook `useHaptics()` returning stable
  functions (keep the logic outside React). Kinds:
  - `tap` (light, about 10 ms): small toggles and opening bottom sheets/pickers. **Not** on every tab switch.
  - `success` (double pulse `[15, 30, 15]`): completing a task/habit/set, accepting a plan, closing the day.
  - `warning` (longer, about 40 ms): deleting, destructive swipes, "reorganize"-style actions.
- On Android (`isNative()` in `src/lib/platform.ts`) use the Capacitor Haptics plugin (`impact` Light, `notification`
  Success/Warning, `vibrate` for the 40 ms case); otherwise `navigator.vibrate` with the patterns above; always in `try/catch`,
  **never throw**, no-op on desktop and iPhone.
- Respect the existing **`vibration` setting** (off = no haptics at all) and `prefers-reduced-motion`. No second setting.
- Route the existing `cue()` vibration through `haptic()` so exactly one place vibrates (keep sound/confetti as is; keep the
  existing `level`/`streak`/`surprise` patterns by letting `haptic()` accept a raw pattern).
- Wire it only to a few meaningful places (task/habit complete, delete + undo bar, sheet open, close-day). Not on scroll,
  navigation or every button.
- Unit tests: Capacitor path, web fallback, `vibration=false` silences it, no crash when `navigator.vibrate` is missing.

## D. Notification icon on Android (the "!" in a circle)

Problem (reported): the small icon of the app's notifications (top left of the notification and in the status bar next to the
clock, network and Bluetooth) is a circle with an exclamation mark instead of the app symbol.

Cause (verified): `capacitor.config.ts` has no `LocalNotifications` config and `android/app/src/main/res/` has no `ic_stat_*`
drawable, so the plugin falls back to a default system icon. `src/lib/nativeNotify.ts` does not pass `smallIcon` either.

- Android needs a **monochrome small icon** (white shape on transparent background, no colours, no gradient). Create
  **`ic_stat_notification`** (neutral name, so the later rename does not touch it) as a VectorDrawable
  `android/app/src/main/res/drawable/ic_stat_notification.xml` (24dp, white fill): the app's sun symbol (half-circle with the
  base line and the five rays, see `assets/icon-foreground.png`), with strokes thick enough to stay readable at 24dp.
  Add it to `scripts/` generation only if there is already a script for Android icons; otherwise a hand-written vector is fine.
- `capacitor.config.ts`: `plugins.LocalNotifications = { smallIcon: 'ic_stat_notification', iconColor: '#3b82f6' }`.
- `src/lib/nativeNotify.ts`: also pass `smallIcon: 'ic_stat_notification'` in both `schedule(...)` calls (`rescheduleAll`,
  `showNow`), so it works even if the config is not picked up. Keep the three channels as they are (importance 4/4/5 already
  allows the heads-up banner; do not change channel settings, Android keeps them after creation).
- `cap sync android`, rebuild, install. Check with the test notification button in Settings and with a scheduled reminder:
  the status-bar icon and the notification header icon are the sun, not "!", on a light and on a dark theme, also on the lock
  screen and as a heads-up banner. Xiaomi (MIUI/HyperOS) may tint it; that is fine.
- Add a unit test that the schedule payload contains `smallIcon`. Add a short note to `docs/ANDROID.md` (section Notifications).

## E. Today screen upgrade (reuse what exists, keep it simple, no AI)

Current state (verified in `src/pages/Today.tsx`): a "now / next" card (`today.nowNext`, blue), `ProgressCard` (level, XP, four
streaks, never scolds) and `WeekRing` in the side/bottom area, `useSwipe` on the whole page that changes the DAY (left = next
day, right = previous day), `UndoBar`, `lib/streak.ts` (`mainStreak`, with saves), `StepsRing` as a ring example.
Do NOT rebuild these from scratch: restyle and extend them.

**Keep and build (high value):**
- **Focus Now card** at the very top: the current or next item, with a live countdown (time until it starts / time left).
  Built from the existing now/next logic; if nothing is planned, a calm empty state with one button to add something.
- **Daily progress ring** (done / planned for today) at the top, next to a small **streak** counter (`mainStreak.current`).
  Streak copy is gentle: never red, never a "you lost it" message, no new push notifications about it; the existing save
  system stays and is explained in one short line.
- **Swipe on a task row:** right = mark done (short animation + `haptic('success')`); left = **move to the next free slot**
  (today, else tomorrow) found by plain code from the existing schedule logic in `src/lib/schedule.ts`/`planner.ts`
  (deterministic, no AI), with the existing undo bar and `haptic('warning')`. Swipe is an EXTRA: every action keeps its normal
  button, the keyboard path and screen-reader labels. The page-level day swipe must not fire when the gesture starts on a task
  row (it stays for the empty area).

**Careful (constraints, from the review):**
- **Glassmorphism only on the Focus Now card**, with a solid-colour fallback; no `backdrop-filter` on lists, scrolling areas or
  more than one card (slow phones, readability). Text contrast stays AA in light and dark (axe test stays green).
- **Bento layout must stay simple on a small screen:** at 360 px wide it is a clean 2-column grid at most (Focus Now full width,
  ring + streak side by side), then the existing cards in a single column. On laptop keep the existing two-column layout.
- **"Hook" mechanics must stay useful, not manipulative:** no loss-aversion pop-ups, no pressure timers beyond the next item,
  no guilt copy, nothing new that interrupts the user. Everything respects `prefers-reduced-motion` and the `animations` setting.
- Dark mode: refine the existing dark palette (deeper background, softer borders), keep the theme switch and the system option.
- Check at 360x800 phone and laptop, light and dark, Serbian Latin/Cyrillic/English (long strings must not break the grid).
- New strings in all 6 locales. Regenerate README screenshots with the existing screenshot spec.
- Tests: the free-slot finder (edge cases: day full, past times, overlap), swipe done/move with undo, swipe does not change
  the day when started on a row, Focus Now countdown, ring values, i18n parity, axe.

## F. NOT in this task (later)

AI morning briefing, AI "reorganize the day" button, monetization/server, Google Play listing, renaming.
No behaviour changes beyond sections B-E.

## G. Acceptance criteria

- First launch with a clean profile: no AI tab, no AI onboarding step, no API key field anywhere.
- The switch shows all AI features exactly as before; existing users with a key keep them visible.
- Old backups import; the new setting round-trips in export/import.
- Haptics work in the Android app (success, warning, tap), do nothing on iPhone/desktop, and are silent when `vibration` is off.
- Notifications show the sun icon (status bar, notification header, lock screen, heads-up), never "!".
- Today screen: Focus Now card with countdown, daily ring + gentle streak, swipe right = done, swipe left = next free slot with
  undo, glass effect on one card only, no layout break at 360 px, AA contrast, no slowdown when scrolling on the phone.
- Format, lint, typecheck, build (Pages and Android), unit tests, e2e (Chromium, WebKit iPhone, Firefox), axe and the i18n
  parity test are green.
- **Phone update at the end (automatic):** my Redmi is connected by USB with debugging on. After the merge (or earlier if the
  build is green), run `adb devices` (adb from `ANDROID_HOME\platform-tools`, path only inside the command). If the phone is listed,
  run `gradlew installDebug` (JDK 21 via `JAVA_HOME` in the command), start the app (`adb shell am start`), and confirm in the Settings
  screen or via `adb shell dumpsys package <applicationId> | findstr versionName` that the version is 0.6.0. If the phone is not
  listed or shows "unauthorized", say so in the final report and tell me exactly what to tap on the phone. Do not uninstall anything.
- Debug app installed on my phone and starting, no crash (logcat): `gradlew installDebug` as before (JDK 21 in
  `C:\Projects\tools\jdk21` only via `JAVA_HOME` in the command, `ANDROID_HOME` only in the command). The `applicationId` does
  not change in this task, so it installs over the current app; do not uninstall anything.
- Small logical commits on `update-0.6`, PR, green CI, merge. Short dated entry in `JOURNAL.md`.
- Final report in Serbian: what changed, what is hidden and how to show it again, which ignore mechanism works, what I must
  check by hand on the phone.

---

## Prompt for Claude Code (copy this)

```
U projektu uradi update 0.6. Pročitaj docs/development/TASK_0.6.md i uradi ceo zadatak (verzija 0.6.0, grana update-0.6
iz main-a). Ako git status nije čist, stani i javi mi.

Prvo A, štednja tokena (odeljak A u fajlu): napravi .claudeignore i, ako ga Claude Code ne čita, iste putanje stavi u
permissions.deny u .claude/settings.json; koristi Graphify, headroom/peek za velike fajlove, kratke ispise, samo pogođene
testove tokom rada i ceo skup jednom po odeljku. Posle svakog dela commit i push.

Zadaci:
B. AI deo se samo SAKRIVA iza prekidača "AI tools (advanced)" u Podešavanjima, podrazumevano isključen za nove korisnike.
   Ništa ne briši. Postojeći korisnici koji imaju API ključ ili aiMode api ostaju sa uključenim AI-jem (migracija + test).
C. Vibracija već postoji (src/lib/effects.ts i prekidač vibration): proširi je, ne dupliraj. Centralni src/lib/haptics.ts
   (haptic + useHaptics), @capacitor/haptics na Androidu, navigator.vibrate kao rezerva, bez rušenja na desktopu i iPhone-u.
   Intenziteti: tap ~10ms, success [15,30,15], warning ~40ms. Ne vibriraj na svaki tab ni na skrol.
D. Ikonica notifikacija na Androidu je krug sa uzvičnikom jer nema ic_stat ikonice: napravi monohromatski ic_stat_notification
   (beli simbol sunca na providnoj pozadini), podesi LocalNotifications smallIcon i iconColor u capacitor.config.ts i prosledi
   smallIcon u nativeNotify.ts. Proveri na telefonu (statusna traka, zaglavlje notifikacije, zaključan ekran, heads-up).

E. Poboljšanje ekrana Today (odeljak E): kartica Focus Now na vrhu sa odbrojavanjem, dnevni prsten napretka + blag streak,
   swipe na zadatku (desno = završeno, levo = pomeri na sledeći slobodan termin običnim kodom, bez AI-ja, uz undo). Koristi
   postojeće (now/next kartica, ProgressCard, WeekRing, useSwipe, UndoBar), ne pravi ispočetka. Glassmorphism samo na jednoj
   kartici sa rezervom, jednostavan raspored na 360 px, kontrast AA, bez pritisaka i osećaja krivice. Swipe je dodatak, dugmad
   ostaju. Dnevni swipe stranice ne sme da se aktivira kad gest počne na zadatku.

Ne preimenuj aplikaciju. U TASK_RENAME.md samo promeni brojeve verzije/grane na 0.6.1 / update-0.6.1. Obriši zastareli
docs/development/TASK_HIDE_AI_AND_HAPTICS.md i dodaj red za TASK_0.6.md u docs/development/README.md.
Svi novi stringovi u svih 6 jezika, i18n parity test mora da prolazi.
JDK 21 iz C:\Projects\tools\jdk21 i ANDROID_HOME samo u komandi, gradlew installDebug; ne deinstaliraj aplikaciju.

Na kraju PR, zeleni CI, merge i rezime na srpskom (šta je sakriveno, kako se vraća, koji mehanizam ignorisanja radi,
šta da proverim na telefonu).
```
