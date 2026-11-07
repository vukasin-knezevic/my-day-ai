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

## Šta NIJE urađeno ili nije potpuno (iskreno)
1. **Pravi API pozivi nisu testirani.** AI sloj je testiran samo sa lažnim (mock) odgovorima, kako zadatak traži. Nikad nisam poslao zahtev sa pravim ključem. Pri prvom pravom pozivu proveri da radi; poruka o grešci će reći šta je pogrešno.
2. **Zaglavlje za pozive iz pregledača** (`anthropic-dangerous-direct-browser-access: true`) potvrđuju samo nezvanični izvori (Simon Willison, DEV članci); nije na zvaničnoj stranici API pregleda. Vrednost `anthropic-version: 2026-10-21` je iz zvanične stranice. Ako Anthropic odbije poziv iz pregledača (CORS), aplikacija javlja „offline / blokirano" i nudi ručni režim.
3. **Nazivi modela** (`claude-haiku-5-5`, `claude-sonnet-5-5`) su iz referentne tabele koju koristi Claude Code, a ne iz javne dokumentacije koju sam otvorio. Menjaju se u Podešavanja → AI. Cene u proceni potrošnje (Haiku 5.5 $0.10/$0.50, Sonnet 5.5 $2/$10 po milion tokena) su iz iste tabele; za druge modele nema procene u dolarima. Procena računa sve tokene po ceni jačeg modela (gornja granica).
4. **Podaci sa pametnog sata:** nema uvoza fajla jer nisam mogao da potvrdim format izvoza ni da Health Kit radi bez servera (vidi `docs/SMARTWATCH.md`). San se unosi ručno.
5. **GitHub Actions:** `deploy.yml` je pokrenut i objava na Pages radi (stranica odgovara). Status `ci.yml` (lint, typecheck, testovi, e2e na GitHub-ovom računaru) proveri na stranici Actions, jer sam ga pratio samo preko javnog API-ja.
6. **Notifikacije nisu probane na telefonu.** Logika (`dueReminders`) je testirana, ali prikaz notifikacija zavisi od pregledača. `.ics` izvoz je pouzdaniji.
7. **Ograničenja funkcija:**
   - Izmena ponavljajuće aktivnosti kroz formu menja ceo niz; „samo ovaj dan" postoji za uklanjanje i za skraćenje pred ispit. Brzi unos ne pravi ponavljajuće aktivnosti, samo forma.
   - Šabloni treninga: sopstveni se čuvaju po nazivu (isti naziv ga prepisuje); nema promene redosleda.
   - Rezime nedelje se ne generiše sam: u nedelju uveče na ekranu Danas stoji link ka AI stranici.
   - Planer je pravilima vođen, ne optimizator; dnevni limit učenja je tvrd (višak prelazi na sledeći dan ili se prijavljuje porukom).
   - Brzi unos razume samo jednostavne rečenice na srpskom i engleskom (vidi `quickParse.test.ts` i `i18n.test.ts`); složenije ide kroz AI. Ostali jezici imaju prevod interfejsa, ali parser razume samo srpski i engleski.
   - **Prevodi:** engleski prevod je pisan ručno i nije ga pregledao izvorni govornik; ćirilica se izvodi automatski iz latinice (kratke engleske reči i oznake poput „XP" i „AI" ostaju latinicom). Stari sačuvani podaci (npr. ime plana treninga ili naslov demo aktivnosti) ostaju na jeziku na kojem su nastali, jer su to podaci korisnika, a ne tekst interfejsa.
   - Skala ocenjivanja (51–100 → 6–10) je srpska i u engleskoj verziji ostaje ista; ESPB se prikazuje kao ECTS.
8. **Pristupačnost:** axe (automatska provera) ne nalazi greške WCAG A/AA, ali nije zamena za ručno testiranje čitačem ekrana.
9. **Putanja projekta** je `C:\Projects\my-ai-app`, a ne `C:\Projekti\my-day-ai` (Claude Code je već bio pokrenut tu).
10. Verzije paketa su najnovije u trenutku instalacije (osim React 18, kako zadatak traži). `npm audit` prijavljuje upozorenja u razvojnim zavisnostima; nisam ih „forsirao" (`--force`) da ne pokvarim projekat.

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
