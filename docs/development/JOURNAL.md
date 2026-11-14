# JOURNAL — what I learned

## Phase 0 — Setup

We installed Node.js (it runs JavaScript outside the browser and gives you `npm`, a package manager like `pip` in Python) and Git (it remembers the history of the code). A Vite project was created: Vite is a tool that runs the app while you develop it. `package.json` is like `requirements.txt`, only with scripts (`npm run test`). You learned that `.gitignore` is there so that secrets (an API key) never end up on GitHub.

## Phase 1 — Foundation and data model

All the data of the app is described in `src/types.ts`: it is like defining a `dataclass` in Python for every concept (course, midterm, workout…), except that TypeScript checks the types before running. The store (`store.ts`) is a single place where the state lives and is saved into the browser's IndexedDB, so the data survives closing the app. The date helper functions are in `lib/dates.ts` and have tests; "pure function" means that for the same inputs it always returns the same output, so it is easy to test. A 5-step onboarding and demo data marked "(example)" were also made.

## Phase 2 — The "Today" screen

The parser `quickParse.ts` turns a sentence like "tomorrow study math 2h" into a structure (date, category, start, end). It works through regular expressions (regex), and you have the same principle in Python's `re` module. I wrote 34 tests, because the parser has many edge cases (e.g. "18h" is a time, and "2h" is a duration). The Today screen assembles the obligations from activities and the course schedule, calculates warnings (an unregistered midterm) and draws the timeline. You learned that the logic is kept in pure functions (`lib/`), and React only shows the result.

## Phase 3 — Study

I added courses, a weekly schedule and the question "going / not going / sometimes" for every slot. "Not going" slots become free time that the planner uses later. Midterms have a colored countdown, a registration checklist and an overview "November: registrations". Grade calculation (`gradeFor`) is an ordinary function with a table of tests, similar to `pytest.mark.parametrize` in Python.

## Phase 4 — Planner

`planWeek()` in `lib/planner.ts` is an algorithm with rules: it arranges study before midterms (a harder exam starts earlier), keeps breaks and at least one lighter day, shortens a workout on the day before an exam and offers gaming as a reward. It works with "free time intervals": you subtract what is taken from the day and what is left is free. It has 33 tests because it is a deterministic pure function. Suggestions have a dashed border until you accept them.

## Phase 5 — Workout and nutrition

You enter exercises as sets × reps × weight, and the app remembers the heaviest weight per exercise and says 🎉 when you beat it (`newRecords`). The first time you do an exercise it is not a record, because there is nothing to beat. A chart (Recharts) draws the weight progress over time. For nutrition there is a progress bar towards the daily protein goal. You learned what a `Map`/dictionary by key is and how the same data is shown in several ways.

## Phase 6 — Sleep, money, habits

Sleep is recorded with two clicks (Went to bed / Got up), and the app calculates the 7-day average and suggests a bedtime based on tomorrow's first obligation. Money has a monthly budget per category and a warning at 80%. Habits have a streak of days: the streak is not broken if today's is not done yet. For the Huawei watch I did research and wrote down in `docs/HUAWEI.md` what is confirmed and what is not; I did not make up the file format. You learned that "I don't know" is an honest answer when something cannot be verified.

## Phase 7 — Motivation

A completed obligation gives XP (study 10 XP per 30 min, workout 30, registration 20, habit 5), and every event has a unique `id`, so the same thing never pays twice. Levels go from Freshman to Engineer. Every hour of study earns PS5 minutes (adjustable), and the app only shows the balance, with no reproach. Streaks of days are calculated by the pure function `streakOf`, and the milestones (3, 7, 14, 30 days) are announced with a short message. You learned the idea of idempotence: a repeated call does not change the result.

## Phase 8 — AI (API and manual mode)

There are two modes with the same code behind them (`src/lib/ai/`): in the API mode the app sends a request to Anthropic from the browser with a plain `fetch`, and in the manual mode you copy a ready prompt into the Claude chat and paste the answer. Both paths go through the same `parseAiResponse`: it finds the JSON in a text full of chatter and checks it with a `zod` schema, the way you check data with `pydantic` in Python. The model can always return bad JSON, so every AI function has a clear message about what to ask for and a fallback without AI. The tests use a fake (mock) `fetch`, so they do not spend real money.

## Phase 9 — Reminders and overview

Browser notifications work only while the app is open or recently used, because there is no server that would send a push. That is why there is also an export to `.ics` (the standard calendar format), so the phone reminds you by itself through the calendar. The decision "when to send a reminder" is the pure function `dueReminders`, so it is tested without a browser. The week and month overview calculates hours per category, goals, expenses, sleep, XP and points, and Recharts draws the chart.

## Phase 10 — Data and quality

I added an export and an import of all data as JSON (the export deliberately does not contain the API key) and deleting with a confirmation inside the page. I wrote 16 end-to-end tests in Playwright: that is a robot that opens a real Chromium and clicks through the app like you. The same robot with the `axe` tool checks accessibility (contrast, button names) in the light and dark theme and found real errors that I fixed. Coverage of `src/lib/` is over 90%, and the pages with charts are loaded only when needed (lazy loading), so the first load is faster.

## Phase 11 — Portfolio

I wrote the README in Serbian and English, `docs/ARCHITECTURE.md` with a Mermaid diagram of the data flow and added the MIT license. GitHub Actions (`ci.yml`) runs lint, typecheck, unit and e2e tests on every push, and `deploy.yml` publishes the app to GitHub Pages. The key thing in an interview: you can explain why the logic is in pure functions and why AI never changes the data directly, but makes a suggestion that you accept.

## Phase 12 — Wrap-up

I wrote `REPORT.md` with an honest list of what works, what was not done and what I could not verify (e.g. a real API call and the Huawei format). `LEARNING.md` is your guide: a comparison with Python, the order of reading the files and 10 interview questions. The most important lesson of the project: when you cannot verify something, you write that down instead of pretending it works. The next step is to turn on GitHub Pages yourself (the instructions are in the README) and try AI with a real key.

# Version 0.2 (formerly 1.1)

## Part 1 — Fixes

The bug with the zero happened because the field kept turning an empty text into the number `0`. Now there is one shared component `NumberInput` that keeps what you type as text, so the field may be empty, and the value is limited to min/max. The keyboard works through a small component `KeyScope`: Enter does "Next/Save/Confirm", Esc does "Back/Cancel", and in a multi-line field Enter just makes a new line. After a step changes, focus returns to the first field, otherwise pressing Enter would have no effect. A form for a new and for editing an activity with repeating (daily, on weekdays, weekly) and saving your own workout templates were added.

## Part 2 — General version

"PS5" is no longer a fixed term: the user names the reward (by default "Fun time" with the emoji 🎮), and in the code the fields now have general names (`rewardEarnedMin`…). So that old saved data would not break, I wrote the function `migrateData` that moves the old fields into the new ones; it runs when loading and when importing, and can be run twice without harm. The AI prompt and the demo data no longer mention a university or a specific game. Onboarding has new steps "Reward" and "AI mode" (manual is free, or the API, which is paid by use, with a warning about the key).

## Part 3 — More languages

The app now has i18n (internationalization): all the interface texts are in translation files in `src/i18n/locales/`, and there is no hardcoded text in the components, only `t('key')` calls. A new language is just a new file in that folder: the list of languages is discovered by itself (`import.meta.glob`), and TypeScript and a test report an error if a language is missing a key or a `{parameter}`. Serbian Cyrillic is derived from Latin with a 1:1 letter-conversion rule, so there is no double maintenance. Dates, day names and numbers follow the language through the date-fns locale and `Intl`, and the AI prompt, the answers and quick entry work in Serbian and English. Playwright checks Cyrillic and English for no horizontal scroll and no axe violations.

## Part 4 — README as a general product

The README now looks like a product description for any student: at the top are a "Live demo" button and a CI badge, a short personal story and a sentence saying that I came up with the app and wrote the code with Claude Code. I removed the instructions that were meant for me (turning on GitHub Pages), because the page is published by itself on every push. I added the sections "Languages" and "How to add a language" (three steps) and new screenshots: light and dark theme, phone and laptop, Serbian, English and Cyrillic. The Huawei watch research was renamed to the general `docs/SMARTWATCH.md`, and `docs/ARCHITECTURE.md` also describes the i18n layer and the data migration.

## Part 5 — Wrap-up

All tests pass (271 unit/component and 21 e2e), the build has no warnings, and GitHub Pages updates itself after every push. `REPORT.md` now has a section "What is new in version 1.1" and an updated list of what was not done (e.g. the English translation was not reviewed by a native speaker). In `LEARNING.md` I added explanations for i18n, data migration and `NumberInput`. The most important lesson of this version: what you built for yourself easily becomes someone else's problem (a fixed "PS5", Serbian text in the code), so a general version is made by turning everything personal into a setting or a translation.

## 0.4.0 — The data is safe, the app is nicer for every day

Version 0.4 came out of the audit and the remarks of two testers (Android and iPhone). First the data: a failed read no longer overwrites anything, persistent storage is requested and a backup is suggested. Then behavior: a day picker, one shared "Undo", our own service worker so that tapping a notification opens the app, a smart "Back". Workout is now one thing (scheduled with a day and a time, and the exercises are a record attached to it), and the app has a tutorial, a morning routine, a daily challenge, "Close the day", streak savers and achievements. I learned the most from two things: how the app is split into parts that load only when needed (languages and heavy screens; similar to an `import` inside a function in Python), and that randomness in the app should be "random" only in appearance: surprises and the challenge depend on the id and the date, so the tests are repeatable and undoing does not give a new attempt.

## 0.4.3 — Scrollable bottom bar, the app knows grammar

Two small changes that make the app feel less awkward. The bottom bar is now one strip you swipe sideways (four sections visible at once, like a carousel) with Settings pinned on the right, so the hidden "More" screen is not needed. And the app no longer asks you to type your name in the Serbian vocative: you give the name, and a function `greetingName(name, language)` decides what to say. For Serbian it applies rules (Vukašin → Vukašine, Ana → Ano) and a few exception lists; for every other language the name is left alone. I learned that a pure function with a long table of examples (like Python's `pytest.mark.parametrize`) is the best way to trust grammar rules, and that when you remove a field from saved data you must migrate old data instead of just forgetting about it.
