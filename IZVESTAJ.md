# IZVEŠTAJ — My Day AI

Verzija 1.0 završena 2026-11-06, verzija **1.1** 2026-11-07. Repozitorijum: https://github.com/vukasin-knezevic/my-day-ai · Živa aplikacija: https://vukasin-knezevic.github.io/my-day-ai/

## Šta je novo u verziji 1.1
**Popravke**
- **Tastatura svuda:** `Enter` = Dalje / Sačuvaj / Potvrdi, `Esc` = Nazad / Otkaži / zatvori (onboarding, forme, dijalozi). U višeredom polju Enter pravi novi red (potvrda je `Ctrl+Enter`). Posle promene koraka fokus ide na prvo polje, pa se celo podešavanje može proći bez miša.
- **Polja za brojeve:** jedna zajednička komponenta `NumberInput`; polje sme da bude prazno, nema vodeće nule (`03`), decimale rade gde treba (tačka ili zarez), min/max se primenjuju pri kucanju i pri napuštanju polja.
- **Izmena aktivnosti, ponavljajuće aktivnosti** (svaki dan / radnim danima / nedeljno) u formi, i **sopstveni šabloni treninga**.

**Opšta verzija**
- „PS5 vreme" je zamenjeno **nagradom koju korisnik sam imenuje** (podrazumevano „Vreme za zabavu" 🎮, na engleskom „Fun time"); odnos minuta po satu učenja je podesiv.
- **Migracija podataka:** stari sačuvani podaci i stari JSON izvozi se automatski prebacuju u novi oblik (`migrateData`, pokriveno testovima).
- Bez ličnih detalja u demo podacima, promptu i README-u; valuta je podesiva (podrazumevano po jeziku).
- **Onboarding:** novi koraci „Jezik", „Nagrada" i „AI režim" (ručni besplatno ili API koji se plaća po upotrebi, sa upozorenjem o ključu).

**Više jezika**
- i18n: srpski (latinica), engleski, srpski (ćirilica). Novi jezik je jedan novi fajl u `src/i18n/locales/` (3 koraka u README-u). Test pada ako nekom jeziku fali ključ ili `{parametar}`.
- Datumi, nazivi dana i meseci, brojevi, AI prompt i odgovori prate jezik; brzi unos razume srpski i engleski.
- Playwright proverava engleski i ćirilicu na svim ekranima (bez horizontalnog skrola, bez axe povreda) i pravi screenshot-ove.

**README** je prepisan kao opis proizvoda (live demo, CI značka, jezici, kako dodati jezik).

## Kako da pokreneš
- `npm run dev` → **http://localhost:5173**
- Telefon na istoj Wi-Fi mreži: **http://192.168.1.15:5173** (ili http://192.168.1.16:5173 preko kabla). Ako ne otvara, Windows Firewall verovatno blokira Node.js: dozvoli ga za „Privatne mreže".
- Instalacija na telefon (PWA) traži HTTPS ili localhost, pa radi tek kad se objavi na GitHub Pages (https://vukasin-knezevic.github.io/my-day-ai/). Na običnom `http://192.168…` aplikacija radi, ali „Dodaj na početni ekran" i offline režim ne.

## Stanje provera (poslednje pokretanje)
| Provera | Rezultat |
|---|---|
| `npm run lint` | prolazi, 0 grešaka |
| `npm run typecheck` | prolazi (TypeScript strict) |
| `npm test` | **271 unit/komponentni test prolazi** (parser, planer, AI sloj, `NumberInput`, `KeyScope`, migracija, prevodi…) |
| Pokrivenost `src/lib/` | **~94% linija** (cilj 80%) |
| Playwright e2e | **21 test prolazi** (cilj 10), uključujući axe proveru pristupačnosti za 9 ekrana × svetla/tamna tema, onboarding samo tastaturom, engleski i ćirilicu |
| `npm run build` | bez upozorenja |

## Šta je urađeno u verziji 1.0 (faze 0–12)
Sve faze iz zadatka su implementirane i pushovane (svaka u svom commit-u, vidi `git log` i `PLAN.md`):
0. Priprema (Node, Git instalirani preko winget-a, repo povezan), 1. model podataka + onboarding, 2. ekran Danas + parser, 3. Faks, 4. planer, 5. trening i ishrana, 6. san/novac/navike + istraživanje podataka sa pametnog sata, 7. XP/nivoi/nizovi/PS5, 8 i 8b. AI (API + ručni režim), 9. podsetnici, .ics i pregledi, 10. izvoz/uvoz, pristupačnost, prečice, e2e, screenshot-ovi, 11. README (sr/en), arhitektura, MIT, CI i Pages workflow-i, 12. ovaj izveštaj i `UCENJE.md`.

## Popravke posle verzije 1.1
- **Šablon treninga se može preimenovati** (naziv iz polja Tip).
- **„Samo danas" za ponavljajuće aktivnosti:** uklanja jedan dan, niz ostaje; važi i za `.ics`.
- **Greška u planeru ispravljena:** skraćenje treninga pred ispit menjalo je ceo ponavljajući niz, sada menja samo taj dan.
- **CI:** e2e test 10 je jednom pao na GitHub-u (`05e58ff`), sledeći commit je prošao, a lokalno prolazi 20/20. Verovatan uzrok (trka između brisanja i ponovnog učitavanja) nije reprodukovan; test sada čeka da se brisanje upiše.
- **AI klijent:** limit tokena podignut (16000, čet 4000) jer se razmišljanje modela računa u `max_tokens`; odsečen odgovor, istek vremena (3 min) i preopterećenje (529) sada imaju svoju poruku.
- **Provereno na pravom API-ju, bez ključa:** preflight sa našim zaglavljima vraća `access-control-allow-origin: *`, a zahtev sa lažnim ključem običan 401, pa pozivi iz pregledača nisu blokirani. Sam odgovor modela i dalje nije proban.
- **Planer:** više ne predlaže termine koji su danas već prošli i ne preklapa AI predloge na čekanju.
- **AI rezultati:** odbijaju se aktivnosti koje se završavaju pre početka i nepostojeći datumi; model sada zna koliko je sati; ponovni uvoz istog rasporeda ne duplira kolokvijume.
- **Brzi unos razume ponavljanje:** „trening svaki dan u 18", „učenje radnim danima 10-12", „svakog ponedeljka", „every monday".

## Update 0.3

### Faza A — Greške (urađeno)
1. **Notifikacije na Androidu:** podsetnici se prikazuju preko service worker-a (`registration.showNotification`); `new Notification` je samo rezerva za laptop. Greška se više ne guta: u podešavanjima je dugme **„Pošalji probnu notifikaciju"** koje javlja da li je prikazana.
2. **XP se oduzima:** `revoke` u `src/lib/xp.ts` skida XP, nagradne minute, id i događaj (događaj sada pamti i `rewardMin`). Poziva se kad navika padne ispod cilja, kad se aktivnost vrati iz „urađeno" (novo dugme „Poništi" na ekranu Danas), kad se odštiklira prijava kolokvijuma, i pri brisanju treninga, navike, aktivnosti ili obaveze. Napomena: događaji nastali pre ove verzije ne pamte nagradne minute, pa se za njih skida samo XP.
3. **Nagrada ne ide u minus:** „Iskoristio 30/60 min" je neaktivno kad nema dovoljno minuta; posle klika stoji **„Poništi"** 6 sekundi. `stanje = zarađeno − potrošeno`, nikad ispod 0. Stari podaci sa negativnim stanjem (npr. −900) se popravljaju pri učitavanju (potrošeno se spušta na zarađeno).
4. **Termini:** ✕ pored svakog termina (sa „Poništi") i zaštita od duplikata (isti predmet + vrsta + dan + vreme; dupli klik na „+ Termin" dodaje jedan i javlja poruku).
5. **„Obriši demo podatke"** sada skida i XP/nagradne minute demo stavki.

Provera posle svake stavke: `npm run lint`, `npm run typecheck`, `npm test` (zeleno).

### Faza B — Izgled i „smooth" osećaj (urađeno)
6. **Boje i početni ekran:** `theme_color` i `background_color` u manifestu i `<meta name="theme-color">` su tamna boja pozadine aplikacije (`#020617`); meta se menja sa temom (svetla tema `#f8fafc`). Ikone su nove: plavi logo (izlazak sunca) na tamnoj pozadini; `scripts/make-icons.mjs` ih pravi iz `public/icon.svg`.
7. **Sopstveni izbornici:** `Select` otvara donji panel (`Sheet`) sa animacijom umesto sistemskog menija. Polja imaju `autocomplete="off"`.
8. **Birač vremena:** točkići sati : minuti; 24h podrazumevano, 12h (AM/PM) u podešavanjima. Sačuvana vrednost je uvek `HH:mm`; prikaz na ekranu Danas, u planeru i u terminima prati izabrani format.
9. **Datum:** Android birač ostaje (nevidljivo polje preko teksta), prikaz je uvek DD.MM.GGGG.
10. **Trajanje:** jedna funkcija `formatDuration`/`formatHours` („2 h 36 min", „7 min", „2 h").
11. **Ekran Danas:** Trenutno (veliko, plavo) i Sledeće (manje, sa odbrojavanjem) → Obaveze → označeni brzi unos → vremenska linija → nivo/XP/nagrada. Podnaslov: „Vukašin, danas: …".
12. **Obavezna/opciona polja:** `Field` ima `required` (diskretna zvezdica), `optional` („(opciono)") i `error` (crveni okvir i poruka samo posle pokušaja). Oznake su CSS, pa naziv polja ostaje čist za čitače ekrana i testove. Dugmad koja su ćutala (prazan brzi unos, pitanja AI-ju, forme) sada prijavljuju grešku.
13. **Dugi pritisak:** `user-select: none` na fiksnim tekstovima; tekst korisnika (`.user-text`) i polja se mogu kopirati.
14. **Animacije:** prelazi između ekrana, paneli, poruke; `prefers-reduced-motion` ih gasi (e2e testovi rade sa uključenim smanjenim kretanjem).

## Šta NIJE urađeno ili nije potpuno (iskreno)
1. **Pravi odgovor modela nije testiran** jer nemam API ključ. Mreža, CORS i odbijanje lošeg ključa jesu provereni na pravom API-ju (vidi popravke gore), ali nikad nije stigao pravi odgovor sa ključem. Pri prvom pravom pozivu proveri da radi.
2. **Zaglavlje za pozive iz pregledača** (`anthropic-dangerous-direct-browser-access: true`) radi: pravi API ga prihvata u preflight-u. Ako ipak dođe do blokade, aplikacija javlja „offline / blokirano" i nudi ručni režim.
3. **Nazivi modela i cene** (`claude-haiku-5-5` $0.10/$0.50, `claude-sonnet-5-5` $2/$10 po milion tokena) i verzija `2026-10-21` potvrđeni su u Anthropic-ovoj referenci za API (keš od 6. 10. 2026). Haiku iznad 100K tokena u jednom zahtevu košta $0.50/$2.50, što procena ne računa; tako veliki zahtevi ovde nisu očekivani. Za druge modele nema procene u dolarima. Procena računa sve tokene po ceni jačeg modela (gornja granica).
4. **Podaci sa pametnog sata:** nema uvoza fajla jer nisam mogao da potvrdim format izvoza ni da Health Kit radi bez servera (vidi `docs/SMARTWATCH.md`). San se unosi ručno.
5. **GitHub Actions:** `ci.yml` i `deploy.yml` su provereni preko GitHub API-ja. Oba rade; jedan povremeni pad e2e testa opisan je u popravkama.
6. **Notifikacije nisu probane na telefonu.** Logika (`dueReminders`) je testirana, ali prikaz notifikacija zavisi od pregledača. `.ics` izvoz je pouzdaniji.
7. **Ograničenja funkcija:**
   - Izmena ponavljajuće aktivnosti kroz formu menja ceo niz; „samo ovaj dan" postoji za uklanjanje i za skraćenje pred ispit.
   - Šabloni treninga: sopstveni se čuvaju po nazivu (isti naziv ga prepisuje); nema promene redosleda.
   - Rezime nedelje se ne generiše sam: u nedelju uveče na ekranu Danas stoji link ka AI stranici.
   - Planer je pravilima vođen, ne optimizator; dnevni limit učenja je tvrd (višak prelazi na sledeći dan ili se prijavljuje porukom).
   - Brzi unos razume samo jednostavne rečenice na srpskom i engleskom (vidi `quickParse.test.ts` i `i18n.test.ts`); složenije ide kroz AI. Ostali jezici imaju prevod interfejsa, ali parser razume samo srpski i engleski.
   - **Prevodi:** engleski prevod je pisan ručno i nije ga pregledao izvorni govornik; ćirilica se izvodi automatski iz latinice (kratke engleske reči i oznake poput „XP" i „AI" ostaju latinicom). Stari sačuvani podaci (npr. ime plana treninga ili naslov demo aktivnosti) ostaju na jeziku na kojem su nastali, jer su to podaci korisnika, a ne tekst interfejsa.
   - Skala ocenjivanja (51–100 → 6–10) je srpska i u engleskoj verziji ostaje ista; ESPB se prikazuje kao ECTS.
8. **Pristupačnost:** axe (automatska provera) ne nalazi greške WCAG A/AA, ali nije zamena za ručno testiranje čitačem ekrana.
9. **Putanja projekta** je `C:\Projects\my-ai-app`, a ne `C:\Projekti\my-day-ai` (Claude Code je već bio pokrenut tu).
10. Verzije paketa su najnovije u trenutku instalacije (osim React 18, kako zadatak traži). `npm audit --omit=dev` ne nalazi ništa; 15 upozorenja (2 niska, 13 umerenih) je samo u razvojnim alatima (eslint lanac), ne ulaze u objavljenu aplikaciju. `npm audit fix` ih ne rešava, a `--force` nisam koristio.

## Poznati problemi
- Prvi `git push` je tražio prijavu; posle toga radi sam.
- Kad je podatak iz perioda pre prve upotrebe aplikacije (npr. sat sna od juče), prosek 7 dana ga ne vidi dok ga ne uneseš.
- Ako IndexedDB nije dostupan (privatni prozor), aplikacija radi, ali podaci se ne pamte (upozorenje je u konzoli).

## 5 ideja za verziju 2
1. **Sinhronizacija između uređaja** (npr. enkriptovan backup u sopstvenom cloud-u ili Supabase/Firebase) da telefon i laptop dele podatke.
2. **Google Calendar integracija**: dvosmerna sinhronizacija umesto jednokratnog `.ics` izvoza.
3. **Uvoz sna sa pametnog sata**: zatražiti pravi izvoz podataka (npr. iz Huawei Health) i napraviti uvoz; kasnije Health Kit preko malog servera (OAuth).
4. **Server za push notifikacije** (Web Push + serverless funkcija) da podsetnici stižu i kad je aplikacija zatvorena, i automatski nedeljni rezime.
5. **Pametniji planer**: ponavljajuće aktivnosti u formi, ručno prevlačenje blokova na liniji dana, učenje iz navika (kad stvarno učiš, koliko stvarno traje) i „šta ako" simulacija pred ispit.
