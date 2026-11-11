# LEARNING — a guide through the project (for someone who knows the basics of Python)

## 1. What React, TypeScript and a component are

**JavaScript** is the language of the browser. **TypeScript** is JavaScript with types: it is like writing `def f(x: int) -> str` in Python, but here the types are checked by a tool (`npm run typecheck`) before running, so an error shows up right away.

| Python                                | This project (TypeScript)                          |
| ------------------------------------- | -------------------------------------------------- |
| `@dataclass class Subject: name: str` | `interface Subject { name: string }` in `types.ts` |
| `list[dict]`                          | `Subject[]` (an array of objects)                  |
| `requirements.txt`                    | `package.json`                                     |
| `pip install x`                       | `npm install x`                                    |
| `pytest`                              | Vitest (`npm test`)                                |
| dictionary `{"a": 1}`                 | object `{ a: 1 }`                                  |
| `None`                                | `null` / `undefined`                               |
| list comprehension                    | `.map()`, `.filter()`                              |
| `f"Hello {name}"`                     | `` `Hello ${name}` ``                              |

**React** builds a screen out of **components**. A component is an ordinary function that returns a "description of the screen" (JSX, similar to HTML):

```tsx
function Greeting({ name }: { name: string }) {
  // like def greeting(name): ...
  return <h1>Hello, {name}!</h1>
}
```

When the data changes, React calls the function again by itself and refreshes the screen. Data that changes is called **state** (`useState`, and in this project the shared state lives in the **Zustand store**).

The key idea of the project: **logic is separate from looks**. The smart part (parser, planner, grades, XP) is ordinary functions in `src/lib/` that would work in Python too; the React screens only call them and show the result.

## 2. Order of reading the files

1. `src/types.ts` — all the concepts of the app (Subject, Assessment, Activity…). Start here.
2. `src/lib/dates.ts` — date helper functions (short).
3. `src/lib/quickParse.ts` + `quickParse.test.ts` — the parser from a sentence to an activity; the tests show what it does.
4. `src/lib/planner.ts` + `planner.test.ts` — the planning algorithm (the most interesting one to talk about).
5. `src/lib/schedule.ts`, `grades.ts`, `exams.ts` — what is on the schedule, grades, registrations.
6. `src/lib/xp.ts`, `life.ts`, `workout.ts` — XP, sleep/money/habits, records.
7. `src/store.ts` — where the state lives and how it is saved (IndexedDB).
8. `src/lib/ai/` — `prompt.ts` → `client.ts` → `extract.ts` → `schemas.ts` → `apply.ts`.
9. `src/pages/Today.tsx` — how a screen uses all of that. Then the other screens.
10. `e2e/app.spec.ts` — what a test that clicks like a user looks like.

Reading rule: for every function, first read its test (`*.test.ts`), because that is where it says what the function should do.

## 3. 10 interview questions for practice (and short answers)

**1. What does the app do and why did you build it?**
A personal day planner for a student. The biggest problem I wanted to solve is a forgotten midterm registration, so that is the first warning on the screen. Everything else (study, workout, sleep, money) is arranged around the obligations.

**2. Why TypeScript and not plain JavaScript?**
Types catch errors before running (e.g. a wrong field name) and serve as documentation. I have one file, `types.ts`, that is the source of truth for all data.

**3. Where is your smart logic and why is it separate from React?**
In `src/lib/` as pure functions (the same input gives the same output, no browser access). That makes it easy to test (over 200 tests) and independent of the looks.

**4. How does the planner work?**
For each day it calculates the free intervals (from wake-up to bedtime minus what is taken). For each midterm it splits the needed hours across the days before it: a harder exam starts earlier. Blocks are up to 2 h with a break, the daily limit is respected, the lighter day is chosen, a workout is shortened the day before an exam, and gaming is the reward. The result is _suggestions_ that the user accepts.

**5. How did you make sure AI does not break the data?**
AI never writes into the store directly. The answer goes through a `zod` schema (a runtime type check); only valid JSON becomes a suggestion with a dashed border, which the user accepts. If the JSON is bad, the user gets a message about what to ask Claude for.

**6. Why are there two AI modes?**
The manual one (you copy the prompt into claude.ai and paste the answer) is free and good for everyday use; the API is for automation. Both use the same code for the prompt, validation and display, so there is no duplication.

**7. Where is the API key stored and how did you make that safe?**
Only locally in the IndexedDB of that device, never in the code or in git (`.env*` is in `.gitignore`). The data export does not contain it. The app shows a warning that the key is visible in the browser. An honest limit: without a server it cannot be better; real protection needs a backend that keeps the key.

**8. How do saving data and offline mode work?**
Zustand `persist` writes the state into IndexedDB (in try/catch, so the app works even when the browser forbids it). The PWA (`vite-plugin-pwa`) caches the files, so the app works without the internet; only the AI call needs a connection.

**9. How did you test?**
Three levels: unit tests of pure logic (Vitest, `lib/` coverage about 93%), component tests (Testing Library) and end-to-end in a real Chromium (Playwright), plus an automatic accessibility check (axe). AI was tested with fake answers, including invalid JSON. Axe found real contrast problems that I fixed.

**10. What are the limits and what would you do next?**
No server, so notifications on a phone are not reliable (hence the `.ics` export); no sync between devices; sleep from a smartwatch is entered manually because I could not confirm the export format (see `docs/SMARTWATCH.md`). Next: sync, Google Calendar, push notifications through a server, a smarter planner. And I would say that I wrote part of the code with Claude Code, but that I understand the architecture and can explain every decision.

## 4. How to learn from this project

- Change one rule in `planner.ts` (e.g. `MAX_STUDY_BLOCK`), run `npm test` and see which tests break and why.
- Add one sentence to `quickParse.test.ts` that does not work, then fix the parser until it passes.
- Read `JOURNAL.md` in order: for each phase it says what was built and what you learned.

## 5. New in version 1.1: three ideas worth understanding

### What is i18n (internationalization)

**i18n** means the app does not keep text in the code, but in translation files. In Python it would be a dictionary per language:

```python
TRANSLATIONS = {"en": {"save": "Save"}, "sr-Latn": {"save": "Sačuvaj"}}
def t(key): return TRANSLATIONS[language][key]
```

It is the same here: `t('common.add')` returns "Dodaj" or "Add", depending on the chosen language. The files are in `src/i18n/locales/`. A new language = a new file, without changing code, because the app finds all the files in that folder by itself. The test `i18n.test.ts` checks that every language has the **same keys** and the same `{parameters}`, like `assert set(en) == set(sr)` in pytest. Dates and numbers are not translated by hand but formatted by the `date-fns` locale and `Intl` (built into the browser). Plurals ("1 dan, 2 dana, 5 dana") have three forms in Serbian, so the keys have the suffixes `.one`, `.few`, `.other`.

### What is a data migration

When you change the shape of the saved data (e.g. the field `ps5EarnedMin` becomes `rewardEarnedMin`), people who already have old data must not lose it. A **migration** is a function that turns the old shape into the new one. In the project it is `migrateData()` in `lib/defaults.ts`: a pure function that moves the fields and can be run more than once without harm. It runs when loading from IndexedDB and when importing JSON. It is similar to Django migrations or `ALTER TABLE` in databases, except here the data is in the browser.

### How the shared `NumberInput` component works

An ordinary `<input type="number">` in React makes a mistake: when you delete the number, the code turns it into `0`, so when you type `3` you get `03`. So `NumberInput` **keeps what you type as text** (`"3"`, or empty) and always sends the parent a valid number limited to `min`/`max`. The field may be empty while you type; when you leave it, the text is aligned with the saved value. So the fix applies everywhere the component is used: one component instead of fifteen copies of the same mistake. For fields that may be empty (e.g. "points" that have not been entered yet) there is `onEmpty`, which saves `null`.

In the same spirit is `KeyScope`: a small component that gives `Enter` (confirm) and `Esc` (cancel) to a step or a dialog, so the keyboard behaves the same everywhere.
