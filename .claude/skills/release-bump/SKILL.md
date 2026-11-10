---
name: release-bump
description: Podigni verziju aplikacije, upiši novu fazu u DNEVNIK i pokreni sve provere. Pokreće je korisnik sa /release-bump.
disable-model-invocation: true
---

# Release bump

1. Pročitaj trenutnu verziju iz `package.json` i pitaj korisnika koja je nova (predloži sledeću, npr. 0.3.1 → 0.3.2 ili 0.4.0).
2. Pokreni `npm version <nova-verzija> --no-git-tag-version`. Zatim ažuriraj sva mesta koja pominju verziju: očekivanu vrednost u `src/App.test.tsx` (`__APP_VERSION__`), spisak „Verzije“ / „Versions“ u `README.md` (srpski i engleski deo) i prvi pasus `IZVESTAJ.md`.
3. U `docs/razvoj/DNEVNIK.md` dodaj na kraj novi odeljak `## <nova-verzija> — <kratak naslov>` u istom stilu kao postojeći: nekoliko rečenica na srpskom o tome šta je promenjeno i šta je korisnik naučio, jednostavnim rečima, sa poređenjem sa Pythonom gde pomaže.
4. Pokreni redom `npm run typecheck`, `npm run lint` i `npm test`, pa kratko javi rezultat.
5. Ne pravi commit ni PR. Korisnik ih pravi sam. Na kraju predloži commit poruku na engleskom, npr. `chore: release <nova-verzija>`.
