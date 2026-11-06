# DNEVNIK — šta sam naučio

## Faza 0 — Priprema
Instalirali smo Node.js (pokreće JavaScript van pregledača i daje `npm`, menadžer paketa kao `pip` u Pythonu) i Git (pamti istoriju koda). Napravljen je Vite projekat: Vite je alat koji pokreće aplikaciju dok je razvijaš. `package.json` je kao `requirements.txt`, samo sa skriptama (`npm run test`). Naučio si da `.gitignore` služi da tajne (API ključ) nikad ne završe na GitHub-u.

## Faza 1 — Osnova i model podataka
Svi podaci aplikacije opisani su u `src/types.ts`: to je kao da u Pythonu definišeš `dataclass` za svaki pojam (predmet, kolokvijum, trening…), samo što TypeScript proverava tipove pre pokretanja. Store (`store.ts`) je jedno mesto gde živi stanje i čuva se u IndexedDB pregledača, pa podaci prežive zatvaranje aplikacije. Pomoćne funkcije za datume su u `lib/dates.ts` i imaju testove; „čista funkcija" znači da za iste ulaze uvek vrati isti izlaz, pa se lako testira. Napravljen je i onboarding od 5 koraka i demo podaci označeni sa „(primer)".

## Faza 2 — Ekran „Danas"
Parser `quickParse.ts` pretvara rečenicu poput „sutra učenje mata 2h" u strukturu (datum, kategorija, početak, kraj). Radi preko regularnih izraza (regex), a isti princip imaš u Pythonovom modulu `re`. Napisao sam 34 testa, jer parser ima mnogo graničnih slučajeva (npr. „18h" je vreme, a „2h" trajanje). Ekran Danas sklapa obaveze iz aktivnosti i rasporeda faksa, računa upozorenja (neprijavljen kolokvijum) i crta vremensku liniju. Naučio si da se logika drži u čistim funkcijama (`lib/`), a React samo prikazuje rezultat.

## Faza 3 — Faks
Dodao sam predmete, nedeljni raspored i pitanje „idem / ne idem / ponekad" za svaki termin. Termini „ne idem" postaju slobodno vreme koje planer kasnije koristi. Kolokvijumi imaju odbrojavanje u boji, čeklistu prijava i pregled „Novembar: prijave". Računanje ocene (`gradeFor`) je obična funkcija sa tabelom testova, slično kao `pytest.mark.parametrize` u Pythonu.

## Faza 4 — Planer
`planWeek()` u `lib/planner.ts` je algoritam sa pravilima: raspoređuje učenje pre kolokvijuma (teži ispit počinje ranije), čuva pauze i bar jedan lakši dan, skraćuje trening dan pred ispit i nudi igru kao nagradu. Radi sa „intervalima slobodnog vremena": od dana oduzmeš zauzeto i ostane slobodno. Ima 33 testa jer je deterministička čista funkcija. Predlozi imaju isprekidanu ivicu dok ih ne prihvatiš.

## Faza 5 — Trening i ishrana
Unosiš vežbe kao serije × ponavljanja × kilaža, a aplikacija pamti najveću kilažu po vežbi i javlja 🎉 kad je pobediš (`newRecords`). Prvi put kad radiš neku vežbu to nije rekord, jer nema šta da se pobedi. Grafikon (Recharts) crta napredak kilaže kroz vreme. Za ishranu postoji traka napretka do dnevnog cilja proteina. Naučio si šta je `Map`/rečnik po ključu i kako se isti podaci prikazuju na više načina.

## Faza 6 — San, novac, navike
San se beleži sa dva klika (Legao / Ustao), a aplikacija računa prosek 7 dana i predlaže vreme spavanja prema sutrašnjoj prvoj obavezi. Novac ima mesečni budžet po kategoriji i upozorenje na 80%. Navike imaju niz dana: niz se ne prekida ako današnja još nije urađena. Za Huawei sat sam istraživao i zapisao u `docs/HUAWEI.md` šta je potvrđeno, a šta ne; format fajla nisam izmišljao. Naučio si da je „ne znam" pošten odgovor kad nešto nije proverljivo.

## Faza 7 — Motivacija
Urađena obaveza daje XP (učenje 10 XP na 30 min, trening 30, prijava 20, navika 5), a svaki događaj ima jedinstven `id`, pa ista stvar nikad ne plati dvaput. Nivoi idu od Brucoša do Inženjera. Svaki sat učenja zarađuje PS5 minute (podesivo), a aplikacija samo prikazuje stanje, bez zamerki. Nizovi dana se računaju čistom funkcijom `streakOf`, a milestone-ovi (3, 7, 14, 30 dana) javljaju se kratkom porukom. Naučio si ideju idempotentnosti: ponovljen poziv ne menja rezultat.

## Faza 8 — AI (API i ručni režim)
Postoje dva režima sa istim kodom iza njih (`src/lib/ai/`): u API režimu aplikacija šalje zahtev Anthropic-u iz pregledača običnim `fetch`-om, a u ručnom režimu kopiraš gotov prompt u Claude chat i nalepiš odgovor. Oba puta prolaze kroz isti `parseAiResponse`: pronađe JSON u tekstu pun priče i proveri ga `zod` šemom, kao što u Pythonu proveravaš podatke sa `pydantic`. Model uvek može da vrati loš JSON, zato svaka AI funkcija ima jasnu poruku šta da tražiš i rezervu bez AI-ja. Testovi koriste lažni (mock) `fetch`, pa ne troše pravi novac.

## Faza 9 — Podsetnici i pregled
Notifikacije pregledača rade samo dok je aplikacija otvorena ili nedavno korišćena, jer nema servera koji bi slao push. Zato postoji i izvoz u `.ics` (standardni format kalendara), pa telefon podseća sam preko kalendara. Odluka „kada se šalje podsetnik" je čista funkcija `dueReminders`, pa je testirana bez pregledača. Pregled nedelje i meseca računa sate po kategoriji, ciljeve, troškove, san, XP i poene, a Recharts crta grafikon.

## Faza 10 — Podaci i kvalitet
Dodao sam izvoz i uvoz svih podataka kao JSON (izvoz namerno ne sadrži API ključ) i brisanje uz potvrdu unutar stranice. Napisao sam 16 end-to-end testova u Playwright-u: to je robot koji otvori pravi Chromium i klika kroz aplikaciju kao ti. Isti robot sa alatom `axe` proverava pristupačnost (kontrast, nazivi dugmadi) u svetloj i tamnoj temi i našao je stvarne greške koje sam popravio. Pokrivenost `src/lib/` je preko 90%, a stranice sa grafikonima se učitavaju tek kad zatrebaju (lazy loading), pa je prvo učitavanje brže.
