# Task for Claude Code: "My Day AI"

> **How to use it:** make an empty folder `C:\Projekti\my-day-ai`, put this file in it, start Claude Code in that folder and write:
> **"Read MY_DAY_AI_TASK.md and do the whole task on your own, phase by phase."**

---

## 0. Who I am

- A **first-year student** at a technical faculty.
- I know **the basics of Python**, I **do not know** web programming (HTML, CSS, JavaScript). So explain everything from scratch and write simple, readable code.
- I **have no Node.js and no GitHub account** (see phase 0).
- I get up in the morning and go to bed late in the evening (the exact time is set in the app).
- I work out and play games (an example user).
- I wear a smartwatch with a health app on my phone.
- This is **my first portfolio project**. It must be clean, with tests and a good README, and I must be able to explain it in an internship interview.

## 1. Working rules (IMPORTANT)

1. **Work on your own**, phase by phase. Ask me only when something really cannot go on (e.g. I need to install something or sign in somewhere).
2. First make a **PLAN.md** with all the phases and tick them off as you finish them.
3. After **every phase**: `npm run lint`, `npm run typecheck`, `npm test`. If something does not pass, fix it before the next phase.
4. After every phase a **git commit** in the Conventional Commits style (`feat:`, `fix:`, `test:`, `docs:`).
5. After every phase add to **JOURNAL.md** 3–5 sentences in Serbian, in simple language: what you built and what I learned from it. That is my learning material.
6. **Do not make up my data.** You do not know my courses, schedule or deadlines. Use **demo data** clearly marked as an example ("Mathematics 1 (example)") and a button "Delete demo data".
7. If you are not sure about something (e.g. how an API works), write that in REPORT.md instead of guessing.
8. **The API key must never end up in the code or in git.** Add `.env*` to `.gitignore`.
9. I can stop after any phase and continue tomorrow. So every phase must leave an app that **works**.
10. **Maximum automation:** I am not watching the screen all the time. Do not wait for my confirmation for things you can solve yourself. If something gets stuck, try another way before asking me. When you really have to ask me, write the question **big, at the top, in one sentence**.

## 1b. GitHub (already made)

- An empty public repository already exists: **https://github.com/vukasin-knezevic/my-day-ai.git** (GitHub account: `vukasin-knezevic`).
- In phase 0, after `git init`:
  - set `git config user.name "Vukašin Knežević"`,
  - for `user.email` use the GitHub private noreply email: `241362614+vukasin-knezevic@users.noreply.github.com` (my real email is hidden on purpose),
  - create the branch `main` and add the remote `origin` at the address above.
- **After every phase**, when the tests pass and you have made a commit, do `git push origin main`.
- The first `push` will open a GitHub sign-in window (Git Credential Manager). Then write me, big: **"Sign in to GitHub in the window that popped up"** and wait. After that, push works on its own.
- Never use `git push --force` and never delete the history.
- `.claude/settings.local.json` must be in `.gitignore` (my personal settings, they do not go to GitHub).
- Do not change the repository settings on GitHub (set up GitHub Pages and Actions only through files in the project).

## 2. Technologies

- **Vite + React 18 + TypeScript** (strict)
- **Tailwind CSS**
- **Zustand** with `persist` into **IndexedDB** (through `idb-keyval`), everything in try/catch
- **React Router** (hash router)
- **date-fns** with the `sr-Latn` locale, the week starts on Monday
- **Recharts** for charts
- **Vitest + React Testing Library**, **Playwright** for e2e (Chromium)
- **ESLint + Prettier**
- **vite-plugin-pwa**: the app installs on a phone and a laptop and works offline (except the AI part)
- **Anthropic API** directly from the browser (see phase 8)

## 3. Look

- **Clean and calm.** Light and dark theme (follows the system, with a manual switch).
- Colors by category, the same everywhere:
  - 📚 Study and learning: blue
  - 🏋️ Workout: orange
  - 😴 Sleep and rest: purple
  - 🎮 Games: green
  - 🍗 Nutrition: red
  - 💰 Money: yellow
  - ✅ Habits: teal
- Emojis for a quick overview, but no clutter.
- **Mobile-first**: it must first work perfectly on a phone (390 px), then on a laptop. Bottom navigation on a phone, a sidebar on a laptop.
- All text in the app in **Serbian (Latin)**. Code and comments in English.

---

## PHASE 0 — Setting up my computer

Check `node -v`, `npm -v` and `git --version`.

- If something is missing, try to install it through `winget` (Node.js LTS, Git) and ask me for permission.
- If it cannot be done automatically, write me a **SETUP.md**: exact steps with links, for Windows.
- Also write me a short guide on how to make a **GitHub account** and how to push the project afterwards (but do not push anything yourself).

## PHASE 1 — Foundation and data model

Types in `src/types.ts`, pure logic (without React) in `src/lib/`.

- **Subject (course):** name, color, ECTS, lecture and exercise slots by day, **"going / not going / sometimes"** for every slot.
- **Assessment (midterm / exam / homework / lab):** course, type, date and time, **registration deadline**, **registration status** (not registered / registered / no registration needed), max points, points earned, difficulty 1–5, estimated study hours.
- **Activity:** title, category, date, start, end, repeat, status (planned / done / skipped), source (me / AI suggestion).
- **Workout:** date, type, duration, exercises (name, sets, reps, weight), feeling 1–5.
- **WorkoutPlan:** a plan by days (made by AI, phase 8).
- **SleepLog:** went to bed, got up, quality 1–5, source (manual / import from the watch).
- **Meal:** date, description, protein (g), calories optional.
- **Expense:** date, amount (RSD), category (food, transport, games, study, going out, other), description. **Budget:** a monthly limit per category.
- **Habit:** name, emoji, goal (e.g. 2 L of water, 20 min of reading), daily entries.
- **GameSession:** date, game, duration.
- **Progress:** XP, level, streaks of days, reward time earned and spent.
- **Settings:** wake-up, bedtime, goals, theme, AI key and model, reminders.

Make a 5-step **onboarding** on first open: name, daily rhythm, goals, courses (can be later), AI key (can be later).

## PHASE 2 — 🌅 The "Today" screen

- Date, day, one sentence about the day ("Today: 2 classes, a workout and 2 h of study").
- A **timeline of the day** from wake-up to bedtime, blocks in colors.
- The current activity highlighted, a countdown to the next one.
- "Done" / "Skip" with one click (gives XP, see phase 7).
- A **warning card at the top** when something is burning: an unregistered midterm, a deadline tomorrow, little sleep.
- Quick entry in one field (without AI the basic parser works, with AI a smarter one, phase 8):
  "workout 18-19:30", "tomorrow study math 2h", "coffee 200", "bed 1:30".
  Write the parser in `src/lib/quickParse.ts` with **at least 25 tests** (today, tomorrow, the day after tomorrow, days of the week, 18h, 18:30, 18-19:30, amounts in dinars).

## PHASE 3 — 📚 Study

- Entering courses and the weekly schedule.
- **When I have entered all the slots, the app asks me about each one: going / not going / sometimes.** "Not going" slots are shown as **free time** that the planner can use. "Sometimes" slots ask me once a week (Sunday evening) for the next week.
- **Midterms and exams:**
  - A list with a countdown and a color by urgency.
  - **Registration checklist:** for every midterm "Did you register?". Unregistered ones with a registration deadline in the next 7 days go red on the "Today" screen.
  - A separate check "**November: registrations**" that lists all midterms in the current month and their registration status.
  - Text import: I paste the midterm schedule from the faculty's site, and AI extracts the dates (phase 8). Without AI, manual entry.
- **Homework and labs:** submission deadlines, status.
- **Points and grades:** per course points earned / maximum, how many are missing to pass (I enter the pass threshold, 51 by default) and a grade estimate on the scale 51–60 = 6, 61–70 = 7, 71–80 = 8, 81–90 = 9, 91–100 = 10. Test the logic.

## PHASE 4 — 🧠 Planner (without AI, the base)

`src/lib/planner.ts`, a pure function `planWeek()`, **at least 20 tests**:

- Suggests study blocks before midterms, spread over several days.
- A harder and closer deadline = more study earlier.
- At most 3 h of study in a row, then a break.
- Nothing before wake-up or after bedtime.
- The day before a midterm a workout is moved or shortened, with an explanation.
- At least one lighter day in the week.
- Uses the "not going" slots as free time.
- Suggests games as a reward after study.
- Suggestions have a dashed border until I accept them.

This planner always works. AI (phase 8) only upgrades it.

## PHASE 5 — 🏋️ Workout and 🍗 nutrition

- Detailed entry: exercises, sets, reps, weight. Workout templates.
- A weight chart per exercise, **personal records** automatically with 🎉.
- The weekly number of workouts compared to the plan.
- **The workout plan is made by AI** (phase 8) based on my goal, experience and study schedule. Without AI offer 3 ready splits (3x full body, 4x upper/lower, 5x push/pull/legs).
- **Nutrition:** quick entry of meals and protein, a daily protein goal (I enter it), a progress bar. No calorie counting if I do not want it.

## PHASE 6 — 😴 Sleep, 💰 money, ✅ habits

- **Sleep:** "Went to bed" and "Got up" buttons (two clicks), a 7-day average, a chart, a bedtime suggestion based on tomorrow's first obligation.
- **Smartwatch:** research what is realistically possible and write it in `docs/SMARTWATCH.md`:
  - Whether Huawei Health can export sleep data (e.g. through a request for a copy of the manufacturer account's data or a sync with another app) and in what format.
  - Whether the watch manufacturer's health API can be used from a web app without a server.
  - If there is an export file, make an **import of that file** into the app. If there is no simple way, leave manual entry and write clearly why, with a plan for version 2. **Do not make up the file format.**
- **Money:** entering expenses in dinars, a monthly budget per category, a warning at 80% of the budget, a chart by category.
- **Habits:** I add my own (water, reading, a walk…), tick them daily, a streak of days.

## PHASE 7 — 🎮 Motivation

- **XP and levels:** a completed obligation gives XP (study 10 XP per 30 min, workout 30, a registered midterm 20, a habit 5…). Levels with names (e.g. Freshman → Student → … → Engineer). Test the calculation.
- **Streaks of days** 🔥 for study, workout, sleep and habits.
- **Fun time as a reward:** every hour of study earns e.g. 30 min of gaming (adjustable). A display "earned / spent". Never scold for gaming.
- Small celebrations for records and streaks.

## PHASE 8 — 🤖 The AI part (Claude API)

- In the settings I paste **my Anthropic API key**. It is stored **only locally** on my device. Add a clear warning that the key is visible in that device's browser and that I should not share it.
- Calls go directly from the browser to the Anthropic Messages API (with the header that allows a call from a browser). Check the exact model names and headers in the official documentation before writing code.
- Model choice in the settings: a faster and cheaper model for text entry, a stronger one for planning.
- Show a **usage estimate** (tokens per call and in total this month).
- All AI functions have a **fallback without AI** when there is no key or no internet.

AI functions:

1. **AI day / week plan:** sends my obligations, deadlines, goals and sleep; returns a structured JSON plan that the app checks (validation with `zod`) before showing it as a suggestion.
2. **Chat assistant:** "What should I do now?", "How do I get everything done by Friday?". It sees my data for the current week.
3. **Week summary:** every week in the evening a short summary and 3 tips.
4. **Smart text entry:** "tomorrow after the exercises a workout and then I study 2 hours" → activities.
5. **Import of the midterm schedule** from pasted text.
6. **Workout plan** by my goal and schedule.

**The assistant's tone** (put it in the system prompt):

- **Friendly and short** when everything is fine.
- **Strict**, direct and without excuses, when I skip obligations, when a midterm is unregistered or a deadline is near.
- **Calm and supportive** when I am tired, when I sleep little or when it is a hard week.
- Always in Serbian, with emojis, short.

Test the AI part **without real calls** (mock answers), including invalid JSON.

### 8b. 📋 Manual AI mode (free, without an API key)

I will use this mode every day, and the API only occasionally and for a demo. So it must be simple and fast.

- A switch in the settings: **AI mode: API / Manual**. Manual is the default when there is no key.
- For every AI function (day plan, week plan, summary, midterm import, workout plan) a button **"📋 Copy for Claude"**:
  - makes a ready text (prompt) in Serbian with my data for the current week, with the same rules and tone as the system prompt,
  - at the end of the prompt asks Claude to **first ask me 3–5 short questions** (how I slept, how I feel, whether I go to classes, what is urgent), and only then return the plan,
  - and to return **JSON in a code block** at the end, by the exact schema (include the schema in the prompt).
- A field **"📥 Paste the answer"**: I paste the whole answer from the chat, the app finds the JSON block by itself, checks it with the same `zod` schema and shows it as a suggestion. If the JSON is bad, a clear message about what to ask Claude for.
- The same code for checking and display is used by both the API and the manual mode (one shared layer, e.g. `src/lib/ai/`), so there is no duplication.
- A button that opens claude.ai in a new tab.
- Tests: prompt generation, finding JSON in a text with lots of chatter around it, invalid JSON, empty.
- In the README explain both modes and why they exist (free for every day, API for automation).

## PHASE 9 — 🔔 Reminders and 📊 overview

- **Reminders:** browser notifications (Notification API) before a class, a deadline, a registration deadline and bedtime.
  - Write honestly in the README what works and what does not: without a server, notifications on a phone work reliably only while the app is open or recently used.
  - So also add an **export to .ics** (calendar), so the phone reminds me by itself through the calendar.
- **Week overview:** hours per category, goals, streaks, expenses, average sleep, XP. Charts.
- **Month overview:** the same, plus points per course.

## PHASE 10 — ⚙️ Data and quality

- Export and import of all data as JSON (a "Copy" button, a field for pasting and a file download).
- Deleting everything with a confirmation inside the page (without `confirm()`).
- **Accessibility:** all buttons have text or an `aria-label`, focus is visible, AA contrast, works with the keyboard.
- **Responsive:** 390 px, ~800 px and 1920 px.
- **Shortcuts:** N new item, T today, W week, / quick entry, ? list of shortcuts.
- **Playwright e2e** (at least 10): onboarding, quick entry, "going / not going", an unregistered midterm on the Today screen, adding a workout and a record, an expense over the budget, XP after "done", data after a reload, export/import, dark theme.
- **Coverage** of `src/lib/` at least 80%.
- Screenshots in `docs/screenshots/` (phone and laptop, light and dark theme).
- `npm run build` without warnings.

## PHASE 11 — 🗂️ Portfolio

- **README.md in Serbian and English:** the problem it solves, screenshots, features (especially the planner and AI), technologies and why, how to run it, how to run the tests, the folder structure, and the sentence: _"I came up with and designed the app, and I wrote the code with Claude Code."_
- `docs/ARCHITECTURE.md` with a Mermaid diagram of the data flow.
- `LICENSE` (MIT).
- GitHub Actions: lint, typecheck, unit and e2e tests.
- Prepare the publishing to **GitHub Pages** (vite `base` = `/my-day-ai/` and a deploy workflow). In the README tell me exactly which button to click in the GitHub settings to turn the page on.

## PHASE 12 — Wrap-up

1. Run `npm run dev` and tell me the exact link, and the link for the phone on the same Wi-Fi network.
2. **REPORT.md:** what was done, what was not, known problems.
3. **LEARNING.md** for me (I know only the basics of Python):
   - what React, TypeScript and a component are, by comparison with Python,
   - the order of files to read (start from `types.ts`, `planner.ts`, `quickParse.ts`),
   - 10 internship interview questions about this project, with short answers.
4. 5 ideas for version 2 (sync between devices, Google Calendar, a watch integration, a server for push notifications…).
