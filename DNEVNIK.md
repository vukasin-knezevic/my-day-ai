# DNEVNIK — šta sam naučio

## Faza 0 — Priprema
Instalirali smo Node.js (pokreće JavaScript van pregledača i daje `npm`, menadžer paketa kao `pip` u Pythonu) i Git (pamti istoriju koda). Napravljen je Vite projekat: Vite je alat koji pokreće aplikaciju dok je razvijaš. `package.json` je kao `requirements.txt`, samo sa skriptama (`npm run test`). Naučio si da `.gitignore` služi da tajne (API ključ) nikad ne završe na GitHub-u.

## Faza 1 — Osnova i model podataka
Svi podaci aplikacije opisani su u `src/types.ts`: to je kao da u Pythonu definišeš `dataclass` za svaki pojam (predmet, kolokvijum, trening…), samo što TypeScript proverava tipove pre pokretanja. Store (`store.ts`) je jedno mesto gde živi stanje i čuva se u IndexedDB pregledača, pa podaci prežive zatvaranje aplikacije. Pomoćne funkcije za datume su u `lib/dates.ts` i imaju testove; „čista funkcija" znači da za iste ulaze uvek vrati isti izlaz, pa se lako testira. Napravljen je i onboarding od 5 koraka i demo podaci označeni sa „(primer)".

## Faza 2 — Ekran „Danas"
Parser `quickParse.ts` pretvara rečenicu poput „sutra učenje mata 2h" u strukturu (datum, kategorija, početak, kraj). Radi preko regularnih izraza (regex), a isti princip imaš u Pythonovom modulu `re`. Napisao sam 34 testa, jer parser ima mnogo graničnih slučajeva (npr. „18h" je vreme, a „2h" trajanje). Ekran Danas sklapa obaveze iz aktivnosti i rasporeda faksa, računa upozorenja (neprijavljen kolokvijum) i crta vremensku liniju. Naučio si da se logika drži u čistim funkcijama (`lib/`), a React samo prikazuje rezultat.

## Faza 3 — Faks
Dodao sam predmete, nedeljni raspored i pitanje „idem / ne idem / ponekad" za svaki termin. Termini „ne idem" postaju slobodno vreme koje planer kasnije koristi. Kolokvijumi imaju odbrojavanje u boji, čeklistu prijava i pregled „Novembar: prijave". Računanje ocene (`gradeFor`) je obična funkcija sa tabelom testova, slično kao `pytest.mark.parametrize` u Pythonu.
