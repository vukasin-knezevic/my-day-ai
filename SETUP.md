# SETUP — priprema računara (Windows)

Node.js LTS i Git su već instalirani preko `winget` u Fazi 0. Ako ikad treba ponovo:

```powershell
winget install --id OpenJS.NodeJS.LTS -e
winget install --id Git.Git -e
```

Zatvori i ponovo otvori terminal da se putanje osveže. Proveri: `node -v`, `npm -v`, `git --version`.

## Pokretanje projekta
```powershell
npm install
npx playwright install chromium   # samo jednom, za e2e testove
npm run dev
```

## GitHub nalog i push
Nalog `vukasin-knezevic` i repozitorijum `my-day-ai` već postoje.
1. Prvi `git push origin main` otvara prozor za prijavu (Git Credential Manager) — prijavi se u njemu.
2. Posle toga `git push origin main` radi sam.
3. Za novi nalog: https://github.com/signup, zatim „New repository" (public, bez README).
