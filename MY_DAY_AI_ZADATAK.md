# Zadatak za Claude Code: „My Day AI"

> **Kako da koristiš:** napravi prazan folder `C:\Projekti\my-day-ai`, stavi ovaj fajl u njega, pokreni Claude Code u tom folderu i napiši:
> **„Pročitaj MY_DAY_AI_ZADATAK.md i uradi ceo zadatak samostalno, faza po fazu."**

---

## 0. Ko sam ja

- Student **prve godine ETF-a u Beogradu**.
- Znam **osnove Pythona**, web programiranje (HTML, CSS, JavaScript) **ne znam**. Zato sve objašnjavaj od nule i piši jednostavan, čitljiv kod.
- **Nemam Node.js ni GitHub nalog** (vidi fazu 0).
- Ustajem između 8 i 10, ležem između ponoći i 2h.
- Treniram u teretani (ranije dugo košarka). Igram igre na PS5.
- Nosim sat **Huawei Watch GT 6 Pro** sa Huawei Health aplikacijom na telefonu.
- Ovo je **moj prvi projekat za portfolio**. Mora biti čist, sa testovima i dobrim README-om, i moram umeti da ga objasnim na razgovoru za praksu.

## 1. Pravila rada (VAŽNO)

1. **Radi samostalno**, faza po fazu. Pitaj me samo kad nešto zaista ne može dalje (npr. treba mi da nešto instaliram ili da se negde prijavim).
2. Prvo napravi **PLAN.md** sa svim fazama i štikliraj ih kako ih završavaš.
3. Posle **svake faze**: `npm run lint`, `npm run typecheck`, `npm test`. Ako nešto ne prolazi, popravi pre sledeće faze.
4. Posle svake faze **git commit** u stilu Conventional Commits (`feat:`, `fix:`, `test:`, `docs:`).
5. Posle svake faze dopiši u **DNEVNIK.md** 3–5 rečenica na srpskom, jednostavnim jezikom: šta si napravio i šta sam time naučio. To je moj materijal za učenje.
6. **Ne izmišljaj moje podatke.** Ne znaš moje predmete, raspored ni rokove. Koristi **demo podatke** jasno označene kao primer („Matematika 1 (primer)") i dugme „Obriši demo podatke".
7. Ako za nešto nisi siguran (npr. kako radi neki API), napiši to u IZVESTAJ.md umesto da nagađaš.
8. **API ključ nikad ne sme da završi u kodu ni u git-u.** Dodaj `.env*` u `.gitignore`.
9. Mogu da stanem posle bilo koje faze i nastavim sutra. Zato svaka faza mora ostaviti aplikaciju koja **radi**.
10. **Maksimalna automatizacija:** ja igram na PS5 i ne gledam stalno u ekran. Ne čekaj moju potvrdu za stvari koje možeš sam da rešiš. Ako nešto zapne, probaj drugi način pre nego što me pitaš. Kad stvarno moraš da me pitaš, napiši pitanje **krupno, na vrhu, jednom rečenicom**.

## 1b. GitHub (već napravljeno)

- Prazan javni repozitorijum već postoji: **https://github.com/vukasin-knezevic/my-day-ai.git** (GitHub nalog: `vukasin-knezevic`).
- U fazi 0, posle `git init`:
  - podesi `git config user.name "Vukašin Knežević"`,
  - za `user.email` koristi GitHub privatni noreply mejl: `241362614+vukasin-knezevic@users.noreply.github.com` (moj pravi mejl je namerno sakriven),
  - napravi granu `main` i dodaj remote `origin` na adresu iznad.
- **Posle svake faze**, kad testovi prođu i napraviš commit, uradi `git push origin main`.
- Prvi `push` će otvoriti prozor za prijavu na GitHub (Git Credential Manager). Tad mi krupno napiši: **„Prijavi se na GitHub u prozoru koji je iskočio"** i sačekaj. Posle toga push radi sam.
- Nikad ne koristi `git push --force` i ne briši istoriju.
- `.claude/settings.local.json` mora biti u `.gitignore` (moja lična podešavanja, ne idu na GitHub).
- Ne menjaj podešavanja repozitorijuma na GitHub-u (GitHub Pages i Actions podesi samo kroz fajlove u projektu).

## 2. Tehnologije

- **Vite + React 18 + TypeScript** (strict)
- **Tailwind CSS**
- **Zustand** sa `persist` u **IndexedDB** (preko `idb-keyval`), sve u try/catch
- **React Router** (hash router)
- **date-fns** sa `sr-Latn` locale-om, nedelja počinje ponedeljkom
- **Recharts** za grafikone
- **Vitest + React Testing Library**, **Playwright** za e2e (Chromium)
- **ESLint + Prettier**
- **vite-plugin-pwa**: aplikacija se instalira na telefon i laptop i radi offline (osim AI dela)
- **Anthropic API** direktno iz pregledača (vidi fazu 8)

## 3. Izgled

- **Čist i miran.** Svetla i tamna tema (prati sistem, uz ručni prekidač).
- Boje po kategoriji, svuda iste:
  - 📚 Faks i učenje: plava
  - 🏋️ Trening: narandžasta
  - 😴 San i odmor: ljubičasta
  - 🎮 Igre: zelena
  - 🍗 Ishrana: crvena
  - 💰 Novac: žuta
  - ✅ Navike: tirkizna
- Emotikoni za brzu preglednost, ali bez gužve.
- **Mobile-first**: prvo mora savršeno da radi na telefonu (390 px), pa na laptopu. Na telefonu donja navigacija, na laptopu bočna.
- Sav tekst u aplikaciji na **srpskom (latinica)**. Kod i komentari na engleskom.

---

## FAZA 0 — Priprema mog računara

Proveri `node -v`, `npm -v` i `git --version`.
- Ako nešto fali, pokušaj instalaciju preko `winget` (Node.js LTS, Git) i traži mi dozvolu.
- Ako ne može automatski, napiši mi **SETUP.md**: tačni koraci sa linkovima, za Windows.
- Napiši mi i kratko uputstvo kako da napravim **GitHub nalog** i kako da posle gurnem projekat (ali ti ništa ne guraj).

## FAZA 1 — Osnova i model podataka

Tipovi u `src/types.ts`, čista logika (bez React-a) u `src/lib/`.

- **Subject (predmet):** naziv, boja, ESPB, termini predavanja i vežbi po danima, **„idem / ne idem / ponekad"** za svaki termin.
- **Assessment (kolokvijum / ispit / domaći / lab vežba):** predmet, tip, datum i vreme, **rok za prijavu**, **status prijave** (nije prijavljen / prijavljen / ne treba prijava), maks. poena, osvojeni poeni, težina 1–5, procena sati učenja.
- **Activity:** naslov, kategorija, datum, početak, kraj, ponavljanje, status (planirano / urađeno / preskočeno), izvor (ja / AI predlog).
- **Workout:** datum, tip, trajanje, vežbe (naziv, serije, ponavljanja, kilaža), osećaj 1–5.
- **WorkoutPlan:** plan po danima (pravi ga AI, faza 8).
- **SleepLog:** legao, ustao, kvalitet 1–5, izvor (ručno / uvoz sa sata).
- **Meal:** datum, opis, proteini (g), kalorije opciono.
- **Expense:** datum, iznos (RSD), kategorija (hrana, prevoz, igre, faks, izlasci, ostalo), opis. **Budget:** mesečni limit po kategoriji.
- **Habit:** naziv, emotikon, cilj (npr. 2 L vode, 20 min čitanja), dnevni unosi.
- **GameSession:** datum, igra, trajanje.
- **Progress:** XP, nivo, nizovi dana, zarađeno i potrošeno PS5 vreme.
- **Settings:** buđenje, spavanje, ciljevi, tema, AI ključ i model, podsetnici.

Napravi **onboarding** od 5 koraka pri prvom otvaranju: ime, ritam dana, ciljevi, predmeti (može kasnije), AI ključ (može kasnije).

## FAZA 2 — 🌅 Ekran „Danas"

- Datum, dan, jedna rečenica dana („Danas: 2 vežbe, trening i 2 h učenja").
- **Vremenska linija dana** od buđenja do spavanja, blokovi u bojama.
- Trenutna aktivnost istaknuta, odbrojavanje do sledeće.
- „Urađeno" / „Preskoči" jednim klikom (daje XP, vidi fazu 7).
- **Kartica upozorenja na vrhu** kad nešto gori: neprijavljen kolokvijum, rok sutra, malo sna.
- Brzi unos u jednom polju (bez AI-ja radi osnovni parser, sa AI-jem pametniji, faza 8):
  „trening 18-19:30", „sutra učenje mata 2h", „kafa 200", „legao 1:30".
  Parser napiši u `src/lib/quickParse.ts` sa **bar 25 testova** (danas, sutra, prekosutra, dani u nedelji, 18h, 18:30, 18-19:30, iznosi u dinarima).

## FAZA 3 — 📚 Faks

- Unos predmeta i nedeljnog rasporeda.
- **Kad unesem sve termine, aplikacija me pita za svaki: idem / ne idem / ponekad.** Termini „ne idem" se prikazuju kao **slobodno vreme** koje planer može da iskoristi. Termini „ponekad" pitaju me jednom nedeljno (nedelja uveče) za sledeću nedelju.
- **Kolokvijumi i ispiti:**
  - Lista sa odbrojavanjem i bojom po hitnosti.
  - **Čeklista prijava:** za svaki kolokvijum „Da li si prijavio?". Neprijavljeni sa rokom za prijavu u narednih 7 dana idu crveno na ekran „Danas".
  - Posebna provera „**Novembar: prijave**" koja izlista sve kolokvijume u tekućem mesecu i njihov status prijave.
  - Uvoz teksta: nalepim raspored kolokvijuma sa sajta fakulteta, a AI izvuče datume (faza 8). Bez AI-ja ručni unos.
- **Domaći i lab vežbe:** rokovi predaje, status.
- **Poeni i ocene:** po predmetu osvojeni poeni / maksimum, koliko fali do prolaza (granicu prolaza unosim ja, podrazumevano 51) i procena ocene po skali 51–60 = 6, 61–70 = 7, 71–80 = 8, 81–90 = 9, 91–100 = 10. Logiku testiraj.

## FAZA 4 — 🧠 Planer (bez AI-ja, osnova)

`src/lib/planner.ts`, čista funkcija `planWeek()`, **bar 20 testova**:
- Predlaže blokove učenja pre kolokvijuma, raspoređene kroz više dana.
- Teži i bliži rok = više učenja ranije.
- Najviše 3 h učenja zaredom, pa pauza.
- Ništa pre buđenja ni posle spavanja.
- Dan pred kolokvijum trening se pomera ili skraćuje, uz objašnjenje.
- Bar jedan lakši dan u nedelji.
- Koristi termine „ne idem" kao slobodno vreme.
- Igre predlaže kao nagradu posle učenja.
- Predlozi imaju isprekidanu ivicu dok ih ne prihvatim.

Ovaj planer radi uvek. AI (faza 8) ga samo nadograđuje.

## FAZA 5 — 🏋️ Trening i 🍗 ishrana

- Detaljan unos: vežbe, serije, ponavljanja, kilaža. Šabloni treninga.
- Grafikon kilaže po vežbi, **lični rekordi** automatski uz 🎉.
- Nedeljni broj treninga u odnosu na plan.
- **Plan treninga pravi AI** (faza 8) na osnovu mog cilja, iskustva i rasporeda faksa. Bez AI-ja ponudi 3 gotova splita (3x full body, 4x gornji/donji, 5x push/pull/noge).
- **Ishrana:** brz unos obroka i proteina, dnevni cilj proteina (unosim ja), traka napretka. Bez brojanja kalorija ako ne želim.

## FAZA 6 — 😴 San, 💰 novac, ✅ navike

- **San:** dugmad „Legao" i „Ustao" (dva klika), prosek 7 dana, grafikon, predlog vremena za spavanje prema sutrašnjoj prvoj obavezi.
- **Huawei sat:** istraži realno šta je moguće i napiši u `docs/HUAWEI.md`:
  - Da li Huawei Health može da izveze podatke o snu (npr. preko zahteva za kopiju podataka Huawei naloga ili sinhronizacije sa drugom aplikacijom) i u kom formatu.
  - Da li Huawei Health Kit može da se koristi iz web aplikacije bez servera.
  - Ako postoji fajl za izvoz, napravi **uvoz tog fajla** u aplikaciju. Ako ne postoji jednostavan način, ostavi ručni unos i jasno napiši zašto, sa planom za verziju 2. **Ne izmišljaj format fajla.**
- **Novac:** unos troškova u dinarima, mesečni budžet po kategoriji, upozorenje na 80% budžeta, grafikon po kategorijama.
- **Navike:** dodam svoje (voda, čitanje, šetnja…), štikliram dnevno, niz dana.

## FAZA 7 — 🎮 Motivacija

- **XP i nivoi:** urađena obaveza daje XP (učenje 10 XP na 30 min, trening 30, prijavljen kolokvijum 20, navika 5…). Nivoi sa imenima (npr. Brucoš → Student → … → Inženjer). Testiraj računanje.
- **Nizovi dana** 🔥 za učenje, trening, san i navike.
- **PS5 vreme kao nagrada:** svaki sat učenja zarađuje npr. 30 min igranja (podesivo). Prikaz „zarađeno / potrošeno". Nikad ne grdi zbog igranja.
- Male proslave za rekorde i nizove.

## FAZA 8 — 🤖 AI deo (Claude API)

- U podešavanjima nalepim **svoj Anthropic API ključ**. Čuva se **samo lokalno** na mom uređaju. Dodaj jasno upozorenje da je ključ vidljiv u pregledaču tog uređaja i da ga ne delim.
- Pozivi idu direktno iz pregledača na Anthropic Messages API (sa zaglavljem koje dozvoljava poziv iz pregledača). Proveri u zvaničnoj dokumentaciji tačne nazive modela i zaglavlja pre pisanja koda.
- Izbor modela u podešavanjima: brži i jeftiniji model za unos tekstom, jači za planiranje.
- Prikaži **procenu potrošnje** (tokeni po pozivu i ukupno ovog meseca).
- Sve AI funkcije imaju **rezervu bez AI-ja** kad nema ključa ili interneta.

AI funkcije:
1. **AI plan dana / nedelje:** šalje moje obaveze, rokove, ciljeve i san; vraća strukturisan JSON plan koji aplikacija proveri (validacija sa `zod`) pre prikaza kao predlog.
2. **Chat asistent:** „Šta da radim sad?", „Kako da stignem sve do petka?". Vidi moje podatke za tekuću nedelju.
3. **Rezime nedelje:** svake nedelje uveče kratak rezime i 3 saveta.
4. **Pametan unos tekstom:** „sutra posle vežbi teretana pa učim OS 2 sata" → aktivnosti.
5. **Uvoz rasporeda kolokvijuma** iz nalepljenog teksta.
6. **Plan treninga** po mom cilju i rasporedu.

**Ton asistenta** (stavi u sistemski prompt):
- **Drugarski i kratak** kad je sve u redu.
- **Strog**, direktno i bez izgovora, kad preskačem obaveze, kad je neprijavljen kolokvijum ili rok blizu.
- **Smiren i podrška** kad sam umoran, kad malo spavam ili kad je teška nedelja.
- Uvek na srpskom, sa emotikonima, kratko.

Testiraj AI deo **bez pravih poziva** (mock odgovora), uključujući neispravan JSON.

### 8b. 📋 Ručni AI mod (besplatno, bez API ključa)
Svakodnevno ću koristiti ovaj mod, a API samo povremeno i za demo. Zato mora biti jednostavan i brz.

- Prekidač u podešavanjima: **AI režim: API / Ručni**. Ručni je podrazumevan kad nema ključa.
- Za svaku AI funkciju (plan dana, plan nedelje, rezime, uvoz kolokvijuma, plan treninga) dugme **„📋 Kopiraj za Claude"**:
  - napravi gotov tekst (prompt) na srpskom sa mojim podacima za tekuću nedelju, sa istim pravilima i tonom kao sistemski prompt,
  - na kraju prompta zamoli Claude-a da mi **prvo postavi 3–5 kratkih pitanja** (kako sam spavao, kako se osećam, da li idem na predavanja, šta je hitno), pa tek onda vrati plan,
  - i da na kraju vrati **JSON u bloku koda** po tačnoj šemi (šemu uključi u prompt).
- Polje **„📥 Nalepi odgovor"**: nalepim ceo odgovor iz chata, aplikacija sama pronađe JSON blok, proveri ga istom `zod` šemom i prikaže kao predlog. Ako JSON ne valja, jasna poruka šta da tražim od Claude-a.
- Isti kod za proveru i prikaz koristi i API i ručni mod (jedan zajednički sloj, npr. `src/lib/ai/`), da ne bude dupliranja.
- Dugme koje otvara claude.ai u novom tabu.
- Testovi: generisanje prompta, pronalaženje JSON-a u tekstu sa dosta priče oko njega, neispravan JSON, prazno.
- U README-u objasni oba režima i zašto postoje (besplatno svakodnevno, API za automatizaciju).

## FAZA 9 — 🔔 Podsetnici i 📊 pregled

- **Podsetnici:** notifikacije pregledača (Notification API) pre predavanja, roka, roka za prijavu i vremena za spavanje.
  - Napiši iskreno u README-u šta radi a šta ne: bez servera, notifikacije na telefonu rade pouzdano samo dok je aplikacija otvorena ili nedavno korišćena.
  - Zato dodaj i **izvoz u .ics** (kalendar), pa telefon sam podseća preko kalendara.
- **Pregled nedelje:** sati po kategoriji, ciljevi, nizovi, troškovi, prosečan san, XP. Grafikoni.
- **Pregled meseca:** isto, plus poeni po predmetima.

## FAZA 10 — ⚙️ Podaci i kvalitet

- Izvoz i uvoz svih podataka kao JSON (dugme „Kopiraj", polje za lepljenje i preuzimanje fajla).
- Brisanje svega uz potvrdu unutar stranice (bez `confirm()`).
- **Pristupačnost:** sva dugmad imaju tekst ili `aria-label`, fokus se vidi, kontrast AA, radi tastaturom.
- **Responsive:** 390 px, ~800 px i 1920 px.
- **Prečice:** N nova stavka, T danas, W nedelja, / brzi unos, ? lista prečica.
- **Playwright e2e** (bar 10): onboarding, brzi unos, „idem / ne idem", neprijavljen kolokvijum na ekranu Danas, dodavanje treninga i rekord, trošak preko budžeta, XP posle „urađeno", podaci posle reload-a, izvoz/uvoz, tamna tema.
- **Pokrivenost** `src/lib/` bar 80%.
- Screenshot-ovi u `docs/screenshots/` (telefon i laptop, svetla i tamna tema).
- `npm run build` bez upozorenja.

## FAZA 11 — 🗂️ Portfolio

- **README.md na srpskom i engleskom:** problem koji rešava, screenshot-ovi, funkcije (posebno planer i AI), tehnologije i zašto, kako se pokreće, kako se pokreću testovi, struktura foldera, i rečenica: *„Aplikaciju sam osmislio i dizajnirao ja, a kod sam pisao uz Claude Code."*
- `docs/ARHITEKTURA.md` sa Mermaid dijagramom toka podataka.
- `LICENSE` (MIT).
- GitHub Actions: lint, typecheck, unit i e2e testovi.
- Pripremi objavu na **GitHub Pages** (vite `base` = `/my-day-ai/` i workflow za deploy). U README napiši mi tačno koje dugme da kliknem u GitHub podešavanjima da se stranica uključi.

## FAZA 12 — Završetak

1. Pokreni `npm run dev` i javi mi tačan link, i link za telefon na istoj Wi-Fi mreži.
2. **IZVESTAJ.md:** šta je urađeno, šta nije, poznati problemi.
3. **UCENJE.md** za mene (znam samo osnove Pythona):
   - šta su React, TypeScript i komponenta, poređenjem sa Pythonom,
   - redosled fajlova za čitanje (počni od `types.ts`, `planner.ts`, `quickParse.ts`),
   - 10 pitanja sa razgovora za praksu o ovom projektu, sa kratkim odgovorima.
4. 5 ideja za verziju 2 (sinhronizacija između uređaja, Google kalendar, Huawei integracija, server za push notifikacije…).
