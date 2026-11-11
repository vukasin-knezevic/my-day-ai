# Task for Claude Code: My Day AI — version 1.1 (fixes + general version)

> How to start: in the same Claude Code session or a new one, in the folder `C:\Projects\my-ai-app`, write:
> **"Read MY_DAY_AI_V2_TASK.md and do the whole task on your own, part by part, without stopping between parts."**

All the rules from `MY_DAY_AI_TASK.md` (sections 1 and 1b) apply: work on your own, lint + typecheck + test after each part, commit, `git push origin main`, a short entry in JOURNAL.md, do not make up my data, never `--force`. Change files with the Edit/Write tools (not with PowerShell), everything in UTF-8.

Make a `PLAN_V2.md` with the parts below and tick them off as you finish them.

---

## Part 1 — 🐞 Fixes I noticed while using the app

1. **Keyboard in all steps, forms and dialogs**
   - **Enter** = "Next" / "Save" / "Confirm" (onboarding, forms, dialogs). Right now you have to click with the mouse.
   - **Esc** = "Back" / "Cancel" / close the dialog.
   - It must not fire while the focus is in a multi-line field (textarea), except Ctrl+Enter.
   - Add tests (Testing Library and at least one Playwright test for onboarding with the keyboard only).
2. **Number fields, the zero bug**
   - When I delete a number, a `0` appears, and when I then type e.g. `3`, it shows `03`.
   - Fix: the field may be empty while I type, with no leading zeros, and the value is checked (min/max) only when saving or leaving the field. Make one shared `NumberInput` component and use it everywhere.
   - Tests: an empty field, `3` after deleting, decimals where needed, min/max.
3. **Remaining items from `REPORT.md`, the "What was NOT done" part**: as many as you can, but these for sure:
   - **editing an existing activity** (not only deleting),
   - **repeating activities** in the form (daily / on weekdays / weekly),
   - saving **your own workout templates**.

## Part 2 — 🌍 General version (for all users, not only for me)

The app should be a product that any student can use, and I set it up for myself through the settings.

1. **A reward instead of "PS5 time"**
   - In the code, data and text, remove "PS5" as a fixed term. Introduce a **reward that the user names** (settings and onboarding), e.g. "Gaming time", "An episode of a series", "Going out".
   - Default name: **"Fun time"**, and the emoji is chosen by the user (default 🎮).
   - The ratio "X min of reward per hour of study" stays adjustable.
   - I will enter "PS5 time" for myself in the settings.
   - Migration: existing saved data must keep working.
2. **No personal details of mine in the general version**: demo data, texts, the AI prompt and the README must not mention me, ETF, "November" or my watch as fixed things. The faculty, the month and the like should be calculated or adjustable (e.g. "Registrations for [the current month]").
3. **Onboarding: AI mode choice**
   - A new step: **Manual (free)** or **API (pay per use)**, with a short explanation of the difference and a link for more.
   - If API is chosen: a field for the key (can be later too) and a warning about the key's security.
   - It can be changed in the settings.

## Part 3 — 🗣️ More languages

1. Introduce **i18n** so that adding a new language is just a new file with translations, without changing code.
   - All interface texts go into translation files (e.g. `src/i18n/sr-Latn.ts`, `en.ts`), and there is no hardcoded text in the components.
   - Languages to start with: **Serbian (Latin)**, **English**, and if you have time **Serbian (Cyrillic)**.
   - Language choice in onboarding and settings, remembered. Default by the browser language.
   - Dates, days of the week and number formats follow the chosen language (date-fns locale).
   - **AI prompt and answers** in the chosen language. Let quick entry (the parser) understand at least Serbian and English.
2. **A test that fails** if a language is missing a translation key.
3. Check that nothing breaks in the layout when the text is longer (English / Cyrillic), on phone and laptop (Playwright screenshots).
4. In the README explain how to add a new language (3 steps).

## Part 4 — 📄 README as a general product

The README should look like a product description for anyone, with a short personal story, not like instructions to me.

1. At the top put a **link to the live app**: https://vukasin-knezevic.github.io/my-day-ai/ (a "Live demo" button or badge) and a CI badge.
2. A short personal story (2–3 sentences): I built it as a student for my own day, then turned it into a general app for students. The sentence "I came up with and designed the app, and I wrote the code with Claude Code" stays.
3. **Remove the parts that are instructions to me**, e.g. "Publishing to GitHub Pages: the workflow … is already in the project. To turn the page on, do this once…". Pages is already on, so instead, briefly: "It is published automatically to GitHub Pages on every push to main."
4. No "PS5", "November" and other details of mine: write "a reward you choose yourself (e.g. gaming time)", "registrations for the current month" and the like.
5. Add the sections **"Languages"** and **"How to add a language"**.
6. Update the screenshots (light and dark theme, phone and laptop, at least one in English).
7. The same for the English half of the README.
8. Also check `docs/ARCHITECTURE.md` and `LEARNING.md`, so that they follow the new changes.

## Part 5 — ✅ Wrap-up

1. All tests pass, the build has no warnings, everything is on GitHub (GitHub Pages updates itself).
2. Update `REPORT.md`: what is new in 1.1, what is still not done.
3. In `LEARNING.md` add a short explanation: what i18n is, what a data migration is and how the shared `NumberInput` component works.
