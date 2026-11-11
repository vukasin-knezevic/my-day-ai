# SETUP — computer setup (Windows)

Node.js LTS and Git were already installed with `winget` in Phase 0. If you ever need to do it again:

```powershell
winget install --id OpenJS.NodeJS.LTS -e
winget install --id Git.Git -e
```

Close and reopen the terminal so the paths refresh. Check: `node -v`, `npm -v`, `git --version`.

## Running the project

```powershell
npm install
npx playwright install chromium   # only once, for the e2e tests
npm run dev
```

## GitHub account and push

The account `vukasin-knezevic` and the repository `my-day-ai` already exist.

1. The first `git push origin main` opens a sign-in window (Git Credential Manager) — sign in there.
2. After that `git push origin main` works on its own.
3. For a new account: https://github.com/signup, then "New repository" (public, no README).
