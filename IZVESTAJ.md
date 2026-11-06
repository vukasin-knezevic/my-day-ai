# IZVEŠTAJ — My Day AI

Datum završetka: 2026-11-06. Repozitorijum: https://github.com/vukasin-knezevic/my-day-ai

## Kako da pokreneš
- `npm run dev` → **http://localhost:5173**
- Telefon na istoj Wi-Fi mreži: **http://192.168.1.15:5173** (ili http://192.168.1.16:5173 preko kabla). Ako ne otvara, Windows Firewall verovatno blokira Node.js: dozvoli ga za „Privatne mreže".
- Instalacija na telefon (PWA) traži HTTPS ili localhost, pa radi tek kad se objavi na GitHub Pages (https://vukasin-knezevic.github.io/my-day-ai/). Na običnom `http://192.168…` aplikacija radi, ali „Dodaj na početni ekran" i offline režim ne.

## Stanje provera (poslednje pokretanje)
| Provera | Rezultat |
|---|---|
| `npm run lint` | prolazi, 0 grešaka |
| `npm run typecheck` | prolazi (TypeScript strict) |
| `npm test` | **219 unit/komponentnih testova prolazi** (parser 34, planer 33, AI sloj 24 + stranice…) |
| Pokrivenost `src/lib/` | **~93% linija** (cilj 80%) |
| Playwright e2e | **16 testova prolazi** (cilj 10), uključujući axe proveru pristupačnosti za 9 ekrana × svetla/tamna tema |
| `npm run build` | bez upozorenja |

## Šta je urađeno (faze 0–12)
Sve faze iz zadatka su implementirane i pushovane (svaka u svom commit-u, vidi `git log` i `PLAN.md`):
0. Priprema (Node, Git instalirani preko winget-a, repo povezan), 1. model podataka + onboarding, 2. ekran Danas + parser, 3. Faks, 4. planer, 5. trening i ishrana, 6. san/novac/navike + Huawei istraživanje, 7. XP/nivoi/nizovi/PS5, 8 i 8b. AI (API + ručni režim), 9. podsetnici, .ics i pregledi, 10. izvoz/uvoz, pristupačnost, prečice, e2e, screenshot-ovi, 11. README (sr/en), arhitektura, MIT, CI i Pages workflow-i, 12. ovaj izveštaj i `UCENJE.md`.

## Šta NIJE urađeno ili nije potpuno (iskreno)
1. **Pravi API pozivi nisu testirani.** AI sloj je testiran samo sa lažnim (mock) odgovorima, kako zadatak traži. Nikad nisam poslao zahtev sa pravim ključem. Pri prvom pravom pozivu proveri da radi; poruka o grešci će reći šta je pogrešno.
2. **Zaglavlje za pozive iz pregledača** (`anthropic-dangerous-direct-browser-access: true`) potvrđuju samo nezvanični izvori (Simon Willison, DEV članci); nije na zvaničnoj stranici API pregleda. Vrednost `anthropic-version: 2026-10-21` je iz zvanične stranice. Ako Anthropic odbije poziv iz pregledača (CORS), aplikacija javlja „offline / blokirano" i nudi ručni režim.
3. **Nazivi modela** (`claude-haiku-5-5`, `claude-sonnet-5-5`) su iz referentne tabele koju koristi Claude Code, a ne iz javne dokumentacije koju sam otvorio. Menjaju se u Podešavanja → AI. Cene u proceni potrošnje (Haiku 5.5 $0.10/$0.50, Sonnet 5.5 $2/$10 po milion tokena) su iz iste tabele; za druge modele nema procene u dolarima. Procena računa sve tokene po ceni jačeg modela (gornja granica).
4. **Huawei sat:** nema uvoza fajla jer nisam mogao da potvrdim format izvoza ni da Health Kit radi bez servera (vidi `docs/HUAWEI.md`). San se unosi ručno.
5. **GitHub Actions workflow-i nikad nisu pokrenuti** (nisam smeo da menjam podešavanja repozitorijuma). `ci.yml` pokreće lint, typecheck, testove i e2e; `deploy.yml` objavljuje na Pages tek kad jednom uključiš: **Settings → Pages → Source: GitHub Actions**. Moguće je da CI traži sitne ispravke pri prvom pokretanju.
6. **Notifikacije nisu probane na telefonu.** Logika (`dueReminders`) je testirana, ali prikaz notifikacija zavisi od pregledača. `.ics` izvoz je pouzdaniji.
7. **Ograničenja funkcija:**
   - Nema ekrana za izmenu postojeće aktivnosti (može brisanje i novi unos) niti za pravljenje ponavljajućih aktivnosti (tip podržava `daily/weekdays/weekly`, ali parser i forma ih ne prave).
   - Šabloni treninga su „Ponovi poslednji" i gotovi splitovi; nema čuvanja sopstvenih šablona.
   - Rezime nedelje se ne generiše sam: u nedelju uveče na ekranu Danas stoji link ka AI stranici.
   - Planer je pravilima vođen, ne optimizator; dnevni limit učenja je tvrd (višak prelazi na sledeći dan ili se prijavljuje porukom).
   - Brzi unos razume samo jednostavne rečenice (vidi `quickParse.test.ts` za šta tačno); složenije ide kroz AI.
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
3. **Huawei integracija**: zatražiti pravi izvoz podataka i napraviti uvoz sna; kasnije Health Kit preko malog servera (OAuth).
4. **Server za push notifikacije** (Web Push + serverless funkcija) da podsetnici stižu i kad je aplikacija zatvorena, i automatski nedeljni rezime.
5. **Pametniji planer**: ponavljajuće aktivnosti u formi, ručno prevlačenje blokova na liniji dana, učenje iz navika (kad stvarno učiš, koliko stvarno traje) i „šta ako" simulacija pred ispit.
