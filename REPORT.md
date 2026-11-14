# REPORT — My Day AI

Version 0.1 (formerly "1.0") finished on 2026-11-06, version **0.2** (formerly "1.1") on 2026-11-07, version **0.3** on 2026-11-07, version **0.4** on 2026-11-10 (phases A–G; phase H was not done). All versions are 0.x until the official release; 1.0 is reserved for the first official release. Repository: https://github.com/vukasin-knezevic/my-day-ai · Live app: https://vukasin-knezevic.github.io/my-day-ai/

## Version 0.4.3 (2026-11-14): scrollable bottom navigation, automatic name grammar

- Bottom bar: one horizontal strip with all sections (Today, Study, Workout, Life, Planner, Overview, Achievements, AI), 4 visible at once, smooth CSS swipe with snap and edge fades. Settings is a static button in the right corner, outside the strip. The old "More" screen is gone (`/vise` redirects to Today).
- Name: the app asks only for the name, as the person writes it. Serbian vocative is worked out by rules (`lib/vocative.ts`), every other language, English included, uses the name unchanged (`lib/greetingName.ts`). The separate vocative field is removed everywhere.
- Data: `DATA_VERSION` 5; `migrateData` drops the old `addressName` and never touches the name; old exports still import.
- Tests: 50+ Serbian name table, `greetingName` per language, migration, bottom bar component test, e2e swipe test.

## Version 0.4.2 (2026-11-11): "streak.days" is shown in English

- Bug: when the phone language was English, the intro screen and the streak card showed the raw key "🔥 streak.days" instead of "1 day".
- Cause: the temporary (empty) language that is visible before loading had the code "en", so `setLanguage('en')` thought English was already on and never replaced it with the real one. Ordinary texts were saved by the fallback to English, but plural keys (`.one/.other`) were not, which is why only the streak was broken. Other languages were not affected.
- Fix: `setLanguage` compares the language module itself, not the code. Test: a fresh start in English gives "3 days" / "1 day".

## Version 0.4.1 (2026-11-10): only the checkbox ticks, a smooth start

- A remark after the 0.4 test on a phone: in the morning routine / "Save the day" the whole row reacted to a touch, so a step was ticked by accident while scrolling.
- Now only the checkbox ticks (a 44 px zone around it), the text does not. The same for "Done today" for habits and "Registered/Submitted" on Study. The switches in the Settings stay as before.
- Test: a tap on the step text changes nothing, a tap on the checkbox ticks it.
- **Starting the app:** "Loading…" and the Today screen are no longer visible for a moment before the intro screen. While the app starts, the same dark screen and sun are visible as on the phone's home screen (also in `index.html`, before JavaScript loads). The intro screen is opaque from the first moment.
- **A livelier intro animation (~1.9 s):** the sun jumps, the rays spread and rotate with a glow, the greeting slides in, the streak of days "pops out", then the screen opens into the app (a slight zoom and fade). With `prefers-reduced-motion` there is no animation.

## Update 0.4

Made from `docs/development/TASK_0.4.md` on the branch `update-0.4` (phases A–G, version 0.4.0). **Phase H (Android, watch, steps) was not done**: it waits for the manual steps from `AUDIT_0.4.md`, part 5.2 (see the section "Phase H" below).

### Phase A: the data is safe and the first impression is clean

- **Done:** "New update" is not shown on the first installation (A-01). A failed read of the data gives the screen "The data could not be loaded · Try again" and nothing is written until the read succeeds (A-02). After the intro persistent storage is requested; on an iPhone in Safari the install card comes first; in the Settings there is the date of the last copy and a weekly reminder that can be turned off (A-03). An exam without a registration deadline gets an assumed deadline 7 days earlier, in warnings, notifications and the calendar (A-04). The restart for an update waits for the write to finish (A-37, R-01), with e2e. `progress` and `settings` are checked on import and repaired on load; the error screen has "Delete data and start over", active only when the copy is saved (A-15). Import through "Choose file", export also through "Share file", and a download no longer interrupts Safari (A-14).
- **Not done:** nothing from the phase was skipped.
- **Check on a phone:** iPhone: the install card before the intro and that the data stays after 8+ days; "Share file" offers "Save to Files", and "Choose file" opens that file. Android: no "New update" right after the installation.

### Phase B: behavior bugs

- **Done:** On the Today screen a day is chosen: ‹ ›, a 7-day strip and swiping left/right; the list, the day line, the form and quick entry follow the chosen day, and "Now/Next" and warnings are visible only for today (A-06). Every deletion gives "Deleted · Undo" for 6 s; undoing restores the item to its place and the XP it brought (A-07). "Sure?" goes back after 4 s or a tap on the side (A-08). Our own service worker (`src/sw.ts`, `injectManifest`): tapping a notification opens the app, `tag` prevents duplicates, a small monochrome icon `badge-96.png` and a large icon, the time in the format from the settings, sent notifications are remembered by day and after reopening (A-10, R-08). Quick entry understands Cyrillic and "ч" as an hour (A-11). "bed 23:30" entered the next day goes to the previous night; a sleep entry can be edited and deleted; a forgotten "Got up" older than 24 h does not block a new "Went to bed" (A-12). An end smaller than the start means the next day (22:00–01:00), and for a user who goes to bed after midnight the bedtime is drawn at the end of the day (A-16). An optional time has "Clear time" (A-17).
- **Done differently:** warnings ("Careful") are not shown for other days, because they refer to the present moment. An activity entered after midnight for "today" counts as current until bedtime passes, and on the day line it stands at the end of that day.
- **Check on a phone:** Android: tapping a notification opens the app, the status bar icon is the logo, not a bell. iPhone: "Sure?" goes back on a tap on the side; swiping left/right on the Today screen does not interfere with scrolling.

### Phase C: iPhone, "Back" and the calendar

- **Done:** A fixed bar in the background color, the height of the status bar, stands above the content, so the text no longer passes under the clock and the battery (A-09, R-03). Smart "Back" (A-13, R-05): one function `handleBack()` in `src/lib/back.ts` with a test for each of the 7 steps; the Android button and gesture go through one fallback step in the history (`popstate`), and on an iPhone the same is done by swiping from the left edge and an ← arrow on screens opened from "More". The activity form asks "Discard changes?" if something was typed; on the Today screen "Back" from another day returns to today. "Add to calendar" is now also on the Study screen (next to the obligations) and on the Today screen, with a sentence saying that the copy is one-time (R-02). All-day events remind at 09:00 that day and at 09:00 the day before, not at midnight (A-24).
- **Done differently:** on an iPhone the main button opens the calendar file directly (so that Safari offers "Add all"), and next to it stays "Not working? Share file", because direct opening cannot be checked without a real phone. The question "Discard changes?" is for now in the activity form only; the slot and obligation panels get it in phase D.
- **Not done:** the explanation of the calendar button in the tutorial comes with the tutorial (phase E).
- **Check on a phone:** iPhone: the bar under the clock upright and on its side; "Add to calendar" opens the "Add all" screen (if not, does "Share file" work); swiping from the left edge. Android: the Back button and gesture through all 7 steps; "Leave" really closes the installed app.

### Phase D: study, workout, address form

- **Done:** The forms for a slot and an obligation open behind a button in a bottom panel, and saved slots are clear rows with ✎ and ✕ (R-01). Points are shown as "0 / 100" (R-09). A course without obligations offers adding midterms and exams instead of the message "cannot reach 51" (R-11). The field "How should I address you" in the Settings starts with a vocative suggestion (R-10). Workout is one thing (R-06, A-05): a new workout requires a day and a time, appears on the Today screen and has a reminder; the exercises are a log tied to the scheduled workout (`Workout.activityId`), "Done" from any screen gives XP once (`src/lib/workoutFlow.ts`), and the counter "This week", the streak, the planner and the Overview read the same source (`doneWorkouts`). The duration is an estimate from the number of sets or the real duration, the feeling is optional and asked afterwards. Ready splits: "Use this plan" opens a panel "When do you work out?" with a warning about overlapping a slot at the faculty, the plan repeats the workouts every week, and has "✓ Active", "Change time" and "Stop plan" (`until` on the series). Exercise name suggestions come from our own panel (A-36). Deleting a workout record returns the workout to "planned", and "Undo" restores that too.
- **Not done:** nothing from the phase was skipped.
- **Check on a phone:** iPhone and Android: the "When do you work out?" panel and the exercise fields with the keyboard; the reminder for a scheduled workout.

### Phase E: tutorial and morning routine

- **Done:** An interactive tutorial (R-04): after the intro questions it says "Before you start, let us walk you through the app" [Start] [Skip]; the tour of 9 steps goes through the real screens (Today, adding an obligation, ticking with XP, Study with a trial course and the "Add to calendar" button, Workout, Life and habits, the morning routine, AI, Settings), a highlighted part of the screen + a card above the navigation, progress dots and "Skip" always visible. "Next" waits for the user to really do the step (or tap "Mark it for me"). The trial obligation and the trial course are deleted at the end together with the XP (`src/lib/tour.ts`). Again: Settings → "How the app works". Someone who finished the intro before 0.4 does not get it by itself (`tutorialDone` is set to true on load). The first screen of the intro says in one sentence what the app is for.
- The morning routine (R-07): in the Settings turning it on, the wake-up goal and 3–5 steps (by default bed, stretching, water, washing up), a "Morning routine" card at the top of the Today screen until 11 h with ticking, an animation, 2 XP per step, +10 when done and +5 if done within an hour after the goal, its own streak 🔥. After 11 h the card becomes "Save the day" with two steps and the sentence "It is not too late, start with one small step" (no judgment, no gender). Undoing a step restores the XP and the bonuses. A morning notification at the goal time with the main thing of the day and a "Done ✓" button (`actions` + `notificationclick`; the next step comes out as a new notification; if the app is closed, it opens with the action in the address).
- **Done differently:** "a bonus if it is done by the set time" was interpreted as "within an hour after the wake-up goal" (the goal is the wake-up time, not the end of the routine). Short tips on empty screens were not added apart from the existing messages; the rest is in the tutorial.
- **Check on a phone:** Android: the "Done ✓" button in the notification when the app is closed, and that the next step arrives. iPhone: there are no buttons in the notification (iOS does not show them for web apps), the card in the app works the same. Tutorial: the card does not cover an important button on a small screen.

### Phase F: addictive, yet healthy app

- **Done:** An entry animation of ~1 s on every opening (the logo → "Hello, Vukašine" → "🔥 12 days"), a tap skips it, with "reduced motion" only a cross-fade; it goes over the already loaded content, does not slow down the first screen. The main streak with a "saver" (`src/lib/streak.ts`): a day counts if at least one thing is done (an activity, a habit, a workout, a routine step, a closed day, the challenge); every 7 days one saver, at most 2; a missed day spends a saver, on the next opening "❄️ A saver kept your 12-day streak"; without a saver the streak starts from 1, with "Longest streak". The daily challenge (`challenge.ts`): one challenge from the data (an exam registration, a study block before 14 h, a habit goal, go to bed by a time, a walk), determined by the date, +15 XP, "Give me another" once; it is recognized by itself where it can be, otherwise "Challenge completed". Surprises (`surprise.ts`): about every fourth event, at most 2 a day, bonus XP 5–20, reward minutes 5–15 or a badge; the outcome depends only on the event id, so undo-then-repeat gives the same surprise (not a new attempt), and undoing the event also restores the bonus. The week ring and the streak on the Today screen; the page "Achievements" (More) with badges (the first week, a streak of 7/30/100, the first personal record, all registrations on time, 50 h of study) and personal records, all calculated from the data. Confetti (canvas, no library) for a new level and a closed day, sound (Web Audio) and vibration; Settings: Sound (off by default), Vibration, Animations. "Close the day": a card from 2 h before bedtime (or a button any time), 3 steps (a review and "Move to tomorrow"/"Skip", a mood 1–5 + a note, the main thing for tomorrow), +10 XP once, a bedtime suggestion; the main thing stands at the top of the Today screen and in the morning notification.
- **Done differently:** the XP that "flies" to the counter was not made: the reward is seen as a message at the top, with the ticking animation and confetti; "10,000 steps" waits for phase H. Vibration is not checked on an iPhone (there is none). The entry animation is skipped in an automated browser (`navigator.webdriver`) and in tests, so that it does not disturb the e2e check; its look and duration should be checked on a phone.
- **Check on a phone:** Android: vibration and sound (turn on in the Settings), confetti on a new level, the entry animation on a cold start; iPhone: the entry animation must not flicker before the first screen, "Close the day" in the evening with the keyboard.

### Phase G: quality, look, texts, README

- **Done:** _Accessibility and touch:_ a focus trap in the bottom panels and `inert` on the page behind them, the shortcuts are already off under an open panel (A-18); a visible focus on the date field (A-19); the checkboxes are not squeezed (`shrink-0`, A-20); touch targets of at least 44 px for "Going / Not going / Sometimes", the XP button and the rows with a checkbox (A-21). _Look:_ an obligation row on the Today screen is two tidy rows (the time and the name, then the main button) and a "⋯" that opens a bottom panel (edit, skip, only today, delete) (A-22); from 1024 px Today has two columns (A-32); the reward is spent in any number of minutes up to the balance (A-28); habits: the step follows the goal and the unit, a habit can be edited, and the screen follows midnight (`useToday`) (A-29); expenses: a date is chosen and everything can be seen (A-30). _Speed (A-23):_ the initial download used to be ~660 kB (201 kB gzip) in one file; now only the main code (38 kB gzip), `react` and the router (68 kB gzip) and the language that the user uses (16–19 kB gzip) are loaded, so about **124 kB gzip** (the goal of 120 kB was missed by about 4 kB). The other languages, `zod`, Planner, AI, Settings, Study, the intro and the tutorial load only when needed; the list of languages is in `src/i18n/languageList.ts` (a test checks that it matches the files). _Texts:_ removed "(between 8 and 10)" and "(between 00 and 02)", the level "Engineer" → "Graduate", "Browser notifications" → "Notifications", "New midterm / exam / homework / lab" → "New obligation", "Add something above", feminine forms (Welcome, you are not registered, so that you save), AI import no longer asks for `domaci|lab` but also accepts the name of another type, which becomes a user-defined type (A-26); the AI overview shows the date and time in the app's format (A-27); the Overview separates done from planned and counts done workouts from the same source as XP (A-25). _Install and link:_ the manifest has `id`, `scope`, shortcuts and categories, a separate "maskable" icon in the safe zone, `meta description` and Open Graph with the image `og-image.png`, splash screens for the iPhone 16 and 16 Pro Max (A-31). _Tests and CI:_ `persist` has the same version number as the data (4) and a test that old records (versions 1 and 3) still work (A-33); `updates.ts` has 90% coverage; a short pass through all screens in Firefox, on a tablet (820 px) and at 1920 px (A-34); publishing to GitHub Pages happens only when CI for the same commit passes (`workflow_run`, A-35). _Personal data:_ in `docs/development/MY_DAY_AI_TASK.md` and `PLAN.md` generalized (the faculty, the wake-up and bedtime, workout, games, the smartwatch); the git history was not touched; local notes in the root are in `.gitignore` (A-38). README (Serbian and English): "User testing", version 0.4, new features and new screenshots. `package.json` is 0.4.0, `release-bump` knows about all the places that mention the version.
- **Not done / different:** the initial bundle is ~124 kB gzip instead of the requested 120 (react-dom and the router take 68 kB; a further reduction requires replacing a library). The manifest has no `screenshots`: the existing images are whole pages (390 × 1877 px), and the manifest asks for screen images of a real aspect ratio. The last level used to be "Engineer"; whoever had that level now sees "Graduate" (the same level, another name). The `i18n-checker` agent was not run: keys, `{parameters}` and untranslated English texts are checked by tests, but text hardcoded in components was not reviewed by hand. Andrea Jovović's name in the README stands as the task requires ("with her permission"): check before publishing that the permission was really given. In `README.md` the model that 0.4 was made with is left as `[author fills in]`.
- **Check on a phone:** Android: that the "⋯" targets and buttons are large enough; that the entry animation does not flicker. iPhone: the installed app after a language that is not the phone's (the language is loaded before the first screen); `inert` panel and Tab do not exist on a phone, but a screen reader (VoiceOver) must not read the page behind an open panel.

### Phase H (Android, watch, steps): not done

`adb` is not installed on this computer (Android Studio and a connected phone are not available), and the task says to skip phase H when the manual steps from `AUDIT_0.4.md`, part 5.2, are not done. **Missing:** the Capacitor project and `android/`, `src/lib/health/` and Health Connect, "Connect a watch", sleep from the watch, steps (a ring, reminders, the 10,000 steps challenge), `@capacitor/local-notifications` (an alarm, a persistent notification), the guide `ANDROID.md`. What is needed from Vukašin: the phone model and the Android version, Android Studio, USB debugging, Health Connect and a bridge for Huawei Health (part 5.2 of the audit). PR 2 is made after that.

## Checks on a real device (from `AUDIT_0.4.md`, part 4)

**Andrea (iPhone):**

- the status bar does not cover the content, upright and on its side (A-09);
- "Sure?" goes back after 4 s or a tap on the side (A-08);
- "Add to calendar" opens "Add all"; if not, does "Share file" work (R-02);
- the data stays after 8+ days (A-03), the install card before the intro;
- the tutorial: the card does not cover important buttons, the trial things are deleted at the end;
- swiping from the left edge for "Back" (A-13);
- the entry animation on opening and "Close the day" in the evening.

**Vukašin (Android):**

- "New update" does not appear on the first installation (A-01);
- tapping a notification opens the app, the icon is the logo (A-10), the "Done ✓" button in the morning notification and that the next step arrives;
- the "Back" button and gesture through all 7 steps, "Leave" closes the app (A-13);
- vibration and sound (turn on in the Settings), confetti on a new level.

## Version 0.3.1 (2026-11-07): a fix of the bottom panel

- **The panel follows the finger:** dragging down on the handle, the title or the top of the list (when scrolled to the top) moves the panel exactly as much as the finger (`translateY`, no animation during the drag, `touch-action: none` on the grab zone, pointer events).
- **Release:** more than ~30% of the height or a fast downward movement closes it smoothly; otherwise the panel goes back up (220 ms, ease-out). Opening is also 220 ms. `prefers-reduced-motion` turns off the animation.
- **The background stays still:** page scrolling is locked while the panel is open, `overscroll-behavior: contain` on the panel and the list. Scrolling a long list works normally.
- A tap on the background and Esc still close it. Tests: component (`Sheet.test.tsx`: threshold, speed, locked scroll) and e2e on the iPhone profile (WebKit, dragging with a mouse; a real touch on a phone is not replaced by this).

## What is new in version 0.2 (formerly 1.1)

**Fixes**

- **Keyboard everywhere:** `Enter` = Next / Save / Confirm, `Esc` = Back / Cancel / close (onboarding, forms, dialogs). In a multi-line field Enter makes a new line (confirm is `Ctrl+Enter`). After a step changes the focus goes to the first field, so the whole setup can be done without a mouse.
- **Number fields:** one shared component `NumberInput`; the field may be empty, there are no leading zeros (`03`), decimals work where needed (a dot or a comma), min/max apply while typing and on leaving the field.
- **Editing an activity, repeating activities** (every day / on weekdays / weekly) in the form, and **your own workout templates**.

**General version**

- "PS5 time" was replaced by **a reward that the user names** (by default "Fun time" 🎮, in Serbian "Vreme za zabavu"); the ratio of minutes per hour of study is adjustable.
- **Data migration:** old saved data and old JSON exports are automatically moved to the new shape (`migrateData`, covered by tests).
- No personal details in the demo data, the prompt and the README; the currency is adjustable (by language by default).
- **Onboarding:** new steps "Language", "Reward" and "AI mode" (manual is free, or the API, which is paid by use, with a warning about the key).

**More languages**

- i18n: Serbian (Latin), English, Serbian (Cyrillic). A new language is one new file in `src/i18n/locales/` (3 steps in the README). A test fails if a language is missing a key or a `{parameter}`.
- Dates, names of days and months, numbers, the AI prompt and the answers follow the language; quick entry understands Serbian and English.
- Playwright checks English and Cyrillic on all screens (no horizontal scroll, no axe violations) and makes the screenshots.

**The README** was rewritten as a product description (live demo, a CI badge, languages, how to add a language).

## How to run it

- `npm run dev` → **http://localhost:5173**
- A phone on the same Wi-Fi network: **http://192.168.1.15:5173** (or http://192.168.1.16:5173 over a cable). If it does not open, Windows Firewall is probably blocking Node.js: allow it for "Private networks".
- Installing on a phone (PWA) requires HTTPS or localhost, so it works only once published to GitHub Pages (https://vukasin-knezevic.github.io/my-day-ai/). On a plain `http://192.168…` the app works, but "Add to home screen" and offline mode do not.

## State of the checks (last run)

| Check               | Result                                                                                                                                                                                                        |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run lint`      | passes, 0 errors                                                                                                                                                                                              |
| `npm run typecheck` | passes (TypeScript strict)                                                                                                                                                                                    |
| `npm test`          | **2099 unit/component tests pass** (parser, planner, AI layer, routine, streak, challenge, tutorial, migration, translations…)                                                                                |
| `src/lib/` coverage | **~95% of lines** (goal 90%)                                                                                                                                                                                  |
| Playwright e2e      | **36 tests pass** (Chromium, the iPhone profile, Firefox, a tablet, 1920 px), including the axe accessibility check for 9 screens × light/dark theme, onboarding with the keyboard only, English and Cyrillic |
| `npm run build`     | no warnings                                                                                                                                                                                                   |

## What was done in version 0.1 (formerly 1.0, phases 0–12)

All the phases from the task were implemented and pushed (each in its own commit, see `git log` and `docs/development/PLAN.md`): 0. Setup (Node and Git installed through winget, the repo connected), 1. the data model + onboarding, 2. the Today screen + the parser, 3. Study, 4. the planner, 5. workout and nutrition, 6. sleep/money/habits + research on smartwatch data, 7. XP/levels/streaks/PS5, 8 and 8b. AI (API + manual mode), 9. reminders, .ics and overviews, 10. export/import, accessibility, shortcuts, e2e, screenshots, 11. README (sr/en), architecture, MIT, CI and Pages workflows, 12. this report and `LEARNING.md`.

## Fixes in version 0.2 (night fixes and a code review)

- **A workout template can be renamed** (the name from the Type field).
- **"Only today" for repeating activities:** removes one day, the series stays; it also applies to `.ics`.
- **A planner bug fixed:** shortening a workout before an exam changed the whole repeating series, now it changes only that day.
- **CI:** e2e test 10 failed once on GitHub (`05e58ff`), the next commit passed, and locally it passes 20/20. The probable cause (a race between deleting and reloading) was not reproduced; the test now waits for the deletion to be written.
- **The AI client:** the token limit was raised (16000, chat 4000) because the model's thinking counts in `max_tokens`; a cut-off answer, a timeout (3 min) and an overload (529) now have their own message.
- **Checked against the real API, without a key:** a preflight with our headers returns `access-control-allow-origin: *`, and a request with a fake key an ordinary 401, so calls from the browser are not blocked. The model's answer itself is still not tried.
- **Planner:** no longer suggests slots that have already passed today and does not overlap pending AI suggestions.
- **AI results:** activities that end before they start and non-existent dates are rejected; the model now knows what time it is; importing the same schedule again does not duplicate midterms.
- **Quick entry understands repeating:** "workout every day at 18", "study on weekdays 10-12", "every Monday", "every monday".

## Update 0.3

### Phase A — Bugs (done)

1. **Notifications on Android:** reminders are shown through the service worker (`registration.showNotification`); `new Notification` is only a fallback for a laptop. The error is no longer swallowed: in the settings there is a button **"Send a test notification"** that reports whether it was shown.
2. **XP is subtracted:** `revoke` in `src/lib/xp.ts` removes XP, reward minutes, the id and the event (the event now also remembers `rewardMin`). It is called when a habit drops below the goal, when an activity is returned from "done" (a new "Undo" button on the Today screen), when a midterm registration is unticked, and when deleting a workout, habit, activity or obligation. Note: events created before this version do not remember reward minutes, so only XP is removed for them.
3. **The reward does not go negative:** "Used 30/60 min" is inactive when there are not enough minutes; after a click **"Undo"** stands for 6 seconds. `balance = earned − spent`, never below 0. Old data with a negative balance (e.g. −900) is repaired on load (spent is lowered to earned).
4. **Slots:** ✕ next to every slot (with "Undo") and protection against duplicates (the same course + type + day + time; a double click on "+ Slot" adds one and reports a message).
5. **"Delete demo data"** now also removes the XP/reward minutes of the demo items.

Check after every item: `npm run lint`, `npm run typecheck`, `npm test` (green).

### Phase B — Look and a "smooth" feel (done)

6. **Colors and the splash screen:** `theme_color` and `background_color` in the manifest and `<meta name="theme-color">` are the dark background color of the app (`#020617`); the meta changes with the theme (the light theme `#f8fafc`). The icons are new: a blue logo (a sunrise) on a dark background; `scripts/make-icons.mjs` makes them from `public/icon.svg`.
7. **Our own menus:** `Select` opens a bottom panel (`Sheet`) with an animation instead of the system menu. Fields have `autocomplete="off"`.
8. **Time picker:** wheels of hours : minutes; 24h by default, 12h (AM/PM) in the settings. The saved value is always `HH:mm`; the display on the Today screen, in the planner and in slots follows the chosen format.
9. **Date:** the Android picker stays (an invisible field over the text), the display is always DD.MM.YYYY.
10. **Duration:** one function `formatDuration`/`formatHours` ("2 h 36 min", "7 min", "2 h").
11. **The Today screen:** Now (large, blue) and Next (smaller, with a countdown) → Obligations → a highlighted quick entry → the timeline → level/XP/reward. Subtitle: "Vukašine, today: …".
12. **Required/optional fields:** `Field` has `required` (a discreet asterisk), `optional` ("(optional)") and `error` (a red border and a message only after an attempt). The marks are CSS, so the field name stays clean for screen readers and tests. Buttons that used to stay silent (an empty quick entry, questions to AI, forms) now report an error.
13. **Long press:** `user-select: none` on fixed texts; the user's text (`.user-text`) and fields can be copied.
14. **Animations:** transitions between screens, panels, messages; `prefers-reduced-motion` turns them off (e2e tests run with reduced motion on).

### Phase C — Study (done)

15. **Kinds of obligations and slots:** only Exam and Midterm (obligations) and lecture and exercises (slots) are built in. The rest the user adds and names (`settings.customAssessmentKinds` / `customSlotKinds`); `src/lib/kinds.ts` holds the rules. The tab is called "Exam/Midterm". **Migration:** the old "domaci" and "lab" become user-defined kinds with a name in the language of the saved settings ("Homework", "Lab"…); running it twice changes nothing (a test in `dataIO.test.ts`). Obligations that are not an exam/midterm do not require registration and behave like the earlier homework (a warning the day before, "submitted").
16. **The name is made by the app** for an exam and a midterm: "Midterm 1 · Mathematics 1", "Exam · Physics 1" (a midterm is always numbered, an exam only from the second one). The field "Name" exists only for user-defined kinds and is required there.
17. **"Study hours" is not in the form.** The planner estimates the hours from the kind (exam > midterm), the difficulty (1–5) and ECTS (`estimateStudyHours`); whoever wants can change them in the obligation's details ("Study hours", optional, empty = automatic). Already saved hours stay as set by hand.
18. **Going / Not going / Sometimes** stands right next to every slot in the course card; there is no card at the top. A new slot starts as "Going" (old slots without an answer stay without a choice until clicked). The weekly question for "Sometimes" stayed.
19. **The planner always answers** ("Everything is already planned ✅" or "Study for Mathematics 1 starts on Mon 16.11. (midterm 23.11.)") and has the choice "This week / Next week" (on weekends next week is the default). Old suggestions are replaced only for planned days.

### Phase D — Language and address form (done, except item 21 which is at the end)

20. The language option is "Automatic (phone language)".
21. **Vocative** (`src/lib/vocative.ts`, Latin and Cyrillic, with tests): Vukašin→Vukašine, Petar→Petre, Milica→Milice, Marko→Marko, Ana→Ana… The intro asks **"How should I address you?"** and pre-fills a suggestion; until the user corrects it by hand, the suggestion follows the name. The Today screen: "Vukašine, today: …".
22. **Gender** (Serbian): a choice in the intro and the settings; texts that depend on gender (Legao/Legla, Ustao/Ustala, Iskoristio/Iskoristila, "Da li si prijavio/prijavila?", "Spavala si samo…") have feminine forms in the `feminine` part of `sr-Latn.ts` (Cyrillic is derived by itself). Other languages change neither the name nor the gender.
23. Demo examples are general: "Course 1 (example)", "Course 2 (example)", "Midterm 1 · Course 1 (example)".
24. **New languages (French, Spanish, German, Russian):** see below, the section "New languages".

### Phase E — Update, calendar, XP history, README (done)

25. **Automatic update:** `registerType: 'prompt'`; the new version is downloaded in the background, at the top stands **"New update"** with a 0–100% bar and at the end the button **"Restart the app"**. Honestly: the browser does not report the real downloaded bytes, so the bar up to 90% _estimates_ the progress, and shows 100% only when the new version is really ready. The setting (intro and settings): on = when the user leaves the app, the ready version turns on by itself; off = only when the user presses the button. It cannot be checked on a real device from this environment: try on a phone after the next publishing.
26. **"Add to calendar"** (the word ".ics" is not shown); a discreet progress bar in the app; the file goes through Web Share (`text/calendar`), and without support an ordinary download. Closing the share panel is not an error and downloads nothing.
27. **XP history:** a click on the XP number opens a list (what, how much, the date and the hour); events now remember the time, old ones show only the date.
28. **README:** the steps for the Anthropic API key (console.anthropic.com → API Keys) and the version scheme (0.x until the official 1.0). `package.json` is 0.3.0, the version is visible at the bottom of the settings.

### Phase F — iPhone (iOS) support (done)

The goal: colleagues with an iPhone can test for free (Safari → Share → "Add to home screen"), without the App Store. 29. **`index.html`:** `apple-touch-icon` (180×180, a blue logo on a dark background), `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style` = `black` (no blue bars), `apple-mobile-web-app-title` = "My Day AI". 30. **Splash screen:** `apple-touch-startup-image` for the 9 most common iPhone sizes (a blue logo on a dark-blue background, `public/splash/`); `scripts/make-icons.mjs` makes them. 31. **Notch and bottom bar:** `viewport-fit=cover` + `env(safe-area-inset-*)` on the page body, the bottom navigation, the content and the messages. 32. **Installation guide:** in Safari (iOS, not installed) a card "Add to home screen: Share ⬆️ → Add to home screen"; it closes and is not shown again (`settings.iosHintDismissed`). 33. **Notifications on iOS:** if the app is not on the home screen, the settings clearly say that it should be (iOS 16.4+), instead of a button that does not work; the same for browsers without notifications. 34. **Check:** `e2e/iphone.spec.ts` (Playwright WebKit, the iPhone 14 profile): the intro and the Today screen, the install card, all 8 main screens without errors and without horizontal scroll, a bottom panel and the time picker, the notifications message. CI also installs `webkit`.

- **I checked:** the above in WebKit; unit tests for recognizing an iPhone/iPad.
- **Must be on a real iPhone:** a real "Add to home screen" and the look of the icon; whether the splash screen is shown (iOS sometimes skips it if the size does not match exactly); the status bar and the notch/bottom bar (WebKit in Playwright does not have them); notifications after installation (permission, actual display); Web Share with the calendar; the behavior of the date and time pickers with a real finger; automatic updating (the service worker behaves differently on iOS).

### New languages (item 21): French, Spanish, German, Russian

`src/i18n/locales/fr.ts`, `es.ts`, `de.ts`, `ru.ts` — the same system as the other languages, without code changes: the language appears in the choice by itself, and dates, names of days and months follow the chosen language. TypeScript (`fromEnglish`) requires a translation of every text, and the tests check that no key is missing, that the `{parameters}` are the same and that a translation is not copied English. Russian has three plural forms. Checked with an e2e test (Chromium, a 390 px phone): no horizontal scroll and no axe errors on all 8 screens, in all 6 languages.

- **Honestly:** the translations were written by machine (like the English) and were not reviewed by a native speaker. The instructions for AI (`prompt.*`) and the JSON schemas (`schema.*`) stay in English on purpose (the model understands them in every language, and the JSON keys must not change); the rule "answer in the language …" is translated.
- Quick entry understands only Serbian and English, so the examples in the field (`workout 18-19:30 · coffee 200`) are in English in these languages too.
- Vocative and gender apply only to Serbian; in the other languages the name and gender do not change (the fields are not shown).
- Because of the order of work, these languages were done after phases E and F, so that they would immediately have all the keys.

## What was NOT done or is not complete (honestly)

1. **A real model answer was not tested** because I have no API key. The network, CORS and the rejection of a bad key were checked against the real API (see the fixes above), but a real answer with a key never arrived. On the first real call check that it works.
2. **The header for calls from the browser** (`anthropic-dangerous-direct-browser-access: true`) works: the real API accepts it in the preflight. If a block still happens, the app reports "offline / blocked" and offers the manual mode.
3. **Model names and prices** (`claude-haiku-5-5` $0.10/$0.50, `claude-sonnet-5-5` $2/$10 per million tokens) and the version `2026-10-21` were confirmed in Anthropic's API reference (cache of 6 Oct 2026). Haiku above 100K tokens in one request costs $0.50/$2.50, which the estimate does not count; such large requests are not expected here. For other models there is no dollar estimate. The estimate counts all tokens at the price of the stronger model (an upper bound).
4. **Smartwatch data:** there is no file import because I could not confirm the export format nor that Health Kit works without a server (see `docs/SMARTWATCH.md`). Sleep is entered by hand.
5. **GitHub Actions:** `ci.yml` and `deploy.yml` were checked through the GitHub API. Both work; one occasional e2e test failure is described in the fixes.
6. **Notifications were not tried on a phone.** The logic (`dueReminders`) is tested, but the display of notifications depends on the browser. The `.ics` export is more reliable.
7. **Feature limits:**
   - Editing a repeating activity through the form changes the whole series; "only this day" exists for removing and for shortening before an exam.
   - Workout templates: your own are saved by name (the same name overwrites it); there is no reordering.
   - The week summary is not generated by itself: on Sunday evening on the Today screen there is a link to the AI page.
   - The planner is rule-driven, not an optimizer; the daily study limit is hard (the surplus moves to the next day or is reported with a message).
   - Quick entry understands only simple sentences in Serbian and English (see `quickParse.test.ts` and `i18n.test.ts`); more complex ones go through AI. The other languages have an interface translation, but the parser understands only Serbian and English.
   - **Translations:** the English translation was written by hand and was not reviewed by a native speaker; Cyrillic is derived automatically from Latin (short English words and marks like "XP" and "AI" stay in Latin). Old saved data (e.g. the name of a workout plan or the title of a demo activity) stays in the language in which it was created, because it is the user's data, not interface text.
   - The grading scale (51–100 → 6–10) is Serbian and stays the same in the English version; ESPB is shown as ECTS.
8. **Accessibility:** axe (an automatic check) finds no WCAG A/AA errors, but it is not a replacement for manual testing with a screen reader.
9. **The project path** is `C:\Projects\my-ai-app`, not `C:\Projekti\my-day-ai` (Claude Code was already running there).
10. The package versions are the latest at the moment of installation (except React 18, as the task requires). `npm audit --omit=dev` finds nothing; 15 warnings (2 low, 13 moderate) are only in development tools (the eslint chain), they do not enter the published app. `npm audit fix` does not solve them, and I did not use `--force`.

## Known problems

- The first `git push` asked for a sign-in; after that it works by itself.
- When a piece of data is from the period before the first use of the app (e.g. last night's hour of sleep), the 7-day average does not see it until you enter it.
- If IndexedDB is not available (a private window), the app works, but the data is not remembered (the warning is in the console).

## 5 ideas for version 2

1. **Sync between devices** (e.g. an encrypted backup in your own cloud or Supabase/Firebase) so that a phone and a laptop share the data.
2. **Google Calendar integration**: two-way sync instead of the one-time `.ics` export.
3. **Importing sleep from a smartwatch**: request a real data export (e.g. from Huawei Health) and build the import; later Health Kit through a small server (OAuth).
4. **A server for push notifications** (Web Push + a serverless function) so that reminders arrive even when the app is closed, and an automatic weekly summary.
5. **A smarter planner**: repeating activities in the form, manually dragging blocks on the day line, learning from habits (when you really study, how long it really takes) and a "what if" simulation before an exam.

## Code review before the portfolio (7 Nov 2026)

The branch `pregled-koda`. The fixes are ordered by importance, each is in its own commit and has tests with it.

- **The planner was silently losing study hours.** A daily share smaller than 30 min was deleted without a warning, so a midterm of difficulty 5 with 4 h got 0 h of plan. Now the total time is split so that the sum always matches the requested one, and the rest moves to the next day. An exam after the planned days no longer gives a false warning.
- **Re-planning duplicated study.** After accepting a plan a second click added another 8 h for the same midterm. Blocks now remember the exam (`assessmentId`), so only what is not covered is planned; a skipped or unmarked block from the past does not count as studied. The weekly workout goal now also counts the days before today (on Thursday with 3/3 another 2 were suggested), and the planner does not offer shortening an already finished workout.
- **Extracting the AI answer.** A single `{"a":1}` in the text after a valid plan broke the whole answer, because the last object always won. Now a code block has priority and the object that really passes the schema is chosen. `reps` given as a number are also accepted, and the same midterm listed twice in one import is added once.
- **The AI layer.** Chat sends real `messages` roles instead of text with a history and uses the faster model, as planned for the costs. The tone is no longer permanently "strict" because of skipping from several months ago. Token usage is written in the store itself, so it is not lost when two calls go at the same time. The dead `opts.manual`, the empty `setPasted` and an unnecessary re-export were removed.
- **Sleep and calendar.** "bed 23:30" typed after midnight was written to the following night, so the sleep came out negative and silently disappeared from the average; now it goes to the previous night. `.ics` cut lines by characters (up to 103 octets, the RFC allows 75), and Cyrillic, our letters and emoji easily exceeded that; now it cuts by octets.
- **Data protection.** Deleting a course now also deletes its midterms (the planner still counted them, and the pages showed them without a course). A course and a whole repeating series are deleted only on the second click. A second load of demo data no longer duplicates it. An empty workout is not saved (every click gave 30 XP), and a class slot cannot end before it starts.
- **Resilience to a crash.** A backup with a damaged item (e.g. an activity without a time) passed the check and then crashed the Today screen; now every item is checked before import, and the message says which one is bad. An `ErrorBoundary` was added: instead of a white page the user sees a message, can load the app again and download a backup.
- **`planWeek` broken into steps.** A function of over 200 lines now has 11 and reads like a recipe (a lighter day, shortening before an exam, workouts, study, rewards); the "magic" numbers got names. The exam type check was copied in 8 places and is now one `isExam`. Besides: the notes show a readable date instead of the ISO form, two workouts on the same evening give one note, and a duplicate calculation for sleep hours and unused code were removed.
- **Planner tests.** `Planner.test.tsx` depended on the day of the week, and its assertions stood behind an `if`, so sometimes it checked nothing; now it has a fixed date and six real scenarios. `planner.invariants.test.ts` was added: 300 repeatable random weeks check the rules that must always hold (no overlap, within waking hours, limits, before exams). It immediately found a real bug: the lighter day allowed 60 min even when the daily limit was smaller.
- **CI and publishing.** Publishing no longer goes to the live site if lint or tests fail. CI now also checks the format and `build` (until now the build ran only at publishing). All 14 files that deviated were formatted, the version in `package.json` was aligned with 1.1.0, and a stray BOM character was removed from `defaults.ts`.
- **A tidy repo root.** Tasks, plans, the journal and the learning notes were moved to `docs/development/`, so the root shows the README, the license and the report. Nothing was deleted. The architecture was extended with the new planner behavior. Note: `docs/development/MY_DAY_AI_TASK.md` still contains personal details, and they also stay in the git history.
- **Duplication and coverage.** The same card code was copied on three pages and is now one `Tabs` component. New tests cover reminders (`useReminders`), saving data when IndexedDB fails (`storage`) and the path from a sentence to saved data (`apply`), including the whole "bed / up" flow.
