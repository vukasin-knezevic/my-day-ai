# Zadatak za Claude Code: My Day AI — verzija 1.1 (popravke + opšta verzija)

> Pokretanje: u istoj Claude Code sesiji ili novoj, u folderu `C:\Projects\my-ai-app`, napiši:
> **„Pročitaj MY_DAY_AI_V2_ZADATAK.md i uradi ceo zadatak samostalno, deo po deo, bez zaustavljanja između delova."**

Važe sva pravila iz `MY_DAY_AI_ZADATAK.md` (sekcije 1 i 1b): radi samostalno, posle svakog dela lint + typecheck + test, commit, `git push origin main`, kratak unos u DNEVNIK.md, ne izmišljaj moje podatke, nikad `--force`. Fajlove menjaj alatima Edit/Write (ne PowerShell-om), sve u UTF-8.

Napravi `PLAN_V2.md` sa delovima ispod i štikliraj ih kako ih završavaš.

---

## Deo 1 — 🐞 Popravke koje sam primetio koristeći aplikaciju

1. **Tastatura u svim koracima, formama i dijalozima**
   - **Enter** = „Dalje" / „Sačuvaj" / „Potvrdi" (onboarding, forme, dijalozi). Sada mora da se klikne mišem.
   - **Esc** = „Nazad" / „Otkaži" / zatvori dijalog.
   - Ne sme da se okine dok je fokus u višeredom polju (textarea), osim Ctrl+Enter.
   - Dodaj testove (Testing Library i bar jedan Playwright test za onboarding samo tastaturom).
2. **Polja za brojeve, greška sa nulom**
   - Kad obrišem broj, pojavi se `0`, a kad zatim ukucam npr. `3`, piše `03`.
   - Popravka: polje sme da bude prazno dok kucam, bez vodećih nula, a vrednost se proverava (min/max) tek pri čuvanju ili napuštanju polja. Napravi jednu zajedničku komponentu `NumberInput` i koristi je svuda.
   - Testovi: prazno polje, `3` posle brisanja, decimale gde treba, min/max.
3. **Preostale stavke iz `IZVESTAJ.md`, dela „Šta NIJE urađeno"**: koliko god stigneš, a obavezno:
   - **izmena postojeće aktivnosti** (ne samo brisanje),
   - **ponavljajuće aktivnosti** u formi (dnevno / radnim danima / nedeljno),
   - čuvanje **sopstvenih šablona treninga**.

## Deo 2 — 🌍 Opšta verzija (za sve korisnike, ne samo za mene)

Aplikacija treba da bude proizvod koji može da koristi bilo koji student, a ja je podešavam za sebe kroz podešavanja.

1. **Nagrada umesto „PS5 vremena"**
   - U kodu, podacima i tekstu ukloni „PS5" kao fiksni pojam. Uvedi **nagradu koju korisnik sam imenuje** (podešavanja i onboarding), npr. „Vreme za igrice", „Epizoda serije", „Izlazak".
   - Podrazumevano ime: **„Vreme za zabavu"**, a emotikon bira korisnik (podrazumevano 🎮).
   - Odnos „X min nagrade po satu učenja" ostaje podesiv.
   - Ja ću sebi u podešavanjima upisati „PS5 vreme".
   - Migracija: postojeći sačuvani podaci moraju i dalje da rade.
2. **Bez mojih ličnih detalja u opštoj verziji**: demo podaci, tekstovi, prompt za AI i README ne smeju da pominju mene, ETF, „Novembar" ili moj sat kao fiksne stvari. Fakultet, mesec i slično neka se računaju ili podešavaju (npr. „Prijave za [tekući mesec]").
3. **Onboarding: izbor AI režima**
   - Novi korak: **Ručni (besplatno)** ili **API (plaća se po upotrebi)**, sa kratkim objašnjenjem razlike i linkom za više.
   - Ako izabere API: polje za ključ (može i kasnije) i upozorenje o bezbednosti ključa.
   - Može da se promeni u podešavanjima.

## Deo 3 — 🗣️ Više jezika

1. Uvedi **i18n** tako da je dodavanje novog jezika samo novi fajl sa prevodima, bez menjanja koda.
   - Svi tekstovi iz interfejsa idu u fajlove prevoda (npr. `src/i18n/sr-Latn.ts`, `en.ts`), a u komponentama nema tvrdo upisanog teksta.
   - Jezici za početak: **srpski (latinica)**, **engleski**, i ako stigneš **srpski (ćirilica)**.
   - Izbor jezika u onboardingu i podešavanjima, pamti se. Podrazumevano po jeziku pregledača.
   - Datumi, dani u nedelji i formati brojeva prate izabrani jezik (date-fns locale).
   - **AI prompt i odgovori** na izabranom jeziku. Brzi unos (parser) neka razume bar srpski i engleski.
2. **Test koji pada** ako nekom jeziku fali neki ključ prevoda.
3. Proveri da se ništa ne lomi u izgledu kad je tekst duži (engleski / ćirilica), na telefonu i laptopu (Playwright screenshot-ovi).
4. U README objasni kako se dodaje novi jezik (3 koraka).

## Deo 4 — 📄 README kao opšti proizvod

README treba da izgleda kao opis proizvoda za bilo koga, uz kratku ličnu priču, ne kao uputstvo meni.

1. Na vrh stavi **link ka živoj aplikaciji**: https://vukasin-knezevic.github.io/my-day-ai/ (dugme ili badge „Live demo") i badge za CI.
2. Kratka lična priča (2–3 rečenice): napravio sam je kao student za svoj dan, pa je pretvorio u opštu aplikaciju za studente. Rečenica „Aplikaciju sam osmislio i dizajnirao ja, a kod sam pisao uz Claude Code" ostaje.
3. **Ukloni delove koji su instrukcije meni**, npr. „Objava na GitHub Pages: Workflow … je već u projektu. Da se stranica uključi, jednom uradi ovo…". Pages je već uključen, pa umesto toga kratko: „Automatski se objavljuje na GitHub Pages pri svakom push-u na main."
4. Bez „PS5", „Novembar" i drugih mojih detalja: piši „nagrada koju sam biraš (npr. vreme za igrice)", „prijave za tekući mesec" i slično.
5. Dodaj sekciju **„Jezici"** i **„Kako dodati jezik"**.
6. Ažuriraj screenshot-ove (svetla i tamna tema, telefon i laptop, bar jedan na engleskom).
7. Isto za englesku polovinu README-a.
8. Proveri i `docs/ARHITEKTURA.md` i `UCENJE.md`, da prate nove promene.

## Deo 5 — ✅ Završetak

1. Svi testovi prolaze, build bez upozorenja, sve je na GitHub-u (GitHub Pages se sam ažurira).
2. Ažuriraj `IZVESTAJ.md`: šta je novo u 1.1, šta i dalje nije urađeno.
3. U `UCENJE.md` dodaj kratko objašnjenje: šta je i18n, šta je migracija podataka i kako radi zajednička `NumberInput` komponenta.
