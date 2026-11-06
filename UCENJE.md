# UCENJE — vodič kroz projekat (za nekoga ko zna osnove Pythona)

## 1. Šta su React, TypeScript i komponenta

**JavaScript** je jezik pregledača. **TypeScript** je JavaScript sa tipovima: kao da u Pythonu pišeš `def f(x: int) -> str`, ali ovde tipove proverava alat (`npm run typecheck`) pre pokretanja i greška se vidi odmah.

| Python | Ovaj projekat (TypeScript) |
|---|---|
| `@dataclass class Subject: name: str` | `interface Subject { name: string }` u `types.ts` |
| `list[dict]` | `Subject[]` (niz objekata) |
| `requirements.txt` | `package.json` |
| `pip install x` | `npm install x` |
| `pytest` | Vitest (`npm test`) |
| rečnik `{"a": 1}` | objekat `{ a: 1 }` |
| `None` | `null` / `undefined` |
| list comprehension | `.map()`, `.filter()` |
| `f"Zdravo {ime}"` | `` `Zdravo ${ime}` `` |

**React** gradi ekran od **komponenti**. Komponenta je obična funkcija koja vraća „opis ekrana" (JSX, nalik HTML-u):

```tsx
function Pozdrav({ ime }: { ime: string }) {      // kao def pozdrav(ime): ...
  return <h1>Zdravo, {ime}!</h1>
}
```
Kad se podaci promene, React sam ponovo pozove funkciju i osveži ekran. Podaci koji se menjaju zovu se **stanje** (`useState`, a u ovom projektu deljeno stanje je u **Zustand store-u**).

Ključna ideja projekta: **logika je odvojena od izgleda**. Pametni deo (parser, planer, ocene, XP) su obične funkcije u `src/lib/` koje bi radile i u Pythonu; React ekrani ih samo pozovu i prikažu rezultat.

## 2. Redosled čitanja fajlova
1. `src/types.ts` — svi pojmovi aplikacije (Subject, Assessment, Activity…). Počni ovde.
2. `src/lib/dates.ts` — pomoćne funkcije za datume (kratko).
3. `src/lib/quickParse.ts` + `quickParse.test.ts` — parser rečenice u aktivnost; testovi pokazuju šta radi.
4. `src/lib/planner.ts` + `planner.test.ts` — algoritam planiranja (najzanimljiviji za razgovor).
5. `src/lib/schedule.ts`, `grades.ts`, `exams.ts` — šta je na rasporedu, ocene, prijave.
6. `src/lib/xp.ts`, `life.ts`, `workout.ts` — XP, san/novac/navike, rekordi.
7. `src/store.ts` — gde živi stanje i kako se čuva (IndexedDB).
8. `src/lib/ai/` — `prompt.ts` → `client.ts` → `extract.ts` → `schemas.ts` → `apply.ts`.
9. `src/pages/Today.tsx` — kako ekran koristi sve to. Zatim ostali ekrani.
10. `e2e/app.spec.ts` — kako izgleda test koji klika kao korisnik.

Pravilo čitanja: za svaku funkciju prvo pročitaj njen test (`*.test.ts`), jer tu piše šta bi trebalo da radi.

## 3. 10 pitanja sa razgovora za praksu (i kratki odgovori)

**1. Šta aplikacija radi i zašto si je pravio?**
Lični planer dana za studenta. Najveći problem koji sam hteo da rešim je zaboravljena prijava kolokvijuma, pa je to prvo upozorenje na ekranu. Ostalo (učenje, trening, san, novac) se slaže oko obaveza.

**2. Zašto TypeScript, a ne običan JavaScript?**
Tipovi hvataju greške pre pokretanja (npr. pogrešno ime polja) i služe kao dokumentacija. Imam jedan fajl `types.ts` koji je izvor istine za sve podatke.

**3. Gde ti je pametna logika i zašto je odvojena od React-a?**
U `src/lib/` kao čiste funkcije (isti ulaz daje isti izlaz, bez pristupa pregledaču). Tako se lako testiraju (preko 200 testova) i ne zavise od izgleda.

**4. Kako radi planer?**
Za svaki dan izračuna slobodne intervale (od buđenja do spavanja minus zauzeto). Za svaki kolokvijum razdeli potrebne sate na dane pre njega: teži ispit počinje ranije. Blokovi su do 2 h sa pauzom, poštuje se dnevni limit, bira se lakši dan, trening se skraćuje dan pred ispit, a igra je nagrada. Rezultat su *predlozi* koje korisnik prihvata.

**5. Kako si rešio da AI ne pokvari podatke?**
AI nikad direktno ne piše u store. Odgovor prođe `zod` šemu (provera tipova u vreme izvršavanja); tek ispravan JSON postaje predlog sa isprekidanom ivicom, koji korisnik prihvata. Ako je JSON loš, korisnik dobija poruku šta da zatraži od Claude-a.

**6. Zašto postoje dva AI režima?**
Ručni (kopiraš prompt u claude.ai i nalepiš odgovor) je besplatan i za svakodnevnu upotrebu; API je za automatizaciju. Oba koriste isti kod za prompt, proveru i prikaz, pa nema dupliranja.

**7. Gde se čuva API ključ i kako si to rešio bezbedno?**
Samo lokalno u IndexedDB-u tog uređaja, nikad u kodu ni u gitu (`.env*` je u `.gitignore`). Izvoz podataka ga ne sadrži. U aplikaciji piše upozorenje da je ključ vidljiv u pregledaču. Pošteno ograničenje: bez servera ne može bolje; za pravu zaštitu treba backend koji čuva ključ.

**8. Kako radi čuvanje podataka i offline režim?**
Zustand `persist` upisuje stanje u IndexedDB (u try/catch, da aplikacija radi i kad pregledač to zabrani). PWA (`vite-plugin-pwa`) kešira fajlove, pa aplikacija radi bez interneta; samo AI poziv traži vezu.

**9. Kako si testirao?**
Tri nivoa: unit testovi čiste logike (Vitest, pokrivenost `lib/` oko 93%), komponentni testovi (Testing Library) i end-to-end u pravom Chromium-u (Playwright), plus automatska provera pristupačnosti (axe). AI je testiran sa lažnim odgovorima, uključujući neispravan JSON. Axe je našao stvarne probleme sa kontrastom koje sam popravio.

**10. Koja su ograničenja i šta bi radio dalje?**
Nema servera, pa notifikacije na telefonu nisu pouzdane (zato `.ics` izvoz); nema sinhronizacije između uređaja; san sa pametnog sata se unosi ručno jer nisam mogao da potvrdim format izvoza (vidi `docs/SMARTWATCH.md`). Dalje: sinhronizacija, Google Calendar, push notifikacije preko servera, pametniji planer. I da sam deo koda pisao uz Claude Code, ali da razumem arhitekturu i mogu da objasnim svaku odluku.

## 4. Kako da učiš iz ovog projekta
- Promeni jedno pravilo u `planner.ts` (npr. `MAX_STUDY_BLOCK`), pokreni `npm test` i vidi koji testovi pucaju i zašto.
- Dodaj jednu rečenicu u `quickParse.test.ts` koja ne radi, pa popravi parser dok ne prođe.
- Pročitaj `DNEVNIK.md` redom: za svaku fazu piše šta je napravljeno i šta si naučio.

## 5. Novo u verziji 1.1: tri ideje koje vredi razumeti

### Šta je i18n (internacionalizacija)
**i18n** znači da aplikacija ne drži tekst u kodu, nego u fajlovima prevoda. U Pythonu bi to bio rečnik po jeziku:

```python
PREVODI = {"en": {"save": "Save"}, "sr-Latn": {"save": "Sačuvaj"}}
def t(kljuc): return PREVODI[jezik][kljuc]
```
Ovde je isto: `t('common.add')` vrati „Dodaj" ili „Add", zavisno od izabranog jezika. Fajlovi su u `src/i18n/locales/`. Novi jezik = novi fajl, bez menjanja koda, jer aplikacija sama pronađe sve fajlove u toj fascikli. Test `i18n.test.ts` proverava da svaki jezik ima **iste ključeve** i iste `{parametre}`, kao `assert set(en) == set(sr)` u pytest-u. Datumi i brojevi se ne prevode ručno nego ih formatiraju `date-fns` locale i `Intl` (ugrađeno u pregledač). Množina („1 dan, 2 dana, 5 dana") ima tri oblika u srpskom, pa ključevi imaju nastavke `.one`, `.few`, `.other`.

### Šta je migracija podataka
Kad promeniš oblik sačuvanih podataka (npr. polje `ps5EarnedMin` postane `rewardEarnedMin`), ljudi koji već imaju stare podatke ne smeju da ih izgube. **Migracija** je funkcija koja stari oblik pretvori u novi. U projektu je to `migrateData()` u `lib/defaults.ts`: čista funkcija koja premesti polja i može da se pokrene više puta bez štete. Pokreće se pri učitavanju iz IndexedDB-a i pri uvozu JSON-a. Slično je Django migracijama ili `ALTER TABLE` u bazama, samo što su ovde podaci u pregledaču.

### Kako radi zajednička `NumberInput` komponenta
Običan `<input type="number">` u Reactu pravi grešku: kad obrišeš broj, kod ga pretvori u `0`, pa kad ukucaš `3` dobiješ `03`. `NumberInput` zato **čuva ono što kucaš kao tekst** (`"3"`, ili prazno), a roditelju uvek šalje ispravan broj ograničen na `min`/`max`. Polje sme da bude prazno dok kucaš; kad ga napustiš, tekst se uskladi sa sačuvanom vrednošću. Zato popravka važi svuda gde se komponenta koristi: jedna komponenta umesto petnaest kopija iste greške. Za polja koja smeju da budu prazna (npr. „poeni" koji još nisu uneseni) postoji `onEmpty`, koji sačuva `null`.

U istom duhu je `KeyScope`: mala komponenta koja daje `Enter` (potvrdi) i `Esc` (otkaži) jednom koraku ili dijalogu, pa se tastatura ponaša isto svuda.

