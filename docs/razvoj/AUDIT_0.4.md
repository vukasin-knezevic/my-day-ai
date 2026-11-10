# QA audit pre update-a 0.4

Stanje: `main` na `2c775f8`, verzija 0.3.1, pregled urađen 10. 11. 2026. Kod aplikacije nije menjan. Ovaj fajl je ulaz za `ZADATAK_0.4.md`.

## 1. Šta je i kako provereno

| Provera                             | Rezultat                                                                                      |
| ----------------------------------- | --------------------------------------------------------------------------------------------- |
| `npm run lint`, `npm run typecheck` | čisto                                                                                         |
| `npm run test:coverage`             | 1948 testova prolazi, 97% linija u `src/lib`                                                  |
| `npm run build`                     | bez upozorenja; glavni paket 660 kB (201 kB gzip)                                             |
| Učitavanje svih ekrana              | 3 pregledača × 9 veličina × 9 ekrana = 243 učitavanja, 0 JavaScript grešaka                   |
| Horizontalni skrol                  | nema (jednom 16 px na ekranu Život, 360 px, Chromium, dok se grafikon crta; nije se ponovilo) |
| Offline posle prve posete           | radi u sva tri pregledača, uključujući ekrane koji se učitavaju naknadno                      |
| Ciljane provere ponašanja (skripte) | vidi nalaze ispod; uz svaki piše da li je potvrđen pokretanjem ili samo čitanjem koda         |
| Čitanje koda                        | ceo `src/` (stranice, komponente, `lib`, AI sloj, prevodi), `index.html`, PWA podešavanja, CI |
| Istorija i dokumenti                | 79 commit-a, PR #1–#6, README, IZVESTAJ, `docs/`, rezime projekta sa primedbama testera       |

Pregledači: Chromium, WebKit i Firefox (Playwright 1.65). Veličine: 320×568, 360×740, 390×844, 430×932, 844×390 (položen telefon), 768×1024, 1024×768, 1366×768, 1920×1080.

**Šta ovim nije pokriveno (pošteno):**

- **Pravi iPhone nije moguć.** WebKit u Playwright-u na Windows-u nije iOS Safari: nema notch ni donju traku, nema režim „sa početnog ekrana“, nema share sheet, prave notifikacije ni tastaturu na dodir. Sve iOS stavke ispod označene su „proveriti na pravom iPhone-u“ (Andrea).
- Pravi Android telefon nisam držao u ruci: Chromium sa telefonskim profilom ne pokazuje sistemske trake, pravu instalaciju ni prave notifikacije.
- Firefox je proveren kao desktop pregledač sa telefonskom veličinom prozora, ne kao Firefox za Android.
- AI sa pravim API ključem i dalje nije proban. Čitač ekrana nije ručno testiran.

## 2. Nalazi po prioritetu

Oznake: **P0** gubitak podataka ili loš prvi utisak za svakog novog korisnika, **P1** važna greška ili rupa u ponašanju, **P2** kvalitet, pristupačnost, izgled, **P3** sitnice. „Potvrđeno“ znači da sam ponašanje izazvao u pregledaču; „iz koda“ znači da je zaključak iz čitanja koda.

### P0

**A-01. „Novi update 90%“ ostaje zauvek pri prvoj poseti.** Potvrđeno u sva tri pregledača: posle 25 s i dalje „Preuzima se nova verzija… 90%“, nestaje tek posle ponovnog učitavanja. Svaki novi korisnik (i svaki tester) to vidi kao prvu stvar.

- Gde: `src/lib/updates.ts:51-58`. Prva instalacija service worker-a takođe šalje `updatefound`, pa `startProgress()` krene, a `setReady()` se zove samo ako već postoji `navigator.serviceWorker.controller`, kojeg pri prvoj instalaciji nema.
- Popravka: u `watch` izaći odmah ako nema `navigator.serviceWorker.controller` (prva instalacija nije update). Test u `UpdateBanner.test.tsx` i e2e: posle prve posete poruke nema.

**A-02. Neuspelo čitanje iz IndexedDB izgleda kao „nema podataka“ i onda se pravi podaci prepišu.** Iz koda (nije izazvano, traži pokvaren IndexedDB; poznato je da se na iOS-u veza sa bazom ponekad izgubi posle povratka iz pozadine).

- Gde: `src/lib/storage.ts:6-13` (greška se hvata i vraća se `null`), `src/store.ts:227-229` (`hydrated: true` i posle greške; to `setState` odmah upisuje prazno stanje), `src/App.tsx:40-41` (prikaže se uvod).
- Popravka: `getItem` neka baci grešku; `onRehydrateStorage: () => (state, error)` čuva `hydrationError`; `App` tada prikazuje „Podaci nisu mogli da se učitaju“ sa dugmetom „Pokušaj ponovo“ i ništa ne upisuje. `setItem` ne sme da piše pre uspešnog učitavanja. Test sa `fake-indexeddb` koji baca grešku.

**A-03. Podaci nisu zaštićeni od brisanja koje radi sam pregledač, a iPhone korisnik to ne zna.** Iz koda i poznatih pravila platformi.

- Nigde se ne zove `navigator.storage.persist()`, pa je skladište „po mogućstvu“ i Android ga sme obrisati kad ponestane prostora.
- Safari na iPhone-u briše podatke sajta posle 7 dana bez korišćenja ako aplikacija nije dodata na početni ekran. Podaci uneti u Safari kartici se **ne prenose** u aplikaciju sa početnog ekrana (odvojeno skladište). Kartica za instalaciju (`src/components/IosInstallHint.tsx:7-25`) se ne prikazuje tokom uvoda (`src/App.tsx:41`), pa tester prvo unese sve u Safariju.
- Popravka: posle uvoda pozvati `navigator.storage.persist()`; na iOS-u u Safariju prikazati instalaciju **pre** uvoda uz rečenicu da se podaci iz Safarija ne prenose; u Podešavanjima datum poslednje rezervne kopije i blag podsetnik jednom nedeljno. Proveriti na pravom iPhone-u.

**A-04. Kolokvijum bez unetog roka za prijavu nikad ne daje upozorenje „Neprijavljen“.** Potvrđeno: kolokvijum bez roka, na ekranu Danas nema crvenog upozorenja (najviše „je danas/sutra“ dan pre). README kaže da je baš to glavni problem koji aplikacija rešava, a rok je u formi opcion.

- Gde: `src/lib/schedule.ts:197` i `src/lib/reminders.ts:36` (uslov traži `registrationDeadline`).
- Popravka: kad roka nema, računati podrazumevani (npr. 7 dana pre datuma) i pisati „rok nije unet, proveri na sajtu fakulteta“; u formi uz polje kratko objašnjenje. Testovi u `schedule.test.ts` i `reminders.test.ts`.

### P1

**A-05. Jedan trening se plaća dva puta, a brojači se ne slažu.** Potvrđeno: aktivnost „Trening“ označena kao urađena daje 30 XP, zatim unos istog treninga na ekranu Trening još 30 XP; „Ove nedelje: 1 / 4“ broji samo unos, niz 🔥 broji oba, planer broji samo aktivnosti.

- Gde: `src/pages/Today.tsx:130-143`, `src/pages/Workout.tsx:101-128`, `src/lib/xp.ts:206-211`, `src/lib/planner.ts:292-300`, `src/lib/overview.ts:72-75`.
- Popravka (zajedno sa stavkom „Novi trening“ iz rezimea): trening je jedna stvar. Zakazan trening je aktivnost; unos vežbi se vezuje za nju (`Workout.activityId`), označava je kao urađenu i postoji jedan XP id po treningu. Svi brojači čitaju isti izvor.

**A-06. Vidi se samo današnji dan.** Iz koda: `src/pages/Today.tsx:113-116` koristi samo `today`. Aktivnost uneta za sutra („sutra učenje mata 2h“) ne može da se vidi, izmeni ni obriše do sutra, a jučerašnja ne može naknadno da se označi.

- Popravka: izbor dana na vrhu ekrana Danas (‹ juče · danas · sutra ›, traka sa 7 dana, prevlačenje levo/desno), sve ostalo na ekranu prati izabrani dan.

**A-07. Brisanje jednim dodirom, bez potvrde i bez „Poništi“.** Potvrđeno za obavezu (kolokvijum nestane odmah). Isto važi za: obavezu `src/pages/Study.tsx:585-591`, trening `src/pages/Workout.tsx:373-379`, obrok `src/pages/Workout.tsx:512-518`, naviku sa celom istorijom `src/pages/Life.tsx:368-375`, trošak `src/pages/Life.tsx:290-296`, jednokratnu aktivnost `src/pages/Today.tsx:297-305`, „Odbaci sve“ `src/pages/Planner.tsx:120-125`.

- Popravka: jedno zajedničko „Obrisano · Poništi“ (6 s) za sva brisanja; `remove` u `src/store.ts:110-119` vraća obrisanu stavku i skinuti XP da bi poništavanje vratilo oba.

**A-08. „Sigurno?“ ostaje aktivno na iPhone-u.** Potvrđeno u WebKit-u: posle prvog dodira na „Obriši predmet“ i dodira negde drugde dugme i dalje čeka potvrdu (u Chromium-u i Firefox-u se vrati). WebKit ne daje fokus dugmetu na dodir, pa `onBlur` nikad ne stigne.

- Gde: `src/components/ConfirmButton.tsx:27`.
- Popravka: vraćanje posle 4 s i na `pointerdown` van dugmeta. Proveriti na pravom iPhone-u.

**A-09. iPhone: sadržaj prolazi ispod sata i baterije pri skrolovanju** (prijavila Andrea). Ne može da se izazove u Playwright-u.

- Gde: `src/index.css:19` (razmak je na `body`, pa se skroluje zajedno sa sadržajem), `index.html:12`.
- Popravka: nepomična traka visine `env(safe-area-inset-top)` u boji pozadine iznad sadržaja (`position: fixed; top: 0; z-index` iznad stranice), ista stvar za poruke. Proveriti na pravom iPhone-u, uspravno i položeno.

**A-10. Notifikacije su nedovršene.** Iz koda.

- Dodir na notifikaciju ne otvara aplikaciju: service worker pravi `vite-plugin-pwa` u režimu `generateSW` (`vite.config.ts:20-41`) i nema `notificationclick`.
- Nema `tag`, pa se posle ponovnog otvaranja ista notifikacija ponovi (`src/lib/useReminders.ts:25`; spisak poslatih živi samo u memoriji, linija 42).
- Nema `badge`, pa je u statusnoj traci zvonce umesto loga (primedba iz rezimea).
- Tekst uvek koristi 24h bez obzira na podešavanje (`src/lib/reminders.ts:30`).
- Popravka: preći na `injectManifest` sa sopstvenim `src/sw.ts` (precache kao do sada + `notificationclick` koji vraća aplikaciju u prvi plan + osnova za dugmad u notifikaciji za jutarnju rutinu); `tag: r.id`; jednobojna bela ikonica 96×96; poslati id-jevi se pamte po danu.

**A-11. Brzi unos ne razume ćirilicu, a primer u polju je na ćirilici.** Potvrđeno sa jezikom „Српски (ћирилица)“: „легао 1:30“ postaje aktivnost „Легао 01:30–02:00“, „сутра учење мата 2h“ postaje aktivnost danas, a primer u polju piše „2ч“.

- Gde: `src/lib/quickParse.ts:31-38` (`normalize` ne prevodi ćirilicu), tekst primera `src/i18n/locales/sr-Latn.ts:351`.
- Popravka: `normalize` prvo zove `cyrillicToLatin` (`src/i18n/translit.ts:93`) i prihvata „ч“ kao „h“; testovi za sve primere iz polja na oba pisma.

**A-12. „legao 23:30“ upisano sutradan ujutru ne računa san.** Potvrđeno: u 09:00 „legao 23:30“ pa „ustao 8“ daje „Poslednji san (—)“ i prosek „—“.

- Gde: `src/lib/quickParse.ts:171-172` (prethodna noć se pretpostavlja samo pre 06:00).
- Popravka: ako je vreme leganja kasnije od trenutnog vremena, to je bilo juče. Uz to: san ne može da se izmeni ni obriše (`src/pages/Life.tsx:48-125` nema tu mogućnost), a zaboravljen klik na „Ustao“ ostavlja „Legao“ zauvek isključen. Dodati izmenu i brisanje unosa sna.

**A-13. „Nazad“ na Androidu napušta ekran umesto da zatvori panel.** Potvrđeno: sa otvorenim donjim panelom u Podešavanjima, Nazad vodi na Danas. Nema nikakvog rada sa istorijom (`src/components/Sheet.tsx`, `src/App.tsx:44`). Rešava se stavkom „Pametno Nazad“ iz rezimea.

**A-14. Rezervna kopija se na telefonu teško vraća.** Iz koda.

- Uvoz postoji samo kao lepljenje teksta (`src/pages/DataCard.tsx:70-81`); nema izbora fajla.
- Preuzimanje ide preko `a[download]` i odmah zove `URL.revokeObjectURL` (`src/lib/ics.ts:184-191`), što u Safariju ume da prekine preuzimanje; u instaliranoj aplikaciji na iPhone-u preuzimanje fajla je nepouzdano.
- Popravka: „Izaberi fajl“ (`<input type="file" accept="application/json">`), deljenje fajla kroz Web Share kao za kalendar, `revokeObjectURL` sa zadrškom. Ovo je i put kojim će se podaci preneti iz PWA u Android aplikaciju.

**A-15. Loš sačuvan podatak može da zaglavi aplikaciju na ekranu greške.** Iz koda: uvoz proverava liste, ali ne `progress` i `settings` (`src/lib/dataIO.ts:62-73`, `src/lib/defaults.ts:113-124`). Ako ekran padne zbog sačuvanih podataka, `ErrorBoundary` nudi samo „Učitaj ponovo“ i preuzimanje (`src/components/ErrorBoundary.tsx:20-45`), pa se pad ponavlja.

- Popravka: `zod` provera `progress` i `settings` pri uvozu i pri učitavanju (loše polje se zamenjuje podrazumevanim); u `ErrorBoundary` treće dugme „Obriši podatke i kreni ispočetka“ (aktivno tek posle preuzimanja kopije).

### P2

**A-16. Aktivnost posle ponoći ne postoji u modelu, a dan traje do 01:00.** Potvrđeno: „učenje 00:15-00:45“ se crta na vrhu vremenske linije, kod 09:00.

- Gde: forma odbija kraj pre početka `src/components/ActivityForm.tsx:40`; brzi unos seče na 23:59 `src/lib/quickParse.ts:279-280`; linija dana `src/pages/Today.tsx:53,72`; planer `src/lib/planner.ts:69,172`.
- Popravka: vreme pre buđenja tretirati kao „posle ponoći istog dana“ u prikazu i u „Trenutno/Sledeće“; kraj manji od početka znači sutradan (npr. izlazak 22:00–01:00).

**A-17. Opciono vreme ne može da se obriše kad se jednom izabere.** Iz koda: birač ima samo „Gotovo“ (`src/components/Pickers.tsx:191-200`); pogađa vreme obaveze (`src/pages/Study.tsx:669-675`). Popravka: „Obriši vreme“ u panelu kad je polje opciono.

**A-18. Tastatura i fokus u panelima.** Potvrđeno: Tab izlazi iz otvorenog donjeg panela na stranicu iza (`src/components/Sheet.tsx:50-65`, a panel ima `aria-modal`). Prečice N/T/W rade i dok je panel otvoren (`src/components/Shortcuts.tsx:34-58`). Popravka: zamka fokusa i `inert` na sadržaju iza; prečice isključene dok je otvoren dijalog.

**A-19. Fokus se ne vidi na polju za datum.** Iz koda: pravi `input` je providan (`src/components/Pickers.tsx:228-241`), a omotač nema `focus-within` (`src/components/styles.ts:2-3`). Popravka: `focus-within:outline` na omotaču.

**A-20. Stisnuto polje za štikliranje na uskim ekranima.** Potvrđeno u Chromium-u i Firefox-u na 320–430 px: kvadratić uz „Notifikacije pregledača…“ je 13–17 × 20 px.

- Gde: `src/pages/Settings.tsx:220-234` (`size-5` bez `shrink-0`); isti obrazac u `src/pages/Onboarding.tsx:216-224` i `src/pages/Study.tsx:512-538`.

**A-21. Male mete za dodir.** Potvrđeno merenjem: Idem / Ne idem / Ponekad su visoke 32 px (`src/pages/Study.tsx:292`), dugme sa XP-om 28 px (`src/components/ProgressCard.tsx:35`), kvadratići 20 px. Preporuka platformi je 44–48 px. Popravka: `min-h-11` i veći razmak.

**A-22. Red obaveze na ekranu Danas se lomi neuredno.** Potvrđeno na 320 px i na 844 px: „✔ Urađeno · Preskoči · ✎“ u jednom redu, „✕“ sam u sledećem (`src/pages/Today.tsx:243-318`). Popravka: dva uredna reda (vreme i naziv, pa glavno dugme) i „⋯“ koji otvara donji panel sa ostalim radnjama (izmeni, preskoči, samo danas, obriši).

**A-23. Prvo učitavanje je teško: 660 kB (201 kB gzip) u jednom fajlu.** Svih 7 jezika se učitava odmah (`src/i18n/index.ts:35`, `eager: true`), kao i Planer, AI, Podešavanja i Faks (`src/App.tsx:7-16`). Popravka: učitati samo izabrani jezik, ostale na zahtev; AI (sa `zod`), Podešavanja, Planer i uvod kao `lazy`. Cilj: početni paket ispod 120 kB gzip.

**A-24. Kalendar: celodnevni događaji zvone u ponoć.** Iz koda: rok za prijavu ima alarm „0 min pre“ celodnevnog događaja, a obaveza bez vremena „24 h pre“ (`src/lib/ics.ts:72-79,129,140`), što je 00:00. Popravka: za celodnevne događaje alarm u 09:00 tog dana i 09:00 dan ranije.

**A-25. Pregled meša planirano i urađeno.** `src/lib/overview.ts:20-37` broji i planirane sate kao „Učenje“, a „Treninzi“ ne broje urađene aktivnosti (linije 72-75). Popravka: prikazati „urađeno / planirano / cilj“ iz istog izvora kao XP.

**A-26. Tragovi lične verzije i sitne jezičke greške u opštoj aplikaciji** (`src/i18n/locales/sr-Latn.ts`, pa svi jezici):

- „Obično ustajem u (između 8 i 10)“ i „(između 00 i 02)“, linije 318-319; podrazumevano 09:00 i 01:00 u `src/lib/defaults.ts:8-9`.
- Poslednji nivo „Inženjer“ (linija 120) nije za sve fakultete; predlog „Diplomac“.
- „Notifikacije pregledača“ (266) zbunjuje u instaliranoj aplikaciji; „Novi kolokvijum / ispit / domaći / lab“ (513) posle prelaska na korisničke vrste; „Dodaj nešto gore“ (354), a brzi unos je sada ispod.
- AI uvoz i dalje traži `domaci|lab` (439), a `src/lib/ai/apply.ts:43` to upisuje kao vrstu bez naših slova.
- Ženski oblici fale: „Dobrodošao“ (301), „nisi prijavljen“ (91), „da bi sačuvao“ (565-566).

**A-27. AI pregled prikazuje sirove datume i vreme** (`2026-11-12 18:00`), ne format aplikacije: `src/pages/Ai.tsx:47-50,79-82`.

**A-28. Nagrada se troši samo po 30 ili 60 min;** ostatak ispod 30 ne može da se iskoristi (`src/components/ProgressCard.tsx:86-98`). Popravka: „Iskoristi…“ otvara izbor minuta do stanja.

**A-29. Navike i dugo otvoren ekran.** Korak je 0,5 ili 5 bez obzira na jedinicu (`src/pages/Life.tsx:393,404`), navika ne može da se izmeni, a `today` se računa samo pri otvaranju ekrana, pa unos posle ponoći na otvorenom ekranu ide u jučerašnji dan (`src/pages/Life.tsx:317`, `src/pages/Study.tsx:74`, `src/pages/Workout.tsx:73`).

**A-30. Troškovi:** vidi se samo poslednjih 15 (`src/pages/Life.tsx:279-282`) i ne može se uneti trošak za drugi dan.

**A-31. Podešavanja instalacije i deljenja linka.**

- Manifest: `lang: 'en'`, nema `id`, `scope`, `shortcuts` ni `screenshots`; ista slika za `any` i `maskable` ikonicu, pa proveriti da li je logo u bezbednoj zoni (`vite.config.ts:23-38`); PNG ikonice nisu u offline kešu (linija 40), pa notifikacija offline nema ikonu.
- `index.html` nema `meta description` ni Open Graph oznake, pa link u CV-ju ili poruci nema naslov, opis i sliku.
- Početni ekrani za iPhone pokrivaju veličine do iPhone 15 (`index.html:14-58`).

**A-32. Laptop i tablet imaju telefonski raspored u jednoj uskoj koloni** (`src/components/Layout.tsx:52,62`); na 1920 px većina ekrana je prazna, a položen telefon dobija bočni meni. Predlog: od 1024 px dve kolone na ekranu Danas (obaveze levo, linija dana i napredak desno).

**A-37. Izmena napravljena neposredno pre zatvaranja može da se izgubi.** Potvrđeno merenjem: zatvaranje ili ponovno učitavanje u istom trenutku posle izmene gubi izmenu u Chromium-u (0 od 5), posle 20 ms je sve sačuvano (5 od 5); WebKit 4 od 5 pri zatvaranju. Prozor je vrlo kratak, ali automatski restart za update (`src/lib/updates.ts:66`) može da ga pogodi.

- Popravka: pamtiti poslednji upis koji je u toku (`src/lib/storage.ts:14-20`) i sačekati ga pre `update(true)`; e2e test „izmena pa restart“.

### P3

- **A-33.** `DATA_VERSION = 2`, a u kodu već postoji migracija „v2 → v3“ (`src/lib/defaults.ts:54,85-110`); `persist` ima `version: 1` (`src/store.ts:220`). Uskladiti na 3 i dodati test.
- **A-34.** `src/lib/updates.ts` ima 25% pokrivenosti (i baš tu je A-01). E2E radi samo u Chromium-u i na iPhone profilu (`playwright.config.ts:18-30`); dodati kratak prolaz kroz ekrane za Firefox, tablet i 1920 px.
- **A-35.** Objava ne pokreće proveru tipova ni e2e (`.github/workflows/deploy.yml:29-31`) i ide paralelno sa CI. Vezati objavu za uspešan CI.
- **A-36.** Predlozi naziva vežbi su sistemski (`datalist`, `src/pages/Workout.tsx:269,306-310`), suprotno pravilu „sve ponude iz aplikacije“.
- **A-38.** U koren repoa ne ulaze, ali stoje lokalno: `MY_DAY_AI_REZIME.md`, `MY_DAY_AI_V03_ZADATAK.md`, `MY_DAY_AI_V031_ZADATAK.md`, `My Day AI.txt`. Odlučiti: u `.gitignore` ili (bez ličnih delova) u `docs/razvoj/`.

## 3. Šta je dobro (da se ne pokvari)

- Čista logika u `src/lib` sa testovima, uključujući 300 nasumičnih nedelja za planer i proveru svih prevoda.
- Nijedna JavaScript greška ni horizontalni skrol na 9 veličina u 3 pregledača; tamna i svetla tema; aplikacija radi offline.
- Sopstveni paneli i birači rade isto u sva tri pregledača; panel prati prst.
- XP se pošteno vraća pri poništavanju; AI odgovori se proveravaju pre prikaza; AI tekst se prikazuje kao tekst (nema ubacivanja HTML-a).

## 4. Šta mora na pravom uređaju (ne može automatski)

| Uređaj            | Šta proveriti posle 0.4                                                                                                                                                          |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| iPhone (Andrea)   | statusna traka ne pokriva sadržaj (A-09); „Sigurno?“ se vraća (A-08); „Dodaj u kalendar“ nudi „Dodaj sve“; podaci ostaju posle 8+ dana; tutorijal; prevlačenje od ivice za nazad |
| Android (Vukašin) | „Novi update“ se ne pojavljuje pri prvoj instalaciji (A-01); dodir na notifikaciju otvara aplikaciju i ikonica je logo (A-10); dugme i gest Nazad (A-13); vibracija i zvuk       |

## 5. Sat: Android (Capacitor) + Health Connect + Huawei Watch GT 6 Pro

### 5.1 Šta je moguće, a šta ne

- **PWA (ovo što sada postoji) ne može da čita zdravstvene podatke.** Pregledač nema pristup Health Connect-u, Huawei Health-u ni brojaču koraka. Za sat i korake potrebna je prava Android aplikacija.
- **Capacitor** pakuje isti kod (React + Vite) u Android aplikaciju i daje pristup sistemu preko dodataka. Ostaje jedan kod, PWA i dalje radi.
- **Health Connect** je Google-ovo zajedničko skladište zdravstvenih podataka na telefonu. Na Androidu 14 i novijem je deo sistema, na Androidu 9–13 je posebna aplikacija iz Play prodavnice. Aplikacija čita korake i san uz dozvolu korisnika (`android.permission.health.READ_STEPS`, `READ_SLEEP`).
- **Huawei Health ne upisuje podatke u Health Connect.** Nisam našao nijednu zvaničnu objavu Huawei-ja ili Google-a o tome; izvori koji o tome pišu (nezvanični, proizvođač alata za sinhronizaciju) kažu da ni 2026. nema ugrađene veze. Zato postoje dva puta:

| Put                                         | Kako radi                                                                                                                    | Cena i trud                                                                                                                                     | Ocena                                                 |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| **A. Most do Health Connect-a (preporuka)** | aplikacija-most (npr. Health Sync) čita Huawei Health i upisuje korake i san u Health Connect; My Day AI čita Health Connect | most se plaća (proveri cenu u Play prodavnici, ima probni period); podešava se jednom                                                           | najbrže; ista veza radi i za Samsung, Fitbit, Garmin… |
| **B. Huawei Health Kit direktno**           | My Day AI se prijavi na Huawei nalog i čita podatke preko Huawei-jevog SDK-a                                                 | Huawei developer nalog sa proverom identiteta, prijava aplikacije, odobrenje dozvola za zdravlje (može trajati nedeljama), HMS Core na telefonu | samo ako put A ne daje san ili je netačan             |

- Nepotvrđeno, mora da se vidi na tvom telefonu: da li most prenosi **san sa fazama** sa GT 6 Pro i koliko kasni (koraci obično stižu sa zadrškom od nekoliko minuta do sat vremena).
- **Koraci bez sata:** ako je „glavna aplikacija za korake“ na telefonu Google Fit ili Samsung Health, ona već upisuje u Health Connect i most nije potreban. Ako korake broji sat, vidi put A.

### 5.2 Šta ti radiš ručno (jednom)

1. **Javi mi model telefona i verziju Androida** (Podešavanja → O telefonu). Od toga zavisi korak 4.
2. **Android Studio** na laptopu: preuzmi sa developer.android.com/studio, instaliraj sa podrazumevanim opcijama (oko 10 GB na disku). On donosi Android SDK, `adb` i Javu. Posle instalacije ga jednom otvori da preuzme SDK.
3. **USB debugging na telefonu:** Podešavanja → O telefonu → dodirni „Broj verzije“ (Build number) 7 puta → nazad → Opcije za programere → uključi „USB debugging“. Poveži telefon kablom i na telefonu potvrdi „Dozvoli USB debugging“ (štikliraj „Uvek dozvoli sa ovog računara“).
4. **Health Connect:** Android 14+: Podešavanja → Bezbednost i privatnost → Health Connect. Android 13 ili stariji: instaliraj „Health Connect“ iz Play prodavnice.
5. **Most (put A):** instaliraj aplikaciju-most, prijavi se na Huawei nalog kad zatraži, izaberi Huawei Health → Health Connect za **korake** i **san**. Posle jednog dana proveri u Health Connect-u (Podaci i pristup) da li se vide koraci i sinoćni san sa sata.
6. **Samo ako put A ne radi (put B):** registracija na developer.huawei.com (provera identiteta ličnim dokumentom, traje nekoliko dana), zatim mi javi pa ja pripremam prijavu za Health Kit.
7. **Kasnije, za Google Play (1.0), ne za 0.4:** Play Console nalog (25 USD jednom), politika privatnosti i izjava o zdravstvenim podacima. Aplikacija koja čita Health Connect prolazi dodatnu proveru Google-a.

### 5.3 Šta Claude Code radi sam (kad su koraci 1–4 gotovi)

1. Dodaje Capacitor (`@capacitor/core`, `@capacitor/cli`, `@capacitor/android`), `capacitor.config.ts` (id aplikacije `io.github.vukasinknezevic.mydayai`, naziv „My Day AI“), `npx cap add android`.
2. Android build bez PWA service worker-a (posebna promenljiva pri build-u), ikone i početni ekran iz postojećeg `public/icon.svg`.
3. Dodatak za Health Connect (kandidati: `@capgo/capacitor-health`, `@capawesome-team/capacitor-health`; izabrati onaj koji na Androidu čita **i san i korake**, to proveriti u njegovoj dokumentaciji pre instalacije), dozvole u `AndroidManifest.xml`, ekran sa objašnjenjem zašto se traži dozvola.
4. Sloj `src/lib/health/` sa jednim interfejsom (`getSteps(date)`, `getSleep(date)`); u PWA vraća „nije dostupno“, pa ručni unos ostaje.
5. `@capacitor/local-notifications`: prave zakazane notifikacije i kad je aplikacija zatvorena, sa dugmadima (osnova za podsetnike, jutarnju rutinu i korake).
6. Build i instalacija na telefon preko kabla: `npx cap sync android`, `gradlew assembleDebug`, `adb install`.
7. Prenos podataka iz PWA: „Preuzmi fajl“ u PWA, „Izaberi fajl“ u Android aplikaciji (zato je A-14 preduslov). Android aplikacija ima svoje skladište, podaci se ne prenose sami.

### 5.4 Koraci i podsetnici do cilja (10 000)

- Izvor: Health Connect (`READ_STEPS`), isti put kao san. Cilj je podesiv, podrazumevano 10 000.
- Na ekranu Danas: prsten sa koracima i ciljem; dostignut cilj daje XP jednom dnevno i ulazi u niz.
- Podsetnici nekoliko puta dnevno (podrazumevano 12:00, 16:00, 20:00, podesivo, nikad posle vremena spavanja): „6 240 od 10 000 koraka. Još 3 760, šetnja od oko 35 min.“ Ako je cilj već dostignut, podsetnik se ne šalje.
- Ograničenje: da bi broj u notifikaciji bio svež dok je aplikacija zatvorena, treba čitanje u pozadini (posebna dozvola za čitanje u pozadini i mali pozadinski posao). Prva verzija: broj se osvežava pri svakom otvaranju aplikacije i podsetnik koristi poslednji poznati broj uz vreme očitavanja; druga verzija: pozadinsko osvežavanje pre slanja. Uz most iz puta A računati i na njegovo kašnjenje.
- U PWA verziji (iPhone, laptop) koraka nema; ostaje navika „Koraci“ sa ručnim unosom.

Izvori za deo o satu: [Capawesome: Capacitor Health plugin](https://capawesome.io/blog/announcing-the-capacitor-health-plugin/), [Capgo: Health plugin, getting started](https://capgo.app/docs/plugins/health/getting-started/), [Capgo: Google Fit to Health Connect migration](https://capgo.app/blog/google-fit-to-health-connect-migration-in-capacitor/), [FitMesh: Huawei Health i Health Connect](https://www.fitmesh.fit/en/blog/huawei-health-health-connect-sync) (nezvaničan izvor, prodaje sopstveni alat), postojeći `docs/SMARTWATCH.md` za Huawei Health Kit.
