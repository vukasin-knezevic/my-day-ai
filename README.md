# 🌅 My Day AI

[![CI](https://github.com/vukasin-knezevic/my-day-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/vukasin-knezevic/my-day-ai/actions/workflows/ci.yml)
[![Live demo](https://img.shields.io/badge/Live%20demo-open%20the%20app-2563eb?style=for-the-badge)](https://vukasin-knezevic.github.io/my-day-ai/)

**[👉 Live demo: vukasin-knezevic.github.io/my-day-ai](https://vukasin-knezevic.github.io/my-day-ai/)** · **[Srpski](#srpski) · [English](#english)**

<p align="center">
  <img src="docs/screenshots/danas-telefon-light.png" alt="Ekran Danas (telefon, svetla tema)" width="240">
  <img src="docs/screenshots/danas-telefon-dark-en.png" alt="Today screen (phone, dark theme, English)" width="240">
  <img src="docs/screenshots/danas-telefon-light-sr-cyrl.png" alt="Екран Данас (телефон, ћирилица)" width="240">
</p>

---

## Srpski

> Aplikaciju sam osmislio i dizajnirao ja, a kod sam pisao uz Claude Code.

Počeo sam da je pravim kao student, za svoj dan: da faks, kolokvijumi, trening i san ne budu razbacani po kalendaru, porukama i glavi. Posle sam je pretvorio u opštu aplikaciju koju može da koristi **svaki student**: ti sam podešavaš ritam dana, ciljeve, nagradu i jezik.

**My Day AI** je planer dana za studente: faks, kolokvijumi, trening, ishrana, san, novac i navike na jednom mestu. Radi na telefonu i laptopu, instalira se kao aplikacija (PWA) i radi offline (osim AI dela). Dostupna je na srpskom (latinica i ćirilica), engleskom, francuskom, španskom, nemačkom i ruskom.

### Verzije

Do zvanične objave sve verzije su **0.x**: **0.1** (prva cela aplikacija), **0.2** (opšta verzija, noćne popravke i pregled koda), **0.3** (popravke posle prvog stvarnog korišćenja na telefonu, nova podešavanja, iPhone). Verzija **1.0** je rezervisana za prvu zvaničnu objavu (kolege + Google Play).

### Problem koji rešava

Student ima predavanja, kolokvijume sa rokovima za prijavu, trening, zabavu i san, a sve to je razbacano. Najveći rizik je banalan: **zaboraviš da prijaviš kolokvijum**. Aplikacija zato to stavlja crveno na prvi ekran, a ostatak dana slaže oko obaveza.

### Funkcije

- 🌅 **Danas**: vremenska linija od buđenja do spavanja, „urađeno / preskoči" jednim klikom, **dodavanje i izmena aktivnosti** (i ponavljajućih: svaki dan, radnim danima, nedeljno), upozorenja (neprijavljen kolokvijum, rok sutra, malo sna) i **brzi unos rečenicom** („sutra učenje mata 2h", „kafa 200", „legao 1:30" ili „gym tomorrow 18-19:30", „coffee 200", „slept 1:30"), čak i bez AI-ja.
- 📚 **Faks**: predmeti, nedeljni raspored uz pitanje **idem / ne idem / ponekad** (termini „ne idem" postaju slobodno vreme), kolokvijumi sa odbrojavanjem u boji, **čeklista prijava** za tekući mesec, poeni, ocena i koliko fali do prolaza.
- 🧠 **Planer bez AI-ja** (`planWeek`): raspoređuje učenje pre kolokvijuma (teži i bliži rok = ranije i više), blokovi sa pauzom, ništa pre buđenja ni posle spavanja, bar jedan lakši dan, dan pred kolokvijum skraćuje trening i objašnjava zašto, nagradu nudi posle učenja. Predlozi imaju isprekidanu ivicu dok ih ne prihvatiš.
- 🤖 **AI (Claude)**: plan dana i nedelje, chat asistent, rezime nedelje, pametan unos, uvoz rasporeda kolokvijuma iz nalepljenog teksta, plan treninga. Odgovori se **validiraju `zod` šemama** pre prikaza, a ton asistenta se menja (drugarski / strog / podržavajući). Prompt i odgovori su na izabranom jeziku. Vidi [dva režima](#dva-ai-režima).
- 🏋️ **Trening i ishrana**: serije × ponavljanja × kilaža, grafikon napretka, automatski **lični rekordi 🎉**, gotovi splitovi i **sopstveni šabloni treninga**, dnevni cilj proteina.
- 😴💰✅ **San, novac, navike**: „Legao / Ustao", prosek sna, predlog vremena spavanja; budžet po kategoriji sa upozorenjem na 80% (valuta po izboru); navike sa nizom dana.
- 🎁 **Motivacija**: XP, nivoi (Brucoš → Inženjer), nizovi 🔥 i **nagrada koju sam biraš** (npr. vreme za igrice, epizoda serije, izlazak) koju zarađuješ učenjem. Aplikacija je samo broji, bez zamerki.
- 🔔 **Podsetnici i pregled**: notifikacije pregledača + **„Dodaj u kalendar“**, pregled nedelje i meseca sa grafikonima.
- 💾 Izvoz/uvoz svih podataka (JSON, bez API ključa), tamna tema, prečice na tastaturi (`N`, `T`, `W`, `/`, `?`; `Enter` potvrđuje, `Esc` otkazuje).

### Izgled

<p align="center">
  <img src="docs/screenshots/faks-telefon-light.png" alt="Faks, telefon, svetla tema" width="200">
  <img src="docs/screenshots/planer-telefon-dark.png" alt="Planer, telefon, tamna tema" width="200">
  <img src="docs/screenshots/trening-telefon-light-en.png" alt="Workout, phone, light theme, English" width="200">
</p>
<p align="center">
  <img src="docs/screenshots/pregled-laptop-light.png" alt="Pregled, laptop, svetla tema" width="440">
  <img src="docs/screenshots/faks-laptop-dark-en.png" alt="Study, laptop, dark theme, English" width="440">
</p>

Sve slike su u [`docs/screenshots/`](docs/screenshots/): telefon i laptop, svetla i tamna tema, srpski i engleski (i ćirilica).

### Jezici

Aplikacija je prevedena na **srpski (latinica)**, **srpski (ćirilica)**, **engleski**, **francuski**, **španski**, **nemački** i **ruski**. Prevodi na engleski, francuski, španski, nemački i ruski nisu prošli izvornog govornika. Jezik biraš u prvom koraku podešavanja pri prvom pokretanju, a kasnije u **Podešavanja → Izgled → Jezik**. Podrazumevano se uzima jezik pregledača. Datumi, nazivi dana i meseci i format brojeva prate izabrani jezik, a AI prompt i odgovori takođe. Brzi unos razume srpski i engleski.

### Kako dodati jezik

Dodavanje jezika je **samo jedan novi fajl**, bez menjanja koda:

1. Kopiraj `src/i18n/locales/en.ts` u `src/i18n/locales/<kod>.ts` (npr. `de.ts`).
2. U novom fajlu prevedi tekstove (desna strana), postavi `code`, `name` (naziv jezika na tom jeziku) i `dateLocale` (iz `date-fns/locale`). Ostavi `{parametre}` na svom mestu; oblici množine su ključevi sa `.one`, `.few` i `.other`.
3. Pokreni `npm test`: test koji pada tačno kaže koji ključ ili `{parametar}` fali. Kad prođe, jezik se sam pojavi u izboru jezika.

### Dva AI režima

|      | 📋 Ručni (besplatno)                                                                                           | 🤖 API (plaća se po upotrebi)                      |
| ---- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Cena | besplatno                                                                                                      | plaća se po upotrebi (prikazana procena potrošnje) |
| Kako | „Kopiraj za Claude" → nalepiš u [claude.ai](https://claude.ai) → odgovoriš na 3–5 pitanja → nalepiš JSON nazad | jedan klik, poziv ide direktno iz pregledača       |
| Kod  | **isti** prompt, **ista** `zod` provera i **isti** prikaz                                                      |                                                    |

Režim biraš u onboardingu, a možeš da ga promeniš u podešavanjima. Ključ se čuva **samo lokalno** u pregledaču tog uređaja; vidljiv je u alatima pregledača, zato ga nikome ne deli i postavi mesečni limit potrošnje u Anthropic konzoli.

### Kako da dobiješ Anthropic API ključ (samo za API režim)

Ručni režim ne traži ključ. Za API režim:

1. Napravi nalog na [console.anthropic.com](https://console.anthropic.com) i prijavi se.
2. U **Billing** dodaj način plaćanja i postavi mesečni limit potrošnje.
3. Otvori **API Keys** → **Create Key**, daj mu ime (npr. „My Day AI") i **kopiraj ključ** (počinje sa `sk-ant-`). Prikazuje se samo jednom.
4. U aplikaciji: **Podešavanja → AI**: izaberi API režim i nalepi ključ u polje **API ključ**. Ključ ostaje samo na tom uređaju.

### Podsetnici: šta radi, a šta ne

Nema servera, pa notifikacije na telefonu rade pouzdano samo dok je aplikacija otvorena ili nedavno korišćena. Zato postoji **„Dodaj u kalendar“**: telefon odmah ponudi Kalendar i on će sam podsećati.

### Tehnologije (i zašto)

| Alat                                       | Zašto                                                              |
| ------------------------------------------ | ------------------------------------------------------------------ |
| Vite + React 18 + TypeScript (strict)      | brz razvoj, komponente, tipovi hvataju greške pre pokretanja       |
| Tailwind CSS                               | konzistentan dizajn, tamna tema, mobile-first                      |
| Zustand + IndexedDB (`idb-keyval`)         | jednostavno stanje koje preživi zatvaranje aplikacije, bez servera |
| React Router (hash)                        | radi na statičkom hostingu (GitHub Pages)                          |
| i18n sloj + date-fns locale + `Intl`       | jezici kao fajlovi prevoda, datumi i brojevi po jeziku             |
| Recharts                                   | grafikoni                                                          |
| zod                                        | provera AI odgovora (model može da vrati loš JSON)                 |
| Vitest + Testing Library, Playwright + axe | unit, komponentni i e2e testovi, provera pristupačnosti            |
| vite-plugin-pwa                            | instalacija na telefon i rad offline                               |

### Pokretanje

```bash
npm install
npm run dev          # http://localhost:5173 (i adresa za telefon na istoj Wi-Fi mreži)
```

### Testovi

```bash
npm run lint && npm run typecheck
npm test                 # unit + komponente (Vitest), prevodi i pravila planera na 300 nasumičnih nedelja
npm run test:coverage    # pokrivenost src/lib
npx playwright install chromium   # jednom
npm run e2e              # end-to-end + axe pristupačnost
SCREENSHOTS=1 npx playwright test screenshots   # nove slike u docs/screenshots
```

### Struktura

```
src/
  types.ts            svi tipovi podataka
  store.ts            Zustand + IndexedDB
  i18n/               prevodi (locales/*.ts), t(), izbor jezika
  lib/                čista logika bez React-a (testirana)
    quickParse.ts     brzi unos rečenicom (srpski i engleski)
    planner.ts        planWeek()
    schedule.ts       šta je na rasporedu, upozorenja
    grades.ts exams.ts workout.ts life.ts xp.ts overview.ts ...
    ai/               prompt, klijent, izvlačenje JSON-a, zod šeme (API i ručni režim)
  pages/              ekrani
  components/         zajednički UI (NumberInput, KeyScope, ...)
e2e/                  Playwright testovi
docs/                 ARHITEKTURA.md, SMARTWATCH.md, screenshots/
```

Detalji: [docs/ARHITEKTURA.md](docs/ARHITEKTURA.md). Beleške o podacima o snu sa pametnih satova: [docs/SMARTWATCH.md](docs/SMARTWATCH.md).

### Objava

Automatski se objavljuje na GitHub Pages pri svakom push-u na `main`.

### Licenca

MIT, vidi [LICENSE](LICENSE).

---

## English

> I conceived and designed this app; I wrote the code with Claude Code.

I started building it as a student, for my own day: so that classes, exams, workouts and sleep would stop being scattered across calendars, chats and my head. Then I turned it into a general app that **any student** can use: you set your own daily rhythm, goals, reward and language.

**My Day AI** is a day planner for students: classes, exams, workouts, nutrition, sleep, money and habits in one place. It is a mobile-first PWA that installs on a phone or laptop and works offline (except the AI part). It is available in Serbian (Latin and Cyrillic), English, French, Spanish, German and Russian.

### Versions

Until the official release every version is **0.x**: **0.1** (the first complete app), **0.2** (the general version, overnight fixes and a code review), **0.3** (fixes after the first real use on a phone, new settings, iPhone). **1.0** is reserved for the first official release (colleagues + Google Play).

### The problem

A student juggles lectures, exams with registration deadlines, workouts, fun and sleep, all scattered. The most common and costly mistake is simple: **forgetting to register for an exam**. The app puts that in red on the first screen and builds the rest of the day around the obligations.

### Features

- 🌅 **Today**: day timeline from wake-up to bedtime, one-click done/skip, **add and edit activities** (also repeating ones: daily, weekdays, weekly), alerts (unregistered exam, deadline tomorrow, low sleep) and a **one-line quick entry** ("tomorrow study math 2h", "coffee 200", "slept 1:30"), works without AI.
- 📚 **Study**: subjects, weekly timetable with a **going / skipping / sometimes** question per slot (skipped slots become free time), exams with colored countdown, a **registration checklist** for the current month, points and grade estimate.
- 🧠 **Rule-based planner** (`planWeek`): study blocks before exams (harder and closer = earlier and more), breaks, nothing before wake-up or after bedtime, at least one easy day, a shortened workout on the exam eve (with an explanation), your reward after studying. Suggestions have a dashed border until accepted.
- 🤖 **AI (Claude)**: day/week plan, chat, weekly summary, smart entry, exam schedule import from pasted text, workout plan. Every answer is **validated with `zod`** before it is shown; the assistant's tone adapts (friendly / strict / supportive). Prompts and answers use the selected language.
- 🏋️ **Workouts & nutrition**: sets × reps × weight, progress chart, automatic **personal records**, ready-made splits and **your own workout templates**, daily protein goal.
- 😴💰✅ **Sleep, money, habits**: bed/wake with two clicks, 7-day average, bedtime suggestion; budget per category with an 80% warning (your currency); habits with day streaks.
- 🎁 **Motivation**: XP, levels, streaks 🔥 and **a reward you name yourself** (gaming time, an episode of a series, a night out…) earned by studying. The app only counts it, no judging.
- 🔔 **Reminders + “Add to calendar”**, 📊 **week/month overview**, 💾 **JSON export/import** (without the API key), dark theme, keyboard shortcuts (`N`, `T`, `W`, `/`, `?`; `Enter` confirms, `Esc` cancels).

### Screenshots

<p align="center">
  <img src="docs/screenshots/trening-telefon-light-en.png" alt="Workout, phone, light theme" width="200">
  <img src="docs/screenshots/planer-telefon-dark-en.png" alt="Planner, phone, dark theme" width="200">
  <img src="docs/screenshots/faks-laptop-dark-en.png" alt="Study, laptop, dark theme" width="440">
</p>

### Languages

Serbian (Latin), Serbian (Cyrillic), English, French, Spanish, German and Russian (the last four were not reviewed by native speakers). Pick the language in the first onboarding step and change it any time under **Settings → Appearance → Language**. By default the browser language is used. Dates, weekday and month names and number formats follow the language, and so do the AI prompts and answers. The quick entry understands Serbian and English.

### How to add a language

One new file, no code changes:

1. Copy `src/i18n/locales/en.ts` to `src/i18n/locales/<code>.ts` (e.g. `de.ts`).
2. Translate the texts (right-hand side), then set `code`, `name` (the language's name in that language) and `dateLocale` (from `date-fns/locale`). Keep the `{placeholders}`; plural forms are keys ending in `.one`, `.few` and `.other`.
3. Run `npm test`: the failing test names the missing key or `{placeholder}`. Once it passes, the language shows up in the language picker by itself.

### Two AI modes

**Manual (free):** "Copy for Claude" builds a prompt with your week's data → paste it into claude.ai → answer 3–5 questions → paste the JSON reply back. **API (pay per use):** one click, called directly from the browser. You choose the mode during onboarding and can change it in the settings. Both modes use the **same** prompt builder, **same** `zod` validation and **same** preview. The API key is stored **only on your device** (visible in the browser's developer tools; never share it and set a spending limit in the Anthropic console).

### How to get an Anthropic API key (API mode only)

Manual mode needs no key. For API mode:

1. Create an account at [console.anthropic.com](https://console.anthropic.com) and sign in.
2. Under **Billing** add a payment method and set a monthly spending limit.
3. Open **API Keys** → **Create Key**, name it (e.g. "My Day AI") and **copy the key** (it starts with `sk-ant-`). It is shown only once.
4. In the app: **Settings → AI**: choose API mode and paste the key into **API key**. The key stays on that device only.

### Reminders: honest limits

No server means browser notifications on a phone only work reliably while the app is open or recently used. Use **Add to calendar**: the phone offers its Calendar app straight away, and the calendar then reminds you by itself.

### Tech stack

Vite, React 18, TypeScript (strict), Tailwind CSS, Zustand + IndexedDB, React Router (hash), an i18n layer with date-fns locales and `Intl`, Recharts, zod, Vitest + Testing Library, Playwright + axe, vite-plugin-pwa.

### Run & test

```bash
npm install && npm run dev
npm run lint && npm run typecheck && npm test
npx playwright install chromium && npm run e2e
```

### Deployment

Published automatically to GitHub Pages on every push to `main`.

### License

MIT.
