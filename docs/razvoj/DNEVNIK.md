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

## Faza 11 — Portfolio

Napisao sam README na srpskom i engleskom, `docs/ARHITEKTURA.md` sa Mermaid dijagramom toka podataka i dodao MIT licencu. GitHub Actions (`ci.yml`) na svaki push pokreće lint, typecheck, unit i e2e testove, a `deploy.yml` objavljuje aplikaciju na GitHub Pages. Ključna stvar na razgovoru: možeš da objasniš zašto je logika u čistim funkcijama i zašto AI nikad direktno ne menja podatke, nego pravi predlog koji ti prihvatiš.

## Faza 12 — Završetak

Napisao sam `IZVESTAJ.md` sa poštenim spiskom šta radi, šta nije urađeno i šta nisam mogao da proverim (npr. pravi API poziv i Huawei format). `UCENJE.md` je tvoj vodič: poređenje sa Pythonom, redosled čitanja fajlova i 10 pitanja sa razgovora. Najvažnija lekcija projekta: kad ne možeš nešto da proveriš, to napišeš, a ne pretvaraš se da radi. Sledeći korak je da sam uključiš GitHub Pages (uputstvo je u README-u) i probaš AI sa pravim ključem.

# Verzija 0.2 (ranije 1.1)

## Deo 1 — Popravke

Greška sa nulom je nastajala jer je polje stalno pretvaralo prazan tekst u broj `0`. Sada postoji jedna zajednička komponenta `NumberInput` koja čuva ono što kucaš kao tekst, pa polje sme da bude prazno, a vrednost se ograničava na min/max. Tastatura radi preko male komponente `KeyScope`: Enter ide „Dalje/Sačuvaj/Potvrdi", Esc „Nazad/Otkaži", a u višeredom polju Enter samo pravi novi red. Posle promene koraka fokus se vraća na prvo polje, inače bi pritisak na Enter ostao bez efekta. Dodata je forma za novu i izmenu aktivnosti sa ponavljanjem (dnevno, radnim danima, nedeljno) i čuvanje sopstvenih šablona treninga.

## Deo 2 — Opšta verzija

„PS5" više nije fiksan pojam: korisnik sam imenuje nagradu (podrazumevano „Vreme za zabavu" sa emotikonom 🎮), a u kodu polja sada imaju opšta imena (`rewardEarnedMin`…). Da stari sačuvani podaci ne bi pukli, napisao sam funkciju `migrateData` koja premesti stara polja u nova; pokreće se pri učitavanju i pri uvozu, a može da se pokrene dvaput bez štete. Prompt za AI i demo podaci više ne pominju fakultet ni konkretnu igricu. Onboarding ima nove korake „Nagrada" i „AI režim" (ručni besplatno ili API koji se plaća po upotrebi, sa upozorenjem o ključu).

## Deo 3 — Više jezika

Aplikacija sada ima i18n (internacionalizaciju): svi tekstovi interfejsa su u fajlovima prevoda u `src/i18n/locales/`, a u komponentama nema tvrdo upisanog teksta, samo pozivi `t('ključ')`. Novi jezik je samo novi fajl u toj fascikli: spisak jezika se otkriva sam (`import.meta.glob`), a TypeScript i test javljaju grešku ako nekom jeziku fali ključ ili `{parametar}`. Srpska ćirilica se izvodi iz latinice pravilom pretvaranja slova 1:1, pa nema duplog održavanja. Datumi, nazivi dana i brojevi prate jezik preko date-fns locale-a i `Intl`, a AI prompt, odgovori i brzi unos rade na srpskom i engleskom. Playwright proverava ćirilicu i engleski bez horizontalnog skrola i bez axe povreda.

## Deo 4 — README kao opšti proizvod

README sada izgleda kao opis proizvoda za bilo kog studenta: na vrhu su „Live demo" dugme i CI značka, kratka lična priča i rečenica da sam aplikaciju osmislio ja, a kod pisao uz Claude Code. Uklonio sam uputstva koja su bila namenjena meni (uključivanje GitHub Pages), jer se stranica objavljuje sama pri svakom push-u. Dodao sam sekcije „Jezici" i „Kako dodati jezik" (tri koraka) i nove screenshot-ove: svetla i tamna tema, telefon i laptop, srpski, engleski i ćirilica. Istraživanje o Huawei satu preimenovano je u opšti `docs/SMARTWATCH.md`, a `docs/ARHITEKTURA.md` opisuje i18n sloj i migraciju podataka.

## Deo 5 — Završetak

Svi testovi prolaze (271 unit/komponentni i 21 e2e), build je bez upozorenja, a GitHub Pages se sam ažurira posle svakog push-a. `IZVESTAJ.md` sada ima odeljak „Šta je novo u verziji 1.1" i ažuriran spisak onoga što nije urađeno (npr. engleski prevod nije pregledao izvorni govornik). U `UCENJE.md` sam dodao objašnjenja za i18n, migraciju podataka i `NumberInput`. Najvažnija lekcija ove verzije: ono što si napravio za sebe lako postane tuđi problem (fiksan „PS5", srpski tekst u kodu), pa se opšta verzija pravi tako što se sve lično pretvori u podešavanje ili prevod.

## 0.4.0 — Podaci su sigurni, aplikacija je prijatnija za svaki dan

Verzija 0.4 je nastala iz audita i primedbi dva testera (Android i iPhone). Prvo su podaci: neuspelo čitanje više ništa ne prepisuje, traži se trajno skladište i podseća se na rezervnu kopiju. Zatim ponašanje: izbor dana, jedno zajedničko „Poništi“, sopstveni service worker da dodir na notifikaciju otvori aplikaciju, pametno „Nazad“. Trening je sada jedna stvar (zakazan sa danom i vremenom, vežbe su zapis uz njega), a u aplikaciji su tutorijal, jutarnja rutina, dnevni izazov, „Zatvori dan“, spasovi za niz i dostignuća. Najviše sam naučio na dve stvari: kako se aplikacija deli na delove koji se učitavaju tek kad zatrebaju (jezici i teški ekrani; slično kao `import` unutar funkcije u Pythonu), i da nasumičnost u aplikaciji treba da bude „nasumična“ samo na izgled: iznenađenja i izazov zavise od id-ja i datuma, pa su testovi ponovljivi, a poništavanje ne daje novi pokušaj.
