# Update 0.5: Android app (Capacitor) + smartwatch steps and sleep

Goal: the same app, packaged as a real Android app, that reads **steps and sleep** from Health Connect
(Huawei Health writes there), shows a steps ring on Today, and sends local notifications even when the app is closed.
The PWA on GitHub Pages must keep working exactly as before.

Branch: **`update-0.5`**, created from an up-to-date `main`. Version: **0.5.0**.
Use the `release-bump` skill for the version bump. Explore the code first; do not guess file names.
Verify every library and API against its current documentation before using it (versions change; do not rely on memory).

## Target device (for the guide and for testing)

- Xiaomi Redmi Note 13 Pro 5G, Android 16 (build BP2A.250605.031.A3), Xiaomi system UI.
- Android 14+ has Health Connect built into the system (no separate app to install). Source of data: Huawei Health.
- Xiaomi aggressively kills background apps and blocks installs over USB by default, so the guide must cover that (see Part 7).

---

## Part 0: "Workout" becomes "Health" (all health data in one section)

Do this first; the later parts build on it.

- The bottom-nav item "Workout" is renamed **Health** (all 6 locales) and its dumbbell/bodybuilder icon becomes a
  **heart** (a generic heart or heart-pulse icon in the same icon set as the other tabs; do not copy any company's logo).
- The Health screen becomes the single home for everything body-related, as clear sections/cards on one scrollable screen
  (or tabs inside the screen, whichever fits the existing design better):
  1. Training (workout, series, personal records, splits) - existing content, unchanged behaviour.
  2. Steps (the new ring, goal, 7-day chart).
  3. Sleep (manual entry + watch data).
  4. Protein / nutrition.
  5. Watch connection status ("Connect watch" entry point, last sync).
- Move the existing sleep and protein screens/cards into Health. Today keeps only its short summary cards, which
  link into the Health sections. Settings keeps only configuration (goals, source, permissions).
- Keep internal IDs, data and routes working: old links, notifications, the dismissed-ids list and exports must not break
  (add a redirect from the old route if the route name changes). No data migration is needed for this rename.
- Update the guided tour, onboarding text, notification deep links, tests (unit, e2e, axe) and the screenshots in docs
  where the old name or icon appears.

---

## Part 1: Capacitor and the Android project

1. Add Capacitor (core, cli, android) and `capacitor.config.ts`. App name "My Day AI".
   Application ID: propose `com.vukasinknezevic.mydayai` and write it clearly in the final report
   (it becomes permanent once published on Google Play).
2. Generate the `android/` project and commit it. Add the proper `.gitignore` entries (build outputs, `local.properties`,
   keystores). Never commit signing keys.
3. A separate build target for native: env var such as `VITE_TARGET=android`:
   - relative `base` (the Pages build keeps `/my-day-ai/`),
   - **no PWA service worker registration** and no install card / iPhone instructions inside the native app,
   - everything else identical. The Pages deploy and its tests must be unaffected.
4. Scripts in `package.json`: `build:android`, `cap:sync`, `cap:open`, and `cap:run` (install on the connected phone).
5. App icons (adaptive icon with foreground/background), splash screen, dark/light status bar matching the theme,
   safe areas (gesture bar at the bottom, camera cutout at the top), keyboard does not cover inputs.
6. Hardware/gesture Back: connect `@capacitor/app` `backButton` to the existing "smart Back" logic from 0.4
   (close sheet, go back, only exit on the root screen).
7. Orientation: portrait only.

## Part 2: Health layer `src/lib/health/`

Keep it behind an interface so the rest of the app never touches a plugin directly:

- `HealthSource` interface: `isAvailable()`, `requestPermissions()`, `getPermissionState()`, `getDailySteps(date)`,
  `getSleepSessions(from, to)`, `listDataOrigins()`.
- Implementations: `healthConnect` (native), `noop` (web/PWA, feature hidden), `mock` (tests, deterministic).
- Choose the Health Connect plugin after checking what is maintained and compatible with the current Capacitor version
  and Android 16 / the current target SDK. If no plugin is good enough, write a small local Capacitor plugin in Kotlin.
  Explain the choice in `docs/ARCHITECTURE.md` (3-5 lines).
- Permissions: read **Steps** and **Sleep** only (nothing else). No `QUERY_ALL_PACKAGES`.
- Android 14+ requirements: the permission rationale activity (privacy policy screen reachable from Health Connect:
  `ACTION_SHOW_PERMISSIONS_RATIONALE` / `VIEW_PERMISSION_USAGE`) and the manifest declarations. Add a simple in-app
  "Privacy" screen text in all languages (what is read, that it stays on the phone, how to revoke).
- **Steps:** use the aggregate query per day (Health Connect de-duplicates between sources), not a sum of raw records.
- **Sleep:** read sleep sessions; the night belongs to the day you wake up. Merge adjacent sessions, ignore naps shorter
  than 30 min, ignore stage detail for now. Duration only.
- Data origins: list which apps wrote steps/sleep (package name + a friendly name when known) so the user can pick
  a source; default "any source".
- All plugin calls in try/catch; failures return a typed error, never crash the UI, never overwrite stored data.

## Part 3: Settings: "Connect watch"

1. Settings -> "Connect watch" (only on native). Explains in plain words what is read and why, then requests permissions.
2. States: not available (Health Connect missing/disabled), not connected, connected (with source), permission revoked.
   Each state has a clear next action (open Health Connect settings via intent).
3. Source picker (from `listDataOrigins()`), "Sync now" button, "Last synced: ..." text, "Disconnect".
4. Sync runs on app start, on resume (max once per 15 min) and on "Sync now". No background polling.

## Part 4: Sleep from the watch

- Imported sleep becomes a normal `SleepLog` with `source: 'watch'` (extend the type, bump the data version,
  `migrateData` stays idempotent and old exports still import).
- **Manual entry always wins** for the same night. Never overwrite manual data; never duplicate on re-sync
  (stable id from the session start time / origin id).
- Today and the sleep screens show a small watch icon on synced entries.
- Existing XP / streak / goal rules for sleep apply once per night, exactly as with manual entry.
- Undo ("Poništi") must work for synced entries too, without them reappearing on the next sync
  (remember dismissed ids).

## Part 5: Steps

- Daily goal default **10 000**, adjustable in Settings (min 1 000, max 50 000).
- Steps ring on Today (same style as the week ring, accessible label, no layout jump while loading).
- XP once per day when the goal is reached (idempotent, same pattern as workout XP). No guilt text if missed.
- Steps history: last 7 days small bar chart on the steps detail screen (reuse existing chart components if any).
- Reminders at **12:00, 16:00, 20:00** only if the goal is not reached and only if the user enabled them. They respect the
  existing rules: max 6 notifications a day, nothing after bedtime, everything can be turned off.

## Part 6: Local notifications (works with the app closed)

1. `@capacitor/local-notifications`: move reminders from the web implementation to native when running on Android.
   Keep the web path for the PWA.
2. Runtime permissions: notifications (Android 13+) with a friendly explanation screen before the system prompt.
3. Steps reminders cannot know the step count at the moment they fire, so: schedule them ahead, and every time the app
   opens or syncs, cancel/reschedule today's remaining steps reminders if the goal is already reached.
   (Do not add a native background worker in this version; note it as a future option in the docs.)
4. Morning routine notification with a **"Done ✓"** action button that marks the routine done without opening the app.
5. Alarm (wake-up) as a high-priority notification with a **harder Stop** (for example hold to stop, or one extra
   confirmation step). Use exact alarms only through the user-granted permission flow
   (`SCHEDULE_EXACT_ALARM`: explain and open the system screen). Do NOT request `USE_EXACT_ALARM` or full-screen intent
   unless you verify that Google Play allows it for this kind of app; if it is risky, ship the simpler version and write the
   limitation in the docs.
6. Notification channels: Reminders, Routine, Alarm (separate, user can tune each in system settings).
7. Tapping a notification opens the right screen (the same behaviour as the service worker had in the PWA).
8. Re-schedule everything after device reboot and after app update (check what the plugin handles by itself).

## Part 7: Move data from the PWA + the guide

- The PWA and the native app have different storage, so data does not carry over automatically.
  Use the existing JSON export/import. Add a clear "Move from the web version" card in the native onboarding:
  1. in the web app: Settings -> Export, 2) in this app: choose the file. Test the import with a real export from 0.4.3.
- Write `docs/ANDROID.md` as a **plain numbered step-by-step guide for a complete beginner** (what to click, where),
  for this exact phone:
  1. Install Android Studio (with the Android SDK and JDK it ships), what to tick in the installer.
  2. Phone: Settings -> About phone -> tap the MIUI/HyperOS version 7 times -> Developer options.
  3. Turn on **USB debugging**, and on Xiaomi also **Install via USB** and **USB debugging (Security settings)**
     (these need a Mi account and sometimes a SIM); explain if the options are greyed out.
  4. Cable in, accept "Allow USB debugging" on the phone, check with `adb devices`.
  5. `npm run build:android`, `npx cap sync`, then run on the phone (Android Studio Run or `npm run cap:run`).
  6. Health Connect: first run, permission screens, where to revoke.
  7. Xiaomi battery and background settings for reminders: Autostart ON, Battery saver -> **No restrictions**,
     lock the app in the recents screen, notifications allowed, alarms & reminders allowed.
  8. Troubleshooting table: phone not seen by `adb`, "App not installed", no steps/sleep data, notifications not coming.
- Update `README.md` (short section: Android app, how it differs from the PWA) and `docs/development/README.md`
  (add this file).

---

## Rules

- Every user-facing string goes through i18n in **all 6 locales** (sr latin/cyrillic, en, fr, es, de, ru). The parity test stays green.
- The PWA stays fully working: all existing unit and e2e tests (Chromium, WebKit iPhone, Firefox) stay green.
- Pure logic (aggregation, night assignment, merge, dedupe, goal/XP, reminder planning) lives in `src/lib/` and is
  unit-tested with the mock source. Add tests for: night assignment around midnight, naps, duplicates on re-sync,
  manual-wins, dismissed ids, goal reached exactly once per day, reminder rescheduling.
- Accessibility (axe) stays clean on the new screens; touch targets >= 44 px.
- Do not store health data anywhere except the existing app storage. No network calls with health data.
  Update the privacy text if anything changes.
- If a system tool is missing (Android Studio, SDK, JDK, `adb`, no phone detected), do NOT install system software
  silently. Finish everything that does not need it, write the exact next steps for me, and stop that part.
  If `adb devices` does not list the phone, stop the on-device part and report.

## Acceptance criteria

- `npm run build` (Pages) and `npm run build:android` both succeed; format, lint, typecheck, unit tests and e2e are green.
- A debug build installs on the Redmi Note 13 Pro 5G; I can connect Health Connect, see steps on Today and a night of sleep
  from the watch (manual entry still wins), and get a reminder with the app closed.
- Version `0.5.0` in `package.json`, changelog entry, docs updated (`ANDROID.md`, README, ARCHITECTURE).
- Small logical commits on branch `update-0.5`, PR to `main`, green CI, merge (same style as before), Pages deploy still OK,
  branch deleted.
- Final report: what works, what was tested only with the mock vs on the phone, plugin choice, Application ID, and anything
  risky for Google Play (exact alarms, Health Connect declaration, privacy policy).

---

## Prompt for Claude Code (copy this)

```
U projektu "My day AI" napravi update 0.5 (Android). Pročitaj docs/development/TASK_ANDROID.md i uradi zadatak
deo po deo (prvo Deo 0: "Workout" postaje "Health" sa srcem i svi zdravstveni podaci u tu sekciju;
zatim Capacitor, Health Connect sloj, "Poveži sat", san sa sata, koraci, notifikacije, ANDROID.md vodič).

Važno:
- grana se zove update-0.5, verzija 0.5.0
- PWA na GitHub Pages mora da ostane potpuno ispravna, svi postojeći testovi zeleni
- ako nešto sistemsko fali (Android Studio, adb) ili telefon nije vidljiv, ne instaliraj ništa sam:
  završi sve ostalo i napiši mi tačne korake, pa stani na tom delu
- na kraju PR, zeleni CI, merge u main i provera deploy-a

Na kraju mi napiši kratak rezime na srpskom: šta radi, šta je testirano samo mock-om a šta na telefonu,
koji plugin si izabrao i koji su rizici za Google Play.
```
