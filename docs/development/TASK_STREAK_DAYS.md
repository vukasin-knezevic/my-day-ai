# Bug: the Today screen shows the raw key "streak.days"

## Symptom

On the streak card the title is `🔥 streak.days` instead of the translated text.
The subtitle ("This week: 1 of 7 days") is shown correctly, which means translations
work elsewhere, but this one key is not found.

## Expected

The title shows the real text (e.g. "Streak" / "Niz dana"), in every language the app supports.

## Likely cause (verify, do not assume)

- The key `streak.days` is missing from one or more translation files, so `t()` / the i18n function returns the key itself.
- Or the key is misspelled / in the wrong namespace / nested wrongly
  (e.g. defined as `streak: { days: ... }` while looked up differently, or the other way round).
- Or the translation is requested before it is loaded.

## Steps for Claude Code

1. Search the whole project for `streak.days` (and `streak` in general): where it is used and where the translations are defined.
2. Open all translation files and check whether `streak.days` exists in every language.
3. Find the real cause (missing key, wrong path, load order) and fix it properly, without hardcoding text in the component.
4. Add the translation to ALL supported languages.
5. Check the whole project for other keys that are used in code but have no translation. List them (and fix them if trivial).
6. Run the app/build and confirm that the Today screen shows the correct title.

## Acceptance criteria

- The streak card on Today shows the real title, not `streak.days`.
- There are no other raw keys anywhere in the app (words with a dot, like `something.something`).
- No new hardcoded strings; everything goes through the i18n system.

---

## Prompt for Claude Code (copy this)

```
In my project "My day AI", on the Today screen, on the streak card, the raw key "streak.days" is shown instead of the translated title. Other texts are translated normally.

Fix it in this order:
1. Search the project for "streak.days" and find where the translations are defined.
2. Check all translation files and find the real cause (missing key, wrong path/namespace, load order).
3. Fix it through the i18n system, without hardcoding a string in the component. Add the translation to ALL supported languages.
4. Check whether any other key used in code has no translation; list them and fix them if simple.
5. Run the app/build and check the Today screen.

At the end write me a short summary, in Serbian: what the cause was, which files you changed and how I can check that it works.
```
