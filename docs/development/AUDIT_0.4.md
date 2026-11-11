# QA audit before update 0.4

State: `main` at `2c775f8`, version 0.3.1, the review was done on 10 Nov 2026. The app code was not changed. This file is the input for `TASK_0.4.md`.

## 1. What was checked and how

| Check                               | Result                                                                                                      |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `npm run lint`, `npm run typecheck` | clean                                                                                                       |
| `npm run test:coverage`             | 1948 tests pass, 97% of lines in `src/lib`                                                                  |
| `npm run build`                     | no warnings; the main bundle 660 kB (201 kB gzip)                                                           |
| Loading all screens                 | 3 browsers × 9 sizes × 9 screens = 243 loads, 0 JavaScript errors                                           |
| Horizontal scroll                   | none (once 16 px on the Life screen, 360 px, Chromium, while a chart was drawing; not repeated)             |
| Offline after the first visit       | works in all three browsers, including the screens that load later                                          |
| Targeted behavior checks (scripts)  | see the findings below; each says whether it was confirmed by running or only by reading code               |
| Reading the code                    | the whole `src/` (pages, components, `lib`, the AI layer, translations), `index.html`, the PWA settings, CI |
| History and documents               | 79 commits, PR #1–#6, README, REPORT, `docs/`, the project summary with the testers' remarks                |

Browsers: Chromium, WebKit and Firefox (Playwright 1.65). Sizes: 320×568, 360×740, 390×844, 430×932, 844×390 (a phone on its side), 768×1024, 1024×768, 1366×768, 1920×1080.

**What this does not cover (honestly):**

- **A real iPhone is not possible.** WebKit in Playwright on Windows is not iOS Safari: no notch and no bottom bar, no "from the home screen" mode, no share sheet, no real notifications and no touch keyboard. All the iOS items below are marked "check on a real iPhone" (Andrea).
- I have not held a real Android phone in my hand: Chromium with a phone profile does not show the system bars, a real installation or real notifications.
- Firefox was checked as a desktop browser with a phone-sized window, not as Firefox for Android.
- AI with a real API key has still not been tried. A screen reader was not tested by hand.

## 2. Findings by priority

Labels: **P0** data loss or a bad first impression for every new user, **P1** an important bug or a gap in behavior, **P2** quality, accessibility, look, **P3** small things. "Confirmed" means that I triggered the behavior in a browser; "from code" means that the conclusion comes from reading the code.

### P0

**A-01. "New update 90%" stays forever on the first visit.** Confirmed in all three browsers: after 25 s it still says "Downloading the new version… 90%", and it disappears only after a reload. Every new user (and every tester) sees that as the first thing.

- Where: `src/lib/updates.ts:51-58`. The first installation of the service worker also sends `updatefound`, so `startProgress()` starts, and `setReady()` is called only if `navigator.serviceWorker.controller` already exists, which it does not on the first installation.
- Fix: in `watch` exit right away if there is no `navigator.serviceWorker.controller` (the first installation is not an update). A test in `UpdateBanner.test.tsx` and e2e: after the first visit there is no message.

**A-02. A failed read from IndexedDB looks like "no data" and then real data is overwritten.** From code (not triggered, it needs a broken IndexedDB; it is known that on iOS the connection to the database is sometimes lost after returning from the background).

- Where: `src/lib/storage.ts:6-13` (the error is caught and `null` is returned), `src/store.ts:227-229` (`hydrated: true` even after an error; that `setState` immediately writes an empty state), `src/App.tsx:40-41` (the intro is shown).
- Fix: let `getItem` throw an error; `onRehydrateStorage: () => (state, error)` keeps `hydrationError`; `App` then shows "The data could not be loaded" with a "Try again" button and writes nothing. `setItem` must not write before a successful load. A test with a `fake-indexeddb` that throws an error.

**A-03. The data is not protected from deletion by the browser itself, and an iPhone user does not know that.** From code and the known platform rules.

- `navigator.storage.persist()` is not called anywhere, so the storage is "best effort" and Android may delete it when space runs out.
- Safari on an iPhone deletes a site's data after 7 days of not using it if the app was not added to the home screen. Data entered in a Safari tab is **not carried over** into the app from the home screen (a separate storage). The install card (`src/components/IosInstallHint.tsx:7-25`) is not shown during the intro (`src/App.tsx:41`), so the tester first enters everything in Safari.
- Fix: after the intro call `navigator.storage.persist()`; on iOS in Safari show the installation **before** the intro with a sentence saying that the data from Safari is not carried over; in the Settings the date of the last backup and a gentle reminder once a week. Check on a real iPhone.

**A-04. A midterm without an entered registration deadline never gives the "Unregistered" warning.** Confirmed: a midterm without a deadline has no red warning on the Today screen (at most "is today/tomorrow" the day before). The README says that this is exactly the main problem the app solves, and the deadline is optional in the form.

- Where: `src/lib/schedule.ts:197` and `src/lib/reminders.ts:36` (the condition requires `registrationDeadline`).
- Fix: when there is no deadline, calculate a default (e.g. 7 days before the date) and write "deadline not entered, check the faculty's site"; in the form a short explanation next to the field. Tests in `schedule.test.ts` and `reminders.test.ts`.

### P1

**A-05. One workout is paid twice, and the counters disagree.** Confirmed: an activity "Workout" marked as done gives 30 XP, then entering the same workout on the Workout screen gives another 30 XP; "This week: 1 / 4" counts only the entry, the 🔥 streak counts both, the planner counts only activities.

- Where: `src/pages/Today.tsx:130-143`, `src/pages/Workout.tsx:101-128`, `src/lib/xp.ts:206-211`, `src/lib/planner.ts:292-300`, `src/lib/overview.ts:72-75`.
- Fix (together with the item "New workout" from the summary): a workout is one thing. A scheduled workout is an activity; entering exercises is tied to it (`Workout.activityId`), marks it as done and there is one XP id per workout. All the counters read the same source.

**A-06. Only today is visible.** From code: `src/pages/Today.tsx:113-116` uses only `today`. An activity entered for tomorrow ("tomorrow study math 2h") cannot be seen, edited or deleted until tomorrow, and yesterday's cannot be marked afterwards.

- Fix: a day picker at the top of the Today screen (‹ yesterday · today · tomorrow ›, a 7-day strip, swiping left/right), everything else on the screen follows the chosen day.

**A-07. Deleting with one tap, with no confirmation and no "Undo".** Confirmed for an obligation (a midterm disappears at once). The same applies to: an obligation `src/pages/Study.tsx:585-591`, a workout `src/pages/Workout.tsx:373-379`, a meal `src/pages/Workout.tsx:512-518`, a habit with its whole history `src/pages/Life.tsx:368-375`, an expense `src/pages/Life.tsx:290-296`, a one-time activity `src/pages/Today.tsx:297-305`, "Discard all" `src/pages/Planner.tsx:120-125`.

- Fix: one shared "Deleted · Undo" (6 s) for all deletions; `remove` in `src/store.ts:110-119` returns the deleted item and the removed XP so that undoing restores both.

**A-08. "Sure?" stays active on an iPhone.** Confirmed in WebKit: after the first tap on "Delete course" and a tap somewhere else the button still waits for confirmation (in Chromium and Firefox it goes back). WebKit does not give focus to a button on touch, so `onBlur` never arrives.

- Where: `src/components/ConfirmButton.tsx:27`.
- Fix: going back after 4 s and on `pointerdown` outside the button. Check on a real iPhone.

**A-09. iPhone: content passes under the clock and the battery when scrolling** (reported by Andrea). It cannot be triggered in Playwright.

- Where: `src/index.css:19` (the spacing is on `body`, so it scrolls together with the content), `index.html:12`.
- Fix: a fixed bar with the height `env(safe-area-inset-top)` in the background color above the content (`position: fixed; top: 0; z-index` above the page), the same for messages. Check on a real iPhone, upright and on its side.

**A-10. Notifications are unfinished.** From code.

- Tapping a notification does not open the app: the service worker is made by `vite-plugin-pwa` in the `generateSW` mode (`vite.config.ts:20-41`) and has no `notificationclick`.
- There is no `tag`, so after reopening the same notification is repeated (`src/lib/useReminders.ts:25`; the list of sent ones lives only in memory, line 42).
- There is no `badge`, so the status bar shows a bell instead of the logo (a remark from the summary).
- The text always uses 24h regardless of the setting (`src/lib/reminders.ts:30`).
- Fix: move to `injectManifest` with our own `src/sw.ts` (precache as before + a `notificationclick` that brings the app to the foreground + a base for buttons in the notification for the morning routine); `tag: r.id`; a monochrome white 96×96 icon; sent ids are remembered by day.

**A-11. Quick entry does not understand Cyrillic, and the example in the field is in Cyrillic.** Confirmed with the language "Српски (ћирилица)": "легао 1:30" becomes the activity "Легао 01:30–02:00", "сутра учење мата 2h" becomes an activity today, and the example in the field says "2ч".

- Where: `src/lib/quickParse.ts:31-38` (`normalize` does not convert Cyrillic), the example text `src/i18n/locales/sr-Latn.ts:351`.
- Fix: `normalize` first calls `cyrillicToLatin` (`src/i18n/translit.ts:93`) and accepts "ч" as "h"; tests for all the examples from the field in both scripts.

**A-12. "bed 23:30" entered the next morning does not count sleep.** Confirmed: at 09:00 "bed 23:30" then "up 8" gives "Last sleep (—)" and the average "—".

- Where: `src/lib/quickParse.ts:171-172` (the previous night is assumed only before 06:00).
- Fix: if the bedtime is later than the current time, it was yesterday. Also: sleep cannot be edited or deleted (`src/pages/Life.tsx:48-125` has no such option), and a forgotten click on "Got up" leaves "Went to bed" turned off forever. Add editing and deleting a sleep entry.

**A-13. "Back" on Android leaves the screen instead of closing the panel.** Confirmed: with a bottom panel open in the Settings, Back goes to Today. There is no work with the history at all (`src/components/Sheet.tsx`, `src/App.tsx:44`). It is solved by the item "Smart Back" from the summary.

**A-14. A backup is hard to restore on a phone.** From code.

- Import exists only as pasting text (`src/pages/DataCard.tsx:70-81`); there is no file choice.
- Downloading goes through `a[download]` and immediately calls `URL.revokeObjectURL` (`src/lib/ics.ts:184-191`), which in Safari can interrupt the download; in an installed app on an iPhone a file download is unreliable.
- Fix: "Choose file" (`<input type="file" accept="application/json">`), file sharing through Web Share as for the calendar, `revokeObjectURL` with a delay. This is also the way the data will be moved from the PWA to the Android app.

**A-15. A badly saved piece of data can leave the app stuck on the error screen.** From code: the import checks the lists, but not `progress` and `settings` (`src/lib/dataIO.ts:62-73`, `src/lib/defaults.ts:113-124`). If a screen crashes because of the saved data, `ErrorBoundary` offers only "Reload" and a download (`src/components/ErrorBoundary.tsx:20-45`), so the crash repeats.

- Fix: a `zod` check of `progress` and `settings` on import and on load (a bad field is replaced by a default); in `ErrorBoundary` a third button "Delete data and start over" (active only after downloading a copy).

### P2

**A-16. An activity after midnight does not exist in the model, and the day lasts until 01:00.** Confirmed: "study 00:15-00:45" is drawn at the top of the timeline, at 09:00.

- Where: the form rejects an end before the start `src/components/ActivityForm.tsx:40`; quick entry cuts at 23:59 `src/lib/quickParse.ts:279-280`; the day line `src/pages/Today.tsx:53,72`; the planner `src/lib/planner.ts:69,172`.
- Fix: treat a time before wake-up as "after midnight of the same day" in the display and in "Now/Next"; an end smaller than the start means the next day (e.g. going out 22:00–01:00).

**A-17. An optional time cannot be deleted once chosen.** From code: the picker has only "Done" (`src/components/Pickers.tsx:191-200`); it affects the time of an obligation (`src/pages/Study.tsx:669-675`). Fix: "Clear time" in the panel when the field is optional.

**A-18. Keyboard and focus in panels.** Confirmed: Tab leaves an open bottom panel for the page behind it (`src/components/Sheet.tsx:50-65`, and the panel has `aria-modal`). The shortcuts N/T/W work even while a panel is open (`src/components/Shortcuts.tsx:34-58`). Fix: a focus trap and `inert` on the content behind; shortcuts turned off while a dialog is open.

**A-19. The focus is not visible on the date field.** From code: the real `input` is transparent (`src/components/Pickers.tsx:228-241`), and the wrapper has no `focus-within` (`src/components/styles.ts:2-3`). Fix: `focus-within:outline` on the wrapper.

**A-20. A squeezed checkbox on narrow screens.** Confirmed in Chromium and Firefox at 320–430 px: the box next to "Browser notifications…" is 13–17 × 20 px.

- Where: `src/pages/Settings.tsx:220-234` (`size-5` without `shrink-0`); the same pattern in `src/pages/Onboarding.tsx:216-224` and `src/pages/Study.tsx:512-538`.

**A-21. Small touch targets.** Confirmed by measuring: Going / Not going / Sometimes are 32 px high (`src/pages/Study.tsx:292`), the XP button 28 px (`src/components/ProgressCard.tsx:35`), the boxes 20 px. The platform recommendation is 44–48 px. Fix: `min-h-11` and larger spacing.

**A-22. An obligation row on the Today screen breaks untidily.** Confirmed at 320 px and at 844 px: "✔ Done · Skip · ✎" in one row, "✕" alone in the next (`src/pages/Today.tsx:243-318`). Fix: two tidy rows (the time and the name, then the main button) and a "⋯" that opens a bottom panel with the other actions (edit, skip, only today, delete).

**A-23. The first load is heavy: 660 kB (201 kB gzip) in one file.** All 7 languages are loaded immediately (`src/i18n/index.ts:35`, `eager: true`), as are the Planner, AI, Settings and Study (`src/App.tsx:7-16`). Fix: load only the chosen language, the others on demand; AI (with `zod`), Settings, Planner and the intro as `lazy`. Goal: the initial bundle under 120 kB gzip.

**A-24. Calendar: all-day events ring at midnight.** From code: a registration deadline has an alarm "0 min before" an all-day event, and an obligation without a time "24 h before" (`src/lib/ics.ts:72-79,129,140`), which is 00:00. Fix: for all-day events an alarm at 09:00 that day and at 09:00 the day before.

**A-25. The Overview mixes planned and done.** `src/lib/overview.ts:20-37` counts planned hours as "Study" too, and "Workouts" do not count done activities (lines 72-75). Fix: show "done / planned / goal" from the same source as XP.

**A-26. Traces of the personal version and small language errors in the general app** (`src/i18n/locales/sr-Latn.ts`, then all languages):

- "I usually get up at (between 8 and 10)" and "(between 00 and 02)", lines 318-319; the default 09:00 and 01:00 in `src/lib/defaults.ts:8-9`.
- The last level "Engineer" (line 120) is not for every faculty; suggestion "Graduate".
- "Browser notifications" (266) is confusing in an installed app; "New midterm / exam / homework / lab" (513) after the move to user-defined types; "Add something above" (354), while quick entry is now below.
- AI import still asks for `domaci|lab` (439), and `src/lib/ai/apply.ts:43` writes that as a type without our letters.
- Feminine forms are missing: "Welcome" (301), "you are not registered" (91), "so that you save" (565-566).

**A-27. The AI overview shows raw dates and time** (`2026-11-12 18:00`), not the app's format: `src/pages/Ai.tsx:47-50,79-82`.

**A-28. The reward is spent only in 30 or 60 min;** the rest under 30 cannot be used (`src/components/ProgressCard.tsx:86-98`). Fix: "Use…" opens a choice of minutes up to the balance.

**A-29. Habits and a screen open for a long time.** The step is 0.5 or 5 regardless of the unit (`src/pages/Life.tsx:393,404`), a habit cannot be edited, and `today` is calculated only when the screen opens, so an entry after midnight on an open screen goes to yesterday (`src/pages/Life.tsx:317`, `src/pages/Study.tsx:74`, `src/pages/Workout.tsx:73`).

**A-30. Expenses:** only the last 15 are visible (`src/pages/Life.tsx:279-282`) and an expense for another day cannot be entered.

**A-31. Settings for installation and for sharing the link.**

- The manifest: `lang: 'en'`, no `id`, `scope`, `shortcuts` or `screenshots`; the same image for the `any` and the `maskable` icon, so check whether the logo is inside the safe zone (`vite.config.ts:23-38`); PNG icons are not in the offline cache (line 40), so an offline notification has no icon.
- `index.html` has no `meta description` and no Open Graph tags, so a link in a CV or a message has no title, description or image.
- The iPhone splash screens cover sizes up to the iPhone 15 (`index.html:14-58`).

**A-32. A laptop and a tablet have the phone layout in one narrow column** (`src/components/Layout.tsx:52,62`); at 1920 px most of the screen is empty, and a phone on its side gets the side menu. Suggestion: from 1024 px two columns on the Today screen (obligations on the left, the day line and progress on the right).

**A-37. A change made right before closing can be lost.** Confirmed by measuring: closing or reloading at the very moment after a change loses the change in Chromium (0 of 5), after 20 ms everything is saved (5 of 5); WebKit 4 of 5 on closing. The window is very short, but the automatic restart for an update (`src/lib/updates.ts:66`) can hit it.

- Fix: remember the last write in progress (`src/lib/storage.ts:14-20`) and wait for it before `update(true)`; an e2e test "change then restart".

### P3

- **A-33.** `DATA_VERSION = 2`, while the code already has a "v2 → v3" migration (`src/lib/defaults.ts:54,85-110`); `persist` has `version: 1` (`src/store.ts:220`). Align to 3 and add a test.
- **A-34.** `src/lib/updates.ts` has 25% coverage (and that is exactly where A-01 is). E2E runs only in Chromium and on the iPhone profile (`playwright.config.ts:18-30`); add a short pass through the screens for Firefox, a tablet and 1920 px.
- **A-35.** Publishing does not run the type check or e2e (`.github/workflows/deploy.yml:29-31`) and runs in parallel with CI. Tie publishing to a successful CI.
- **A-36.** The exercise name suggestions are the system ones (`datalist`, `src/pages/Workout.tsx:269,306-310`), against the rule "all offers come from the app".
- **A-38.** They do not go into the repo root, but they exist locally: `MY_DAY_AI_REZIME.md`, `MY_DAY_AI_V03_ZADATAK.md`, `MY_DAY_AI_V031_ZADATAK.md`, `My Day AI.txt`. Decide: into `.gitignore` or (without the personal parts) into `docs/development/`.

## 3. What is good (so it does not get broken)

- Clean logic in `src/lib` with tests, including 300 random weeks for the planner and a check of all translations.
- No JavaScript error and no horizontal scroll on 9 sizes in 3 browsers; dark and light theme; the app works offline.
- Our own panels and pickers work the same in all three browsers; a panel follows the finger.
- XP is honestly returned on undo; AI answers are checked before display; AI text is shown as text (no HTML injection).

## 4. What must be on a real device (cannot be automatic)

| Device            | What to check after 0.4                                                                                                                                                                      |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| iPhone (Andrea)   | the status bar does not cover the content (A-09); "Sure?" goes back (A-08); "Add to calendar" offers "Add all"; the data stays after 8+ days; the tutorial; swiping from the edge for back   |
| Android (Vukašin) | "New update" does not appear on the first installation (A-01); tapping a notification opens the app and the icon is the logo (A-10); the Back button and gesture (A-13); vibration and sound |

## 5. Watch: Android (Capacitor) + Health Connect + Huawei Watch GT 6 Pro

### 5.1 What is possible and what is not

- **A PWA (what exists now) cannot read health data.** A browser has no access to Health Connect, Huawei Health or the step counter. A real Android app is needed for the watch and steps.
- **Capacitor** packs the same code (React + Vite) into an Android app and gives access to the system through plugins. There stays one code base, and the PWA still works.
- **Health Connect** is Google's shared storage of health data on the phone. On Android 14 and newer it is part of the system, on Android 9–13 it is a separate app from the Play store. The app reads steps and sleep with the user's permission (`android.permission.health.READ_STEPS`, `READ_SLEEP`).
- **Huawei Health does not write data into Health Connect.** I did not find any official announcement by Huawei or Google about it; the sources that write about it (unofficial, a maker of sync tools) say that there is no built-in connection even in 2026. So there are two paths:

| Path                                            | How it works                                                                                                                       | Cost and effort                                                                                                                                    | Rating                                                              |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| **A. A bridge to Health Connect (recommended)** | a bridge app (e.g. Health Sync) reads Huawei Health and writes steps and sleep into Health Connect; My Day AI reads Health Connect | the bridge is paid (check the price in the Play store, there is a trial period); set up once                                                       | the fastest; the same connection works for Samsung, Fitbit, Garmin… |
| **B. Huawei Health Kit directly**               | My Day AI signs in to a Huawei account and reads the data through Huawei's SDK                                                     | a Huawei developer account with identity verification, an app registration, approval of health permissions (can take weeks), HMS Core on the phone | only if path A does not give sleep or is inaccurate                 |

- Unconfirmed, must be seen on your phone: whether the bridge transfers **sleep with stages** from the GT 6 Pro and how much it lags (steps usually arrive with a delay of a few minutes to an hour).
- **Steps without a watch:** if the "main step-counting app" on the phone is Google Fit or Samsung Health, it already writes into Health Connect and no bridge is needed. If the watch counts the steps, see path A.

### 5.2 What you do by hand (once)

1. **Tell me the phone model and the Android version** (Settings → About phone). Step 4 depends on it.
2. **Android Studio** on the laptop: download from developer.android.com/studio, install with the default options (about 10 GB on disk). It brings the Android SDK, `adb` and Java. After installation open it once to download the SDK.
3. **USB debugging on the phone:** Settings → About phone → tap "Build number" 7 times → back → Developer options → turn on "USB debugging". Connect the phone with a cable and on the phone confirm "Allow USB debugging" (tick "Always allow from this computer").
4. **Health Connect:** Android 14+: Settings → Security and privacy → Health Connect. Android 13 or older: install "Health Connect" from the Play store.
5. **The bridge (path A):** install the bridge app, sign in to the Huawei account when it asks, choose Huawei Health → Health Connect for **steps** and **sleep**. After one day check in Health Connect (Data and access) whether the steps and last night's sleep from the watch are visible.
6. **Only if path A does not work (path B):** register at developer.huawei.com (identity verification with a personal document, takes a few days), then tell me and I will prepare the Health Kit application.
7. **Later, for Google Play (1.0), not for 0.4:** a Play Console account (25 USD once), a privacy policy and a health data statement. An app that reads Health Connect goes through an additional Google review.

### 5.3 What Claude Code does by itself (when steps 1–4 are done)

1. Adds Capacitor (`@capacitor/core`, `@capacitor/cli`, `@capacitor/android`), `capacitor.config.ts` (the app id `io.github.vukasinknezevic.mydayai`, the name "My Day AI"), `npx cap add android`.
2. An Android build without the PWA service worker (a separate variable at build time), icons and a splash screen from the existing `public/icon.svg`.
3. A Health Connect plugin (candidates: `@capgo/capacitor-health`, `@capawesome-team/capacitor-health`; choose the one that on Android reads **both sleep and steps**, check that in its documentation before installing), permissions in `AndroidManifest.xml`, a screen explaining why the permission is requested.
4. A layer `src/lib/health/` with one interface (`getSteps(date)`, `getSleep(date)`); in the PWA it returns "not available", so manual entry stays.
5. `@capacitor/local-notifications`: real scheduled notifications even when the app is closed, with buttons (a base for reminders, the morning routine and steps).
6. Build and install on the phone over a cable: `npx cap sync android`, `gradlew assembleDebug`, `adb install`.
7. Moving data from the PWA: "Download file" in the PWA, "Choose file" in the Android app (that is why A-14 is a precondition). The Android app has its own storage, the data does not move by itself.

### 5.4 Steps and reminders toward the goal (10,000)

- Source: Health Connect (`READ_STEPS`), the same way as sleep. The goal is adjustable, 10,000 by default.
- On the Today screen: a ring with the steps and the goal; reaching the goal gives XP once a day and counts toward the streak.
- Reminders several times a day (12:00, 16:00, 20:00 by default, adjustable, never after bedtime): "6,240 of 10,000 steps. 3,760 to go, a walk of about 35 min." If the goal is already reached, the reminder is not sent.
- Limit: for the number in a notification to be fresh while the app is closed, reading in the background is needed (a separate permission for background reading and a small background job). First version: the number is refreshed on every opening of the app and the reminder uses the last known number with the read time; second version: a background refresh before sending. With the bridge from path A also count on its lag.
- In the PWA version (iPhone, laptop) there are no steps; the habit "Steps" with manual entry stays.

Sources for the watch part: [Capawesome: Capacitor Health plugin](https://capawesome.io/blog/announcing-the-capacitor-health-plugin/), [Capgo: Health plugin, getting started](https://capgo.app/docs/plugins/health/getting-started/), [Capgo: Google Fit to Health Connect migration](https://capgo.app/blog/google-fit-to-health-connect-migration-in-capacitor/), [FitMesh: Huawei Health and Health Connect](https://www.fitmesh.fit/en/blog/huawei-health-health-connect-sync) (an unofficial source, it sells its own tool), the existing `docs/SMARTWATCH.md` for Huawei Health Kit.
