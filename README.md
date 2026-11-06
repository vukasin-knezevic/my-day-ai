# 🌅 My Day AI

**[Srpski](#srpski) · [English](#english)**

![Ekran Danas, telefon](docs/screenshots/danas-telefon-light.png)

---

## Srpski

> Aplikaciju sam osmislio i dizajnirao ja, a kod sam pisao uz Claude Code.

**My Day AI** je lični planer dana za studenta: faks, kolokvijumi, trening, ishrana, san, novac i navike na jednom mestu. Radi na telefonu i laptopu, instalira se kao aplikacija (PWA) i radi offline (osim AI dela).

### Problem koji rešava
Student ima predavanja, kolokvijume sa rokovima za prijavu, trening, igre i san, a sve to je razbacano po kalendaru, porukama i glavi. Najveći rizik je banalan: **zaboraviš da prijaviš kolokvijum**. Aplikacija zato to stavlja crveno na prvi ekran, a ostatak dana slaže oko obaveza.

### Funkcije
- 🌅 **Danas**: vremenska linija od buđenja do spavanja, „urađeno / preskoči" jednim klikom, upozorenja (neprijavljen kolokvijum, rok sutra, malo sna) i **brzi unos rečenicom** („sutra učenje mata 2h", „kafa 200", „legao 1:30"), čak i bez AI-ja.
- 📚 **Faks**: predmeti, nedeljni raspored uz pitanje **idem / ne idem / ponekad** (termini „ne idem" postaju slobodno vreme), kolokvijumi sa odbrojavanjem u boji, **čeklista prijava**, pregled „Novembar: prijave", poeni, ocena i koliko fali do prolaza.
- 🧠 **Planer bez AI-ja** (`planWeek`): raspoređuje učenje pre kolokvijuma (teži i bliži rok = ranije i više), najviše 2 h bloka sa pauzom, ništa pre buđenja ni posle spavanja, bar jedan lakši dan, dan pred kolokvijum skraćuje trening i objašnjava zašto, igru nudi kao nagradu. Predlozi imaju isprekidanu ivicu dok ih ne prihvatiš.
- 🤖 **AI (Claude)**: plan dana i nedelje, chat asistent, rezime nedelje, pametan unos, uvoz rasporeda kolokvijuma iz nalepljenog teksta, plan treninga. Odgovori se **validiraju `zod` šemama** pre prikaza, a ton asistenta se menja (drugarski / strog / podržavajući). Vidi [dva režima](#dva-ai-režima).
- 🏋️ **Trening i ishrana**: serije × ponavljanja × kilaža, grafikon napretka, automatski **lični rekordi 🎉**, gotovi splitovi, dnevni cilj proteina.
- 😴💰✅ **San, novac, navike**: „Legao / Ustao", prosek sna, predlog vremena spavanja; budžet po kategoriji sa upozorenjem na 80%; navike sa nizom dana.
- 🎮 **Motivacija**: XP, nivoi (Brucoš → Inženjer), nizovi 🔥, **PS5 vreme kao nagrada** za učenje (nikad zamerke zbog igranja).
- 🔔 **Podsetnici i pregled**: notifikacije pregledača + **izvoz u .ics**, pregled nedelje i meseca sa grafikonima.
- 💾 Izvoz/uvoz svih podataka (JSON, bez API ključa), tamna tema, prečice na tastaturi (`N`, `T`, `W`, `/`, `?`).

### Dva AI režima
| | 📋 Ručni (podrazumevan) | 🤖 API |
|---|---|---|
| Cena | besplatno | plaća se po upotrebi (prikazana procena potrošnje) |
| Kako | „Kopiraj za Claude" → nalepiš u [claude.ai](https://claude.ai) → odgovoriš na 3–5 pitanja → nalepiš JSON nazad | jedan klik, poziv ide direktno iz pregledača |
| Kod | **isti** prompt, **ista** `zod` provera i **isti** prikaz | |

Ručni režim služi za svakodnevnu upotrebu (besplatno), a API za automatizaciju i demo. Ključ se čuva **samo lokalno** u pregledaču tog uređaja; vidljiv je u alatima pregledača, zato ga nikome ne deli i postavi mesečni limit u Anthropic konzoli.

### Podsetnici: šta radi, a šta ne
Nema servera, pa notifikacije na telefonu rade pouzdano samo dok je aplikacija otvorena ili nedavno korišćena. Zato postoji **izvoz u .ics**: uvezi ga u kalendar telefona i on će sam podsećati.

### Tehnologije (i zašto)
| Alat | Zašto |
|---|---|
| Vite + React 18 + TypeScript (strict) | brz razvoj, komponente, tipovi hvataju greške pre pokretanja |
| Tailwind CSS | konzistentan dizajn, tamna tema, mobile-first |
| Zustand + IndexedDB (`idb-keyval`) | jednostavno stanje koje preživi zatvaranje aplikacije, bez servera |
| React Router (hash) | radi na statičkom hostingu (GitHub Pages) |
| date-fns (`sr-Latn`) | datumi na srpskom, nedelja počinje ponedeljkom |
| Recharts | grafikoni |
| zod | provera AI odgovora (model može da vrati loš JSON) |
| Vitest + Testing Library, Playwright + axe | unit, komponentni i e2e testovi, provera pristupačnosti |
| vite-plugin-pwa | instalacija na telefon i rad offline |

### Pokretanje
```bash
npm install
npm run dev          # http://localhost:5173 (i adresa za telefon na istoj Wi-Fi mreži)
```
### Testovi
```bash
npm run lint && npm run typecheck
npm test                 # unit + komponente (Vitest)
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
  lib/                čista logika bez React-a (testirana)
    quickParse.ts     brzi unos rečenicom
    planner.ts        planWeek()
    schedule.ts       šta je na rasporedu, upozorenja
    grades.ts exams.ts workout.ts life.ts xp.ts overview.ts ...
    ai/               prompt, klijent, izvlačenje JSON-a, zod šeme (API i ručni režim)
  pages/              ekrani
  components/         zajednički UI
e2e/                  Playwright testovi
docs/                 ARHITEKTURA.md, HUAWEI.md, screenshots/
```
Detalji: [docs/ARHITEKTURA.md](docs/ARHITEKTURA.md). Istraživanje Huawei sata: [docs/HUAWEI.md](docs/HUAWEI.md).

### Objava na GitHub Pages
Workflow `.github/workflows/deploy.yml` je već u projektu. Da se stranica uključi, **jednom** uradi ovo u GitHub-u:
1. Otvori repozitorijum → **Settings** (zupčanik gore desno).
2. Levo klikni **Pages**.
3. Pod **Build and deployment → Source** izaberi **GitHub Actions**.
4. Posle sledećeg push-a na `main` (ili **Actions → Deploy to GitHub Pages → Run workflow**) stranica je na `https://vukasin-knezevic.github.io/my-day-ai/`.

### Licenca
MIT, vidi [LICENSE](LICENSE).

---

## English

> I conceived and designed this app; I wrote the code with Claude Code.

**My Day AI** is a personal day planner for a university student: classes, exams, workouts, nutrition, sleep, money and habits in one place. It is a mobile-first PWA that installs on a phone or laptop and works offline (except the AI part).

### The problem
A student juggles lectures, exams with registration deadlines, gym, gaming and sleep scattered across calendars and chats. The most common and costly mistake is simple: **forgetting to register for an exam**. The app puts that in red on the first screen and builds the rest of the day around the obligations.

### Features
- 🌅 **Today**: day timeline from wake-up to bedtime, one-click done/skip, alerts (unregistered exam, deadline tomorrow, low sleep) and a **one-line quick entry** ("tomorrow study math 2h", "coffee 200", "went to bed 1:30"), works without AI.
- 📚 **University**: subjects, weekly timetable with a **going / not going / sometimes** question per slot (skipped slots become free time), exams with colored countdown, **registration checklist**, a "November: registrations" review, points and grade estimate.
- 🧠 **Rule-based planner** (`planWeek`): study blocks before exams (harder and closer = earlier and more), max 2 h blocks with breaks, nothing before wake-up or after bedtime, at least one easy day, shortened workout on the exam eve (with an explanation), games as a reward. Suggestions have a dashed border until accepted.
- 🤖 **AI (Claude)**: day/week plan, chat, weekly summary, smart entry, exam schedule import from pasted text, workout plan. Every answer is **validated with `zod`** before it is shown; the assistant's tone adapts (friendly / strict / supportive).
- 🏋️ **Workouts & nutrition**: sets × reps × weight, progress chart, automatic **personal records**, ready-made splits, daily protein goal.
- 😴💰✅ **Sleep, money, habits**, 🎮 **XP, levels, streaks and PS5 time as a reward**, 🔔 **reminders + .ics export**, 📊 **week/month overview**, 💾 **JSON export/import**, dark theme, keyboard shortcuts.

### Two AI modes
**Manual (default, free):** "Copy for Claude" builds a prompt with your week's data → paste it into claude.ai → answer 3–5 questions → paste the JSON reply back. **API:** one click, called directly from the browser. Both use the **same** prompt builder, **same** `zod` validation and **same** preview. The API key is stored **only on your device** (visible in browser dev tools; never share it, set a spend limit in the Anthropic console).

### Reminders: honest limits
No server means browser notifications on a phone only work reliably while the app is open or recently used. Export the **.ics** calendar and import it into your phone's calendar for dependable reminders.

### Tech stack
Vite, React 18, TypeScript (strict), Tailwind CSS, Zustand + IndexedDB, React Router (hash), date-fns (`sr-Latn`), Recharts, zod, Vitest + Testing Library, Playwright + axe, vite-plugin-pwa.

### Run & test
```bash
npm install && npm run dev
npm run lint && npm run typecheck && npm test
npx playwright install chromium && npm run e2e
```

### Deployment
GitHub Pages deploys via the workflow in `.github/workflows/deploy.yml`. Enable once under **Settings → Pages → Build and deployment → Source: GitHub Actions**.

### License
MIT.
