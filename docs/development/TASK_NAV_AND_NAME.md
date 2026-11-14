# Update 0.4.3: scrollable bottom navigation + automatic name grammar

Two changes, released together as version 0.4.3. Work on a new branch `0.4.3` created from an up-to-date `main`.
Use the `release-bump` skill for the version bump. Explore the code first; do not guess file names.

---

## Change 1: Bottom navigation scrolls horizontally, Settings stays pinned

### Current

The bottom nav shows a few main tabs (Today, College, ...) and the remaining sections are hidden in a "More" area/sheet.

### Expected

- ONE bottom bar. Left part = a horizontally scrollable strip with ALL sections (the main tabs AND everything that
  used to live in "More"), in a sensible order (most used first: Today, College, Training, ...).
- Exactly **4 items** fit the visible width of the strip at once. Each item has equal width (strip width / 4), so the
  5th item is cut off or off-screen and the user understands the strip scrolls. Add a subtle edge fade on the right
  (and on the left once scrolled).
- Smooth swipe with pure CSS: `overflow-x: auto`, `scroll-snap-type: x proximity`, `scroll-snap-align: start`,
  `-webkit-overflow-scrolling: touch`, `overscroll-behavior-x: contain`, hidden scrollbar. No JS-driven scrolling
  for the swipe itself.
- Right corner: a **Settings** button that is STATIC and OUTSIDE the scroll container (fixed width, thin divider on
  its left). Settings must no longer appear inside the strip.
- The active tab is scrolled into view (`scrollIntoView({ inline: 'center', behavior: 'smooth' })`) on route change and
  on first render (no animation on first render; respect `prefers-reduced-motion`).
- Remove the old "More" entry point and its sheet if nothing else uses it. Do NOT break the bottom sheet from 0.3.1
  ("sheet follows the finger") used elsewhere.
- Keep: touch targets >= 44 px, iOS/Android safe-area padding, badges/dots if any, active-state styling, lazy-loaded screens.
- Accessibility: `<nav aria-label>`, `aria-current="page"` on the active item, keyboard focus scrolls the focused item
  into view, axe stays clean. Labels must not overflow in any of the 6 languages (ellipsis; test with the longest label).

### Tests

- Component test: all sections rendered, Settings is outside the scroll container.
- Playwright e2e: scrolling reaches the last item, Settings stays visible while scrolled (Chromium + WebKit iPhone profile).

---

## Change 2: Name greeting, no vocative input, automatic grammar

### Symptom

The app asks the user to type their name in the vocative case, and on start it shows "Hello, Vukasine" even in English.
Users must NOT have to know or enter grammatical cases (just like the German locale already handles dem/den by itself).

### Expected

- Onboarding and Settings ask for ONE field only: the name (nominative), as the person normally writes it.
  Remove the separate vocative field/question everywhere (UI, types, state, i18n keys in all 6 locales, tests, docs).
- Add a pure function in `src/lib/` (e.g. `greetingName(name, locale)`) with tests:
  - `sr` (Latin and Cyrillic): Serbian vocative, derived automatically. Cyrillic is derived from the Latin result with
    the existing transliteration.
  - `en`, `fr`, `es`, `de`, `ru`: the name unchanged (nominative). Never apply Serbian grammar in other languages
    (English greeting: "Hello, Vukasin").
- Serbian vocative rules (rule-based + a small exception list; if the name is unknown or the rule is ambiguous, return
  the nominative unchanged, never produce garbage):
  - masculine ending in a consonant: add -e (Vukašin -> Vukašine, Stefan -> Stefane, Miloš -> Miloše, Nenad -> Nenade).
  - palatalization before -e: k->č, g->ž, h->š (Predrag -> Predraže).
  - fleeting "a": Petar -> Petre (exception list for names like Lazar -> Lazare).
  - masculine ending in -o/-e/-a (Marko, Darko, Đorđe, Nikola, Luka): unchanged.
  - feminine ending in -a: -o (Ana -> Ano, Marija -> Marijo, Jelena -> Jeleno); -ica -> -ice (Milica -> Milice).
  - other endings (-i, -u, -ć, -đ, ...): handle explicitly or fall back to the nominative.
  - Works with or without diacritics (Vukasin and Vukašin), keeps the user's own spelling (do not "fix" diacritics),
    ignores case and extra spaces. Multi-word names: only the first word is used for the greeting.
- Use `greetingName` everywhere the app addresses the user by name (intro, greetings, notifications, reminders,
  share text). Grep every usage.
- Data migration: bump the data version; `migrateData` drops/ignores the old vocative field. Idempotent, never loses
  the name. Old JSON exports must still import.

### Tests

Table-driven Vitest test with at least 40 Serbian names (male, female, nicknames, diacritics, Cyrillic).

---

## Acceptance criteria

- Format, lint, typecheck, build, unit tests and e2e (Chromium, WebKit iPhone, Firefox) are all green; the i18n parity
  test is green (no missing or orphan keys).
- Version `0.4.3` in `package.json`, short changelog entry, docs updated (README / ARCHITECTURE where relevant),
  and this file listed in `docs/development/README.md`.
- Small logical commits on branch `0.4.3`, PR to `main`, wait for green CI, merge (same merge style the repo already
  uses), confirm the GitHub Pages deploy finished and the live app loads. Delete the branch.

---

## Prompt for Claude Code (copy this)

```
In my project "My day AI" make update 0.4.3. Read docs/development/TASK_NAV_AND_NAME.md and do the whole task:
1. Bottom navigation: one horizontally scrollable strip with all sections (4 visible at once, smooth swipe),
   Settings as a static button in the right corner outside the scroll. Remove the old "More".
2. Name: ask only for the name (nominative). Serbian vocative is derived automatically; all other languages
   (including English) use the name unchanged. Remove the vocative field everywhere and migrate old data.

Work on branch 0.4.3, check all tests, open a PR, wait for green CI, merge into main and confirm the deploy.

At the end write me a short summary, in Serbian: what you changed, which tests you added, and how I can check it on the phone.
```
