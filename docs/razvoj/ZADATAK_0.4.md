# My Day AI — zadatak za update 0.4

> Napravljeno 10. 11. 2026. iz QA audita (`docs/razvoj/AUDIT_0.4.md`, oznake **A-xx**), primedbi posle testa 0.3 na telefonu (Vukašin, Android) i primedbi testerke Andree Jovović (iPhone), oznake **R-xx**.
> Uz svaku stavku piše fajl i linija u auditu; ovde je šta treba da se dobije.

## Kako da radiš (pravila)

1. Prvo `git checkout main && git pull`, pa grana `update-0.4` iz svežeg `main`.
2. Radi **redom po fazama** (A je najvažnija). Svaka stavka = poseban commit sa testom gde ima smisla.
3. Posle svake stavke: `npm run lint`, `npm run typecheck`, `npm test`, `npm run format:check`, pa commit i push. Posle izmene koda i `graphify . --code-only`.
4. Svaki novi tekst ide u **svih 7 jezika** (`src/i18n/locales/`), sa ženskim oblikom za srpski gde zavisi od roda. Na kraju faze pokreni agenta `i18n-checker`.
5. Novi podaci: polja dodaj u `src/types.ts`, podrazumevane vrednosti i migraciju u `src/lib/defaults.ts` (`DATA_VERSION` ide na 4, vidi A-33), sa testom da stari podaci i stari izvoz i dalje rade.
6. Na kraju svake faze kratko upiši u `IZVESTAJ.md` (sekcija „Update 0.4“): šta je urađeno, šta nije i šta mora da se proveri na pravom telefonu.
7. **Dva pull requesta:** PR 1 = faze A–G (verzija `0.4.0`). PR 2 = faza H (Android), tek kad su ručni koraci iz audita 5.2 gotovi; ako Android Studio nije instaliran, preskoči fazu H i to napiši na vrhu izveštaja.
8. Pravilo za svaki PR: naslov i opis na **engleskom**, u stilu PR #2 (kratak uvod, pa grupe **Fixes / UX / …**), poslednja rečenica „Implemented with Claude Code from a task file I wrote; PR opened and merged automatically via gh.“ Zatim `gh pr merge --auto --merge`.
9. Ne pitaj ništa, radi dok ne završiš. Ako nešto ne može kako piše, uradi najbližu dobru varijantu i zapiši zašto u `IZVESTAJ.md`.

## Šta se NE radi u 0.4

Google prijava i sinhronizacija između uređaja, Google Calendar API, uvoz rasporeda sa slike, App Store verzija, objava na Google Play. Ostaju za kasnije verzije.

---

## Faza A — Podaci su sigurni i prvi utisak je čist

1. **A-01** „Novi update“ se ne prikazuje pri prvoj instalaciji. Test komponente i e2e.
2. **A-02** Neuspelo čitanje sačuvanih podataka prikazuje ekran „Podaci nisu mogli da se učitaju · Pokušaj ponovo“ i ništa ne upisuje. Test sa bazom koja baca grešku.
3. **A-03** Posle uvoda `navigator.storage.persist()`. Na iPhone-u u Safariju: kartica za instalaciju **pre** uvoda, sa rečenicom da se podaci iz Safarija ne prenose u instaliranu aplikaciju. U Podešavanjima datum poslednje rezervne kopije i blag podsetnik jednom nedeljno (može da se isključi).
4. **A-04** Kolokvijum ili ispit bez roka za prijavu dobija podrazumevani rok (7 dana pre datuma) i upozorenje „Neprijavljen … rok nije unet, proveri na sajtu fakulteta“; isto u notifikacijama i kalendaru.
5. **A-37 + R-01 (provera)** Upis se završi pre restarta za update. E2E: dodaj predmet, termin, obavezu i poene, ponovo učitaj, sve je tu; isto posle „izmena pa odmah restart“.
6. **A-15** Provera `progress` i `settings` pri uvozu i učitavanju; u ekranu greške dugme „Obriši podatke i kreni ispočetka“ (aktivno posle preuzimanja kopije).
7. **A-14** Uvoz preko „Izaberi fajl“, izvoz i preko deljenja fajla; preuzimanje bez prekida u Safariju.

## Faza B — Greške u ponašanju

8. **A-06** Izbor dana na ekranu Danas: ‹ juče · danas · sutra ›, traka sa 7 dana, prevlačenje levo/desno. Sve na ekranu prati izabrani dan; „Trenutno/Sledeće“ samo za danas.
9. **A-07** Jedno zajedničko „Obrisano · Poništi“ (6 s) za sva brisanja; poništavanje vraća i XP.
10. **A-08** „Sigurno?“ se samo vraća posle 4 s ili dodira sa strane.
11. **A-10 + R-08** Sopstveni service worker (`injectManifest`): dodir na notifikaciju otvara aplikaciju, `tag` protiv duplikata, mala jednobojna ikonica (logo) i velika ikonica, vreme u formatu iz podešavanja, poslate notifikacije se pamte po danu.
12. **A-11** Brzi unos razume ćirilicu (i „ч“ kao sat). Testovi za sve primere iz polja na oba pisma.
13. **A-12** „legao 23:30“ upisano sutradan ide u prethodnu noć. Unos sna može da se izmeni i obriše; zaboravljeno „Ustao“ ne blokira novo „Legao“.
14. **A-16** Aktivnosti posle ponoći: kraj manji od početka znači sutradan (22:00–01:00); linija dana i „Trenutno/Sledeće“ ih prikazuju na pravom mestu.
15. **A-17** Opciono vreme ima „Obriši vreme“ u biraču.

## Faza C — iPhone, „Nazad“ i kalendar

16. **A-09 / R-03** Sadržaj nikad ne prolazi ispod sata i baterije: nepomična traka u boji pozadine visine `env(safe-area-inset-top)`.
17. **A-13 / R-05 Pametno „Nazad“** (Android dugme i gest; na iPhone-u sopstveno prevlačenje od leve ivice i strelica ← u zaglavlju podekrana). Redosled, prvi koji važi:
    1. otvoren panel, izbornik, dijalog ili XP istorija → zatvori ga;
    2. forma sa neunetim izmenama → „Odbaci izmene? [Odbaci] [Nazad]“;
    3. detalj → nazad na listu;
    4. pod-tab → prvi tab te sekcije;
    5. ekran skrolovan nadole → glatko na vrh;
    6. druga sekcija → glatko na Danas;
    7. Danas na vrhu → „Napusti aplikaciju? [Ostani] [Napusti]“.
       Tehnički: jedan „čuvar“ unos u istoriji (`history.pushState` + `popstate`), jedna funkcija `handleBack()` sa testovima za svaki korak.
18. **R-02 Kalendar se lako nalazi.** Dugme „Dodaj u kalendar“ i na ekranu Faks (uz obaveze) i na ekranu Danas, ne samo u Podešavanjima; objašnjeno u tutorijalu. Jasno piše da je to jednokratno (nove obaveze = ponovo dodirni). iPhone: otvoriti kalendarski fajl direktno, da Safari ponudi „Dodaj sve“ (deljenje preko share sheet-a nije ponudilo Kalendar); ako ne radi, ostaviti deljenje i napisati u izveštaju. **A-24:** celodnevni događaji podsećaju u 09:00, ne u ponoć.

## Faza D — Faks, trening, obraćanje

19. **R-01 Termini izgledaju sačuvano.** Forma za nov termin se ne vidi stalno: dugme „+ Dodaj termin“ otvara donji panel (vrsta, dan, od–do, i „Nova vrsta termina“ unutar panela). Sačuvani termini su jasni redovi sa ✎ i ✕. Isto za formu „Nova obaveza“: iza dugmeta, u panelu.
20. **R-09** Poeni se prikazuju u odnosu na 100 („0 / 100“), ne „0 / 0 ocenjeno“.
21. **R-11** Predmet bez obaveza: „Dodaj kolokvijume i ispit da vidiš koliko ti fali do prolaza“ + dugme za dodavanje, umesto „ne može se doći do 51“.
22. **R-10** Polje „Kako ti se obraćam“ u Podešavanjima je unapred popunjeno predlogom vokativa kad je prazno.
23. **R-06 + A-05 Trening je jedna stvar.**
    - Novi trening: naziv (opciono), **dan i vreme (obavezno)**, pojavljuje se na ekranu Danas i ima podsetnik.
    - „+ Dodaj vežbu“ je istaknuto dugme; polja imaju vidljive nazive (serije, ponavljanja, kg); ✕ sa „Poništi“.
    - Trajanje se ne traži unapred: procena iz broja serija ili stvarno trajanje kad se označi „Urađeno“. Osećaj je opcion i pita se posle.
    - Unos vežbi se vezuje za zakazani trening (`Workout.activityId`), označava ga kao urađen i daje XP **jednom**; poništavanje ga vraća. Brojač „Ove nedelje“, niz, planer i Pregled čitaju isti izvor.
    - Gotovi splitovi: dugme **„Koristi ovaj plan“** → panel „Kada treniraš?“ (dan i vreme za svaki dan plana, upozorenje ako se poklapa sa terminom na faksu) → treninzi se ponavljaju svake nedelje. Aktivan plan ima oznaku „✓ Aktivan“, „Promeni vreme“ i „Prekini plan“.
    - Predlozi naziva vežbi iz sopstvenog panela, ne sistemski (A-36).

## Faza E — Tutorijal i jutarnja rutina

24. **R-04 Interaktivni tutorijal** (obavezno, tražila testerka: nije jasno čemu aplikacija služi).
    - Posle uvodnih pitanja: „Pre nego što kreneš, hajde da te provedemo kroz aplikaciju“ [Kreni] [Preskoči].
    - Vođeni obilazak po **pravim ekranima**: istaknut deo ekrana + oblačić, korisnik sam uradi korak (doda probnu obavezu, štiklira je i vidi +XP, doda predmet, povuče panel). Oko 1 minut, tačkice napretka, „Preskoči“ vidljivo sve vreme.
    - Prolazi ukratko: Danas, Faks + termini + „Dodaj u kalendar“, Trening + planovi, Život/navike + XP i nagrada, jutarnja rutina, AI, Podešavanja.
    - Probni podaci iz tutorijala se brišu na kraju (zajedno sa XP-om). Ponovo dostupno: Podešavanja → „Kako radi aplikacija“.
    - Kratki saveti na praznim ekranima. Prvi ekran uvoda u jednoj rečenici kaže čemu aplikacija služi.
25. **R-07 Jutarnja rutina** (jednostavna varijanta, konačna odluka od 8. 11.).
    - Podešavanje: cilj buđenja + 3–5 koraka; podrazumevano 🛏️ namesti krevet → 🤸 2 min istezanja → 💧 čaša vode → 🚿 umivanje/zubi. Korisnik menja korake.
    - Ujutru (do oko 11 h) na vrhu ekrana Danas kartica „Jutarnja rutina“ sa štikliranjem, animacijom i XP-om; bonus ako je gotova do zadatog vremena; svoj niz 🔥.
    - „Spasi dan“: ako je kasno ili je rutina preskočena, nudi kratku verziju (2 koraka) uz „Nije kasno, kreni od jednog malog koraka“. Ton pozitivan, bez osude, poštuje rod i vokativ.
    - Jutarnja notifikacija u vreme buđenja („Dobro jutro, Vukašine ☀️ 3 koraka i dan je tvoj“). U PWA koliko pregledač dozvoljava: dugme „Urađeno ✓“ u notifikaciji (`actions` + `notificationclick`), sledeći korak izlazi kao nova notifikacija. Pravi alarm i trajna notifikacija dolaze u fazi H (Android). iPhone: bez dugmadi u notifikaciji, piše se u izveštaju.

## Faza F — Zarazna, a zdrava aplikacija

Cilj: da korisnik poželi da otvori aplikaciju svaki dan, a da mu je posle toga dan bolji. Pravila za celu fazu: bez osude i krivice, bez beskonačnog sadržaja, najviše 6 notifikacija dnevno i nijedna posle vremena spavanja, sve može da se isključi.

26. **Ulazna animacija (~1 s)** pri svakom otvaranju aplikacije (ne pri promeni ekrana i ne tokom uvoda): logo → „Zdravo, Vukašine“ (vokativ, ili ime na drugim jezicima) → glavni niz „🔥 12 dana“. Dodir je preskače; ne sme da uspori prvi ekran (ide preko već učitanog sadržaja); uz „manje pokreta“ samo kratko pretapanje.
27. **Glavni niz i „spas“.** Dan se računa ako je urađena bar jedna stvar (aktivnost, navika do cilja, trening, rutina, zatvoren dan). Na svakih 7 dana zaredom dobija se jedan **spas** (najviše 2 u rezervi); propušten dan troši spas sam, a pri sledećem otvaranju piše „❄️ Spas je sačuvao tvoj niz od 12 dana“. Bez spasa niz kreće od 1, uz „Najduži niz: 12“ (bez prekora).
28. **Dnevni izazov.** Jedan mali, ostvariv izazov dnevno na vrhu ekrana Danas, izabran iz korisnikovih podataka (npr. „Prijavi Kolokvijum 1“ ako nije prijavljen, „Jedan blok učenja pre 14 h“, „Voda do cilja“, „Lezi do 00:30“, „10 000 koraka“ u Android verziji). Ispunjenje se prepoznaje samo gde može; +15 XP; jednom dnevno „Daj mi drugi“. Izbor je određen datumom, da testovi budu ponovljivi.
29. **Iznenađenja.** Posle urađene stvari povremeno (otprilike svaki četvrti put, najviše 2 dnevno) „🎁 Iznenađenje“: bonus XP (5–20), bonus minuta nagrade (5–15) ili nova značka. Ishod zavisi od id-ja događaja, pa poništi-pa-ponovi ne donosi novi pokušaj, a poništavanje vraća i bonus.
30. **Napredak koji se vidi.** Na ekranu Danas prsten nedelje (aktivni dani 0–7) i traka nivoa; nova stranica „Dostignuća“ sa značkama (prva nedelja, niz 7/30/100, prvi lični rekord, sve prijave na vreme u mesecu, 50 h učenja…) i ličnim rekordima.
31. **Animacija, zvuk, vibracija.** Štikliranje se „upiše“ animacijom, XP odleti do brojača, konfete za novi nivo, prekretnicu niza i zatvoren dan (CSS/canvas, bez teške biblioteke). Kratki zvuci preko Web Audio (bez fajlova) i `navigator.vibrate` (radi na Androidu; na iPhone-u vibracije u PWA nema). Podešavanja: Zvuk, Vibracija, Animacije; poštuje „manje pokreta“.
32. **„Zatvori dan“.** Uveče (od 2 h pre vremena spavanja, ili dugmetom bilo kad) kartica u 3 kratka koraka, ukupno do 30 s:
    1. pregled dana: urađeno, XP, koraci (Android); neurađeno → „Prebaci na sutra“ ili „Preskoči“;
    2. kako je prošao dan (1–5 emotikona, beleška opciono);
    3. jedna glavna stvar za sutra → sutra stoji na vrhu ekrana Danas i u jutarnjoj notifikaciji.
       Zatvaranje daje +10 XP, čuva niz, mirnu animaciju „Dan je zatvoren 🌙“ i predlog vremena za spavanje.

## Faza G — Kvalitet, izgled, tekstovi, README

33. **Pristupačnost i dodir:** A-18 (zamka fokusa u panelima), A-19 (vidljiv fokus na datumu), A-20 (stisnut kvadratić), A-21 (mete najmanje 44 px).
34. **Izgled:** A-22 (uredan red obaveze sa „⋯“), A-32 (dve kolone od 1024 px), A-28 (nagrada u slobodnom broju minuta), A-29 i A-30 (navike i troškovi).
35. **Brzina:** A-23 (jezici i teški ekrani na zahtev; početni paket ispod 120 kB gzip, cilj zapisati u izveštaj sa brojevima pre i posle).
36. **Tekstovi:** A-26 (tragovi lične verzije, „Inženjer“, ženski oblici, uvoz bez `domaci|lab`), A-27 (formati u AI pregledu), A-25 (Pregled: urađeno / planirano / cilj).
37. **Instalacija i link:** A-31 (manifest, ikonice u offline kešu, `meta description` i Open Graph sa slikom, noviji iPhone početni ekrani).
38. **Testovi i CI:** A-33 (verzija podataka), A-34 (testovi za `updates.ts`; kratak e2e prolaz u Firefox-u, na tabletu i 1920 px), A-35 (objava tek posle uspešnog CI).
39. **Lični podaci u repou.** U `docs/razvoj/MY_DAY_AI_ZADATAK.md`, sekcija „0. Ko sam ja“ i mesta koja je ponavljaju: uopštiti vreme ustajanja i spavanja, teretanu/košarku, PS5 i model sata (npr. „primer korisnika“, „igrice“, „pametni sat“). **Git istoriju ne dirati** (nema tajni, pravi mejl je sakriven). A-38: lokalne beleške u korenu staviti u `.gitignore`.
40. **README (srpski i engleski):**
    - nova sekcija **„User testing“**: 2 testera, Android (Vukašin) i iPhone (**Andrea Jovović**, studentkinja Fakulteta za medije i komunikacije; ime se navodi uz njenu dozvolu), šta je svaki test promenio u aplikaciji; tester testira, ne piše kod;
    - verzije: dodati **0.4** i jednu rečenicu kojim je alatom rađena (naziv modela upisuje Vukašin);
    - nove funkcije (tutorijal, jutarnja rutina, dnevni izazov, zatvori dan, Android i sat ako je faza H gotova), novi screenshot-ovi.
41. `package.json` na `0.4.0`, `IZVESTAJ.md` dopunjen, skill `release-bump`.

## Faza H — Android (Capacitor), sat i koraci (PR 2)

Preduslov: ručni koraci 1–5 iz `AUDIT_0.4.md`, deo 5.2 (model telefona, Android Studio, USB debugging, Health Connect, most za Huawei Health). Ako `adb devices` ne vidi telefon, stani i napiši krupno šta fali.

42. Capacitor: `capacitor.config.ts` (id `io.github.vukasinknezevic.mydayai`), `android/` projekat, build bez PWA service worker-a, ikone i početni ekran. PWA i objava na GitHub Pages rade kao do sada.
43. Sloj `src/lib/health/` (jedan interfejs, u PWA „nije dostupno“), dodatak za Health Connect koji na Androidu čita **korake i san** (proveriti u dokumentaciji dodatka pre izbora), dozvole i ekran sa objašnjenjem.
44. **Podešavanja → „Poveži sat“:** lista izvora, na vrhu oni pronađeni na telefonu (`<queries>` sa poznatim paketima, bez `QUERY_ALL_PACKAGES`); dodir → zvaničan zahtev za dozvolu. Za Huawei kratko uputstvo za most do Health Connect-a.
45. **San sa sata:** noć iz Health Connect-a upisuje se kao `SleepLog` sa `source: 'watch'` (bez duplikata sa ručnim unosom; ručni unos ima prednost ako postoji).
46. **Koraci (Vukašin, 10. 11.):** broj koraka iz glavne aplikacije za korake preko Health Connect-a; cilj podesiv, podrazumevano 10 000; prsten na ekranu Danas, XP jednom dnevno, ulazi u dnevni izazov i „Zatvori dan“. **Podsetnici nekoliko puta dnevno** (podrazumevano 12:00, 16:00, 20:00, podesivo): „6 240 od 10 000 koraka. Još 3 760.“; ne šalje se ako je cilj dostignut ni posle vremena spavanja. Prva verzija koristi poslednji očitani broj (uz vreme očitavanja), zatim pozadinsko osvežavanje pre slanja.
47. `@capacitor/local-notifications`: svi podsetnici rade i kad je aplikacija zatvorena; jutarnja rutina sa dugmetom „Urađeno ✓“ i trajnom notifikacijom; alarm sa „malo težim Stop“ (drži 3 s).
48. Prenos podataka iz PWA: „Preuzmi fajl“ → „Izaberi fajl“ (stavka 7), sa uputstvom na prvom ekranu Android aplikacije.
49. Build i instalacija preko kabla (`npx cap sync android`, `gradlew assembleDebug`, `adb install`); u `docs/razvoj/` kratko uputstvo `ANDROID.md`. Put B (Huawei Health Kit) samo ako most ne daje san: opisati šta je probano i stati.

## Provera na kraju

- Sve iz tabele „Šta mora na pravom uređaju“ (`AUDIT_0.4.md`, deo 4) prepisati u `IZVESTAJ.md` kao listu za Vukašina (Android) i Andreu (iPhone).
- `npm run lint`, `npm run typecheck`, `npm run test:coverage`, `npm run build`, `npm run e2e` zeleni; pokrivenost `src/lib` ne pada ispod 90%.
