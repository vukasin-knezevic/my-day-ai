# My Day AI — task for update 0.4

> Made on 10 Nov 2026 from the QA audit (`docs/development/AUDIT_0.4.md`, labels **A-xx**), the remarks after the 0.3 test on a phone (Vukašin, Android) and the remarks of the tester Andrea Jovović (iPhone), labels **R-xx**.
> Each item says the file and line in the audit; here is what should come out of it.

## How to work (rules)

1. First `git checkout main && git pull`, then the branch `update-0.4` from a fresh `main`.
2. Work **in order by phases** (A is the most important). Every item = a separate commit with a test where it makes sense.
3. After every item: `npm run lint`, `npm run typecheck`, `npm test`, `npm run format:check`, then commit and push. After a code change also `graphify . --code-only`.
4. Every new text goes into **all 7 languages** (`src/i18n/locales/`), with the feminine form for Serbian where it depends on gender. At the end of the phase run the `i18n-checker` agent.
5. New data: add the fields to `src/types.ts`, the default values and the migration to `src/lib/defaults.ts` (`DATA_VERSION` goes to 4, see A-33), with a test that old data and an old export still work.
6. At the end of every phase write briefly into `REPORT.md` (the section "Update 0.4"): what was done, what was not and what must be checked on a real phone.
7. **Two pull requests:** PR 1 = phases A–G (version `0.4.0`). PR 2 = phase H (Android), only when the manual steps from audit 5.2 are done; if Android Studio is not installed, skip phase H and write that at the top of the report.
8. A rule for every PR: the title and description in **English**, in the style of PR #2 (a short intro, then groups **Fixes / UX / …**), the last sentence "Implemented with Claude Code from a task file I wrote; PR opened and merged automatically via gh." Then `gh pr merge --auto --merge`.
9. Ask nothing, work until you finish. If something cannot be done as written, do the closest good variant and write down why in `REPORT.md`.

## What is NOT done in 0.4

Google sign-in and sync between devices, the Google Calendar API, importing a schedule from an image, an App Store version, publishing on Google Play. They stay for later versions.

---

## Phase A — The data is safe and the first impression is clean

1. **A-01** "New update" is not shown on the first install. A component test and e2e.
2. **A-02** A failed read of the saved data shows the screen "The data could not be loaded · Try again" and writes nothing. A test with a database that throws an error.
3. **A-03** After the intro `navigator.storage.persist()`. On an iPhone in Safari: an install card **before** the intro, with a sentence saying that the data from Safari is not carried over to the installed app. In the Settings the date of the last backup and a gentle reminder once a week (it can be turned off).
4. **A-04** A midterm or an exam without a registration deadline gets a default deadline (7 days before the date) and the warning "Unregistered … deadline not entered, check the faculty's site"; the same in notifications and the calendar.
5. **A-37 + R-01 (check)** The write finishes before the restart for an update. E2E: add a course, a slot, an obligation and points, reload, everything is there; the same after "change then restart right away".
6. **A-15** A check of `progress` and `settings` on import and load; on the error screen a button "Delete data and start over" (active after downloading a copy).
7. **A-14** Import through "Choose file", export also through file sharing; a download without interruption in Safari.

## Phase B — Behavior bugs

8. **A-06** A day picker on the Today screen: ‹ yesterday · today · tomorrow ›, a 7-day strip, swiping left/right. Everything on the screen follows the chosen day; "Now/Next" only for today.
9. **A-07** One shared "Deleted · Undo" (6 s) for all deletions; undoing also restores the XP.
10. **A-08** "Sure?" goes back by itself after 4 s or a tap on the side.
11. **A-10 + R-08** Our own service worker (`injectManifest`): tapping a notification opens the app, a `tag` against duplicates, a small monochrome icon (the logo) and a large icon, the time in the format from the settings, sent notifications are remembered by day.
12. **A-11** Quick entry understands Cyrillic (and "ч" as an hour). Tests for all the examples from the field in both scripts.
13. **A-12** "bed 23:30" entered the next day goes to the previous night. A sleep entry can be edited and deleted; a forgotten "Got up" does not block a new "Went to bed".
14. **A-16** Activities after midnight: an end smaller than the start means the next day (22:00–01:00); the day line and "Now/Next" show them in the right place.
15. **A-17** An optional time has "Clear time" in the picker.

## Phase C — iPhone, "Back" and the calendar

16. **A-09 / R-03** Content never passes under the clock and the battery: a fixed bar in the background color with the height `env(safe-area-inset-top)`.
17. **A-13 / R-05 Smart "Back"** (the Android button and gesture; on an iPhone our own swipe from the left edge and an ← arrow in the header of a subscreen). The order, the first one that applies:
    1. an open panel, menu, dialog or the XP history → close it;
    2. a form with unsaved changes → "Discard changes? [Discard] [Back]";
    3. a detail → back to the list;
    4. a sub-tab → the first tab of that section;
    5. a screen scrolled down → smoothly to the top;
    6. another section → smoothly to Today;
    7. Today at the top → "Leave the app? [Stay] [Leave]".
       Technically: one "guard" entry in the history (`history.pushState` + `popstate`), one function `handleBack()` with tests for every step.
18. **R-02 The calendar is easy to find.** An "Add to calendar" button both on the Study screen (next to the obligations) and on the Today screen, not only in the Settings; explained in the tutorial. It clearly says that it is one-time (new obligations = tap again). iPhone: open the calendar file directly, so that Safari offers "Add all" (sharing through the share sheet did not offer Calendar); if it does not work, leave sharing and write that in the report. **A-24:** all-day events remind at 09:00, not at midnight.

## Phase D — Study, workout, address form

19. **R-01 Slots look saved.** The form for a new slot is not visible all the time: a button "+ Add slot" opens a bottom panel (type, day, from–to, and "New slot type" inside the panel). Saved slots are clear rows with ✎ and ✕. The same for the form "New obligation": behind a button, in a panel.
20. **R-09** Points are shown relative to 100 ("0 / 100"), not "0 / 0 graded".
21. **R-11** A course without obligations: "Add midterms and the exam to see how much you are missing to pass" + an add button, instead of "cannot reach 51".
22. **R-10** The field "How should I address you" in the Settings is pre-filled with a vocative suggestion when empty.
23. **R-06 + A-05 Workout is one thing.**
    - A new workout: a name (optional), **a day and a time (required)**, it appears on the Today screen and has a reminder.
    - "+ Add exercise" is a prominent button; the fields have visible names (sets, reps, kg); ✕ with "Undo".
    - The duration is not asked for in advance: an estimate from the number of sets or the real duration when "Done" is marked. The feeling is optional and asked afterwards.
    - Entering exercises is tied to the scheduled workout (`Workout.activityId`), marks it as done and gives XP **once**; undoing restores it. The counter "This week", the streak, the planner and the Overview read the same source.
    - Ready splits: a button **"Use this plan"** → a panel "When do you work out?" (a day and a time for every day of the plan, a warning if it overlaps a slot at the faculty) → the workouts repeat every week. An active plan has the label "✓ Active", "Change time" and "Stop plan".
    - Exercise name suggestions from our own panel, not the system one (A-36).

## Phase E — Tutorial and morning routine

24. **R-04 Interactive tutorial** (required, the tester asked for it: it is not clear what the app is for).
    - After the intro questions: "Before you start, let us walk you through the app" [Start] [Skip].
    - A guided tour through the **real screens**: a highlighted part of the screen + a bubble, the user does the step (adds a trial obligation, ticks it and sees +XP, adds a course, drags a panel). About 1 minute, progress dots, "Skip" visible all the time.
    - It goes through briefly: Today, Study + slots + "Add to calendar", Workout + plans, Life/habits + XP and reward, the morning routine, AI, Settings.
    - The trial data from the tutorial is deleted at the end (together with the XP). Available again: Settings → "How the app works".
    - Short tips on empty screens. The first screen of the intro says in one sentence what the app is for.
25. **R-07 Morning routine** (the simple variant, the final decision of 8 Nov).
    - Setting: a wake-up goal + 3–5 steps; by default 🛏️ make the bed → 🤸 2 min of stretching → 💧 a glass of water → 🚿 wash up/teeth. The user changes the steps.
    - In the morning (until about 11 h) at the top of the Today screen a "Morning routine" card with ticking, an animation and XP; a bonus if it is done by the set time; its own streak 🔥.
    - "Save the day": if it is late or the routine was skipped, it offers a short version (2 steps) with "It is not too late, start with one small step". A positive tone, no judgment, respects gender and vocative.
    - A morning notification at the wake-up time ("Good morning, Vukašine ☀️ 3 steps and the day is yours"). In the PWA as far as the browser allows: a "Done ✓" button in the notification (`actions` + `notificationclick`), the next step comes out as a new notification. A real alarm and a persistent notification come in phase H (Android). iPhone: no buttons in the notification, written in the report.

## Phase F — Addictive, yet healthy app

The goal: that the user wants to open the app every day, and that their day is better afterwards. Rules for the whole phase: no judgment and guilt, no infinite content, at most 6 notifications a day and none after bedtime, everything can be turned off.

26. **An entry animation (~1 s)** on every opening of the app (not on a screen change and not during the intro): the logo → "Hello, Vukašine" (vocative, or the name in other languages) → the main streak "🔥 12 days". A tap skips it; it must not slow down the first screen (it goes over the already loaded content); with "reduced motion" only a short cross-fade.
27. **The main streak and the "saver".** A day counts if at least one thing is done (an activity, a habit up to the goal, a workout, the routine, a closed day). Every 7 days in a row you get one **saver** (at most 2 in reserve); a missed day spends a saver by itself, and on the next opening it says "❄️ A saver kept your 12-day streak". Without a saver the streak starts from 1, with "Longest streak: 12" (no reproach).
28. **Daily challenge.** One small, achievable challenge a day at the top of the Today screen, chosen from the user's data (e.g. "Register Midterm 1" if it is not registered, "One study block before 14 h", "Water up to the goal", "Go to bed by 00:30", "10,000 steps" in the Android version). Completion is recognized only where it can be; +15 XP; once a day "Give me another". The choice is determined by the date, so that tests are repeatable.
29. **Surprises.** After a done thing occasionally (about every fourth time, at most 2 a day) a "🎁 Surprise": bonus XP (5–20), bonus reward minutes (5–15) or a new badge. The outcome depends on the event id, so undo-then-repeat does not bring a new attempt, and undoing also restores the bonus.
30. **Progress you can see.** On the Today screen a week ring (active days 0–7) and a level bar; a new page "Achievements" with badges (the first week, a streak of 7/30/100, the first personal record, all registrations on time in a month, 50 h of study…) and personal records.
31. **Animation, sound, vibration.** Ticking is "written in" with an animation, the XP flies to the counter, confetti for a new level, a streak milestone and a closed day (CSS/canvas, no heavy library). Short sounds through Web Audio (no files) and `navigator.vibrate` (works on Android; on an iPhone there is no vibration in a PWA). Settings: Sound, Vibration, Animations; respects "reduced motion".
32. **"Close the day".** In the evening (from 2 h before bedtime, or with a button any time) a card in 3 short steps, up to 30 s in total:
    1. a review of the day: done, XP, steps (Android); not done → "Move to tomorrow" or "Skip";
    2. how the day went (1–5 emojis, a note optional);
    3. one main thing for tomorrow → tomorrow it stands at the top of the Today screen and in the morning notification.
       Closing gives +10 XP, keeps the streak, a calm animation "The day is closed 🌙" and a bedtime suggestion.

## Phase G — Quality, look, texts, README

33. **Accessibility and touch:** A-18 (a focus trap in panels), A-19 (a visible focus on the date), A-20 (a squeezed checkbox), A-21 (targets of at least 44 px).
34. **Look:** A-22 (a tidy obligation row with "⋯"), A-32 (two columns from 1024 px), A-28 (the reward in a free number of minutes), A-29 and A-30 (habits and expenses).
35. **Speed:** A-23 (languages and heavy screens on demand; the initial bundle under 120 kB gzip, write the goal into the report with numbers before and after).
36. **Texts:** A-26 (traces of the personal version, "Engineer", feminine forms, import without `domaci|lab`), A-27 (formats in the AI overview), A-25 (Overview: done / planned / goal).
37. **Install and link:** A-31 (the manifest, icons in the offline cache, `meta description` and Open Graph with an image, newer iPhone splash screens).
38. **Tests and CI:** A-33 (data version), A-34 (tests for `updates.ts`; a short e2e run in Firefox, on a tablet and at 1920 px), A-35 (publishing only after a successful CI).
39. **Personal data in the repo.** In `docs/development/MY_DAY_AI_TASK.md`, the section "0. Who I am" and the places that repeat it: generalize the wake-up and bedtime, the gym/basketball, the PS5 and the watch model (e.g. "an example user", "games", "a smartwatch"). **Do not touch the git history** (there are no secrets, the real email is hidden). A-38: put the local notes in the root into `.gitignore`.
40. **README (Serbian and English):**
    - a new section **"User testing"**: 2 testers, Android (Vukašin) and iPhone (**Andrea Jovović**, a student of the Faculty of Media and Communications; the name is given with her permission), what each test changed in the app; the tester tests, does not write code;
    - versions: add **0.4** and one sentence about the tool it was made with (the model name is entered by Vukašin);
    - new features (tutorial, morning routine, daily challenge, close the day, Android and the watch if phase H is done), new screenshots.
41. `package.json` to `0.4.0`, `REPORT.md` updated, the skill `release-bump`.

41a. **Portfolio automation.** `docs/development/automation/run-task.ps1`: a cleaned-up, general version of the personal script that 0.4 was started with (parameters `RepoPath`, `TaskFile`, `Model`, `Effort`, `LogFile`; no personal paths; `git pull`, then `claude -p` with `--dangerously-skip-permissions`, a log in `run.log` next to the script). With it a `README.md` in Serbian: how 0.4 was started through Task Scheduler, a scheduling example and what was learned (the limit interrupts the work, and the log shows the reset time). The personal copy and the logs stay in `.local-automation/`, which is in `.gitignore`. A link from `docs/development/README.md`.

## Phase H — Android (Capacitor), the watch and steps (PR 2)

A precondition: manual steps 1–5 from `AUDIT_0.4.md`, part 5.2 (the phone model, Android Studio, USB debugging, Health Connect, a bridge for Huawei Health). If `adb devices` does not see the phone, stop and write big what is missing.

42. Capacitor: `capacitor.config.ts` (id `io.github.vukasinknezevic.mydayai`), the `android/` project, a build without the PWA service worker, icons and a splash screen. The PWA and publishing on GitHub Pages work as before.
43. A layer `src/lib/health/` (one interface, "not available" in the PWA), a Health Connect plugin that reads **steps and sleep** on Android (check the plugin's documentation before choosing), permissions and a screen with an explanation.
44. **Settings → "Connect a watch":** a list of sources, at the top the ones found on the phone (`<queries>` with known packages, without `QUERY_ALL_PACKAGES`); a tap → an official permission request. For Huawei a short guide for the bridge to Health Connect.
45. **Sleep from the watch:** a night from Health Connect is written as a `SleepLog` with `source: 'watch'` (no duplicates with a manual entry; a manual entry takes priority if it exists).
46. **Steps (Vukašin, 10 Nov):** the number of steps from the main step-counting app through Health Connect; the goal is adjustable, 10,000 by default; a ring on the Today screen, XP once a day, it enters the daily challenge and "Close the day". **Reminders several times a day** (12:00, 16:00, 20:00 by default, adjustable): "6,240 of 10,000 steps. 3,760 to go."; it is not sent if the goal is reached or after bedtime. The first version uses the last read number (with the read time), then a background refresh before sending.
47. `@capacitor/local-notifications`: all reminders work even when the app is closed; the morning routine with a "Done ✓" button and a persistent notification; an alarm with a "slightly harder Stop" (hold for 3 s).
48. Moving data from the PWA: "Download file" → "Choose file" (item 7), with a guide on the first screen of the Android app.
49. Build and install over a cable (`npx cap sync android`, `gradlew assembleDebug`, `adb install`); in `docs/development/` a short guide `ANDROID.md`. Path B (Huawei Health Kit) only if the bridge does not give sleep: describe what was tried and stop.

## Check at the end

- Copy everything from the table "What must be on a real device" (`AUDIT_0.4.md`, part 4) into `REPORT.md` as a list for Vukašin (Android) and Andrea (iPhone).
- `npm run lint`, `npm run typecheck`, `npm run test:coverage`, `npm run build`, `npm run e2e` green; the coverage of `src/lib` does not fall below 90%.
