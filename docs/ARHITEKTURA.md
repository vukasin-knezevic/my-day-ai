# Arhitektura

Glavna ideja: **sva pametna logika je u čistim funkcijama u `src/lib/`** (bez React-a, bez pristupa pregledaču), a React ekrani samo čitaju stanje i prikazuju rezultat. Zato se logika lako testira (iste ulaze uvek daju isti izlaz).

## Tok podataka

```mermaid
flowchart LR
    U[Korisnik] -->|brzi unos, forme, klikovi| P[pages/ ekrani]
    P -->|actions: add / update / award| S[(Zustand store)]
    S <-->|persist, try/catch| IDB[(IndexedDB)]
    S -->|selectData| P
    P -->|poziva| L[lib/ čista logika]
    L -->|rezultat: predlozi, upozorenja, XP| P
    P -->|t ključ| I[i18n: locales/*.ts]
    L -->|t ključ| I

    subgraph lib
      QP[quickParse] --- PL[planner]
      PL --- SC[schedule]
      XP[xp] --- OV[overview]
    end

    subgraph AI sloj lib/ai
      PR[prompt.ts] --> API[client.ts fetch]
      PR --> MAN[Kopiraj za Claude]
      API --> EX[extract.ts + zod]
      PASTE[Nalepi odgovor] --> EX
      EX --> AP[apply.ts]
    end

    P --> PR
    AP -->|predlozi suggested:true| S
    API -.HTTPS.-> ANT[Anthropic Messages API]
    MAN -.ručno.-> CL[claude.ai]
    CL -.nalepljen JSON.-> PASTE
```

## Slojevi

| Sloj    | Fajlovi                          | Uloga                                                                                             |
| ------- | -------------------------------- | ------------------------------------------------------------------------------------------------- |
| Tipovi  | `src/types.ts`                   | jedan izvor istine za sve podatke                                                                 |
| Jezici  | `src/i18n/`                      | `t('ključ')`, fajlovi prevoda u `locales/`, izbor jezika; srpska ćirilica se izvodi iz latinice   |
| Stanje  | `src/store.ts`, `lib/storage.ts` | Zustand; `persist` u IndexedDB; sve u try/catch                                                   |
| Logika  | `src/lib/*.ts`                   | čiste funkcije: parser, planer, ocene, XP, ics, podsetnici                                        |
| AI      | `src/lib/ai/*`                   | prompt → (API ili ručno) → izvlačenje JSON-a → `zod` → predlog                                    |
| UI      | `src/pages`, `src/components`    | React ekrani i zajednički elementi (`NumberInput` za sva brojčana polja, `KeyScope` za Enter/Esc) |
| Testovi | `*.test.ts(x)`, `e2e/`           | Vitest (unit, komponente), Playwright + axe (e2e)                                                 |

## Jezici (i18n)

- **Jedan fajl = jedan jezik.** `src/i18n/locales/*.ts` se otkrivaju automatski (`import.meta.glob`); fajl izvozi `code`, `name`, `dateLocale` (date-fns) i `messages`. Spisak ključeva je `sr-Latn.ts`; TypeScript i test (`i18n.test.ts`) padaju ako drugom jeziku neki ključ ili `{parametar}` fali.
- **`t(ključ, parametri)`** radi i van Reacta, pa čista logika u `lib/` (upozorenja, planer, prompt) vraća tekst na izabranom jeziku. `useT()` ponovo iscrtava ekran kad se jezik promeni. Množina: ključevi `.one/.few/.other` preko `Intl.PluralRules`.
- **Unutrašnji ID-evi se ne prevode.** Kategorije, tipovi i statusi u podacima ostaju isti (`'kolokvijum'`, `'ne-idem'`...), a prevode se samo oznake (`lib/labels.ts`). Zato promena jezika ne menja sačuvane podatke.
- **Podrazumevane vrednosti zavise od jezika.** Prazno ime nagrade i valute znače „podrazumevano za izabrani jezik".

## Migracija podataka

Sačuvani podaci imaju verziju (`DATA_VERSION`). `migrateData()` u `lib/defaults.ts` pretvara stari oblik u novi (npr. `ps5EarnedMin` → `rewardEarnedMin`). Pokreće se pri učitavanju iz IndexedDB-a i pri uvozu JSON-a, čista je funkcija i bezbedno se pokreće više puta.

## Zašto ovako

- **Dva AI režima, jedan kod.** Ručni i API režim dele `buildPrompt`, `parseAiResponse` i prikaz. Razlika je samo u tome ko šalje prompt (ja kopiranjem, ili `fetch`).
- **AI nikad ne menja podatke direktno.** Rezultat postaje _predlog_ (`suggested: true`, isprekidana ivica) koji korisnik prihvata.
- **Validacija na granici.** Sve što dolazi spolja (AI odgovor, uvezeni JSON) prolazi proveru pre nego što dodirne store.
- **Idempotentan XP.** Svaki događaj ima `id`; isti `id` nikad ne daje XP dvaput (`progress.awarded`).
- **Offline.** `vite-plugin-pwa` kešira aplikaciju; podaci su u IndexedDB; samo AI poziv traži internet.
- **Tastatura svuda.** `KeyScope` daje Enter (potvrdi) i Esc (otkaži) koraku, formi ili dijalogu; u višeredom polju Enter pravi novi red (potvrda je Ctrl+Enter).
- **Bez servera.** Zato su notifikacije ograničene (vidi README), a `.ics` izvoz je rezerva.

## Planer (`lib/planner.ts`)

1. Za svaki dan: slobodni intervali = prozor (buđenje–spavanje) minus zauzeto (aktivnosti + časovi koje pohađam).
2. Biranje lakšeg dana, skraćivanje treninga na dan pred ispit, raspoređivanje novih treninga.
3. Potražnja za učenjem po ispitu: težina određuje koliko dana ranije se kreće i da li je ravnomerno ili raste ka ispitu.
4. Blokovi do 2 h, pauza 30 min, prvo u terminima „ne idem", ograničenje dnevnog učenja; višak se prenosi na sledeći dan.
5. Igra kao nagrada posle poslednjeg bloka učenja.
