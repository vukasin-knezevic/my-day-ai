# Sleep data from a smartwatch — what is realistically possible

_Example: Huawei Health and Huawei watches. The same conclusions apply to most manufacturers: without an official, confirmed export format, an import would be guesswork._

> Research status: **partly confirmed**. Where I did not find a reliable source, it says "unconfirmed". No file format was made up.

## 1. Exporting data from the Huawei Health app

- The search returned only low-quality SEO pages (with no Huawei source) that claim a CSV/JSON export exists, but they **disagree with each other about the menu**. So I treat it as **unconfirmed**.
- What is probable: a Huawei account has "Privacy Center → request a copy of your data" (GDPR), but I **could not confirm the format and the sleep fields** from an official source.
- **Conclusion:** version 1 has no file import, because that would mean making up a format. The field `source: 'watch'` in the `SleepLog` type is left for version 2.
- **What you can do:** request a copy of your data (Huawei Health → Me → Settings → Privacy, or account.huawei.com → Privacy Center), send me the file you get and we will build the import from a **real** sample.

## 2. Huawei Health Kit from a web app without a server

Sources (official documentation):

- REST reference: <https://developer.huawei.com/consumer/en/doc/HMSCore-References/rest-overview-0000001254420693>
- Data model: <https://developer.huawei.com/consumer/en/doc/HMSCore-References/data-model-0000001054556973>
- Smartwatch data: <https://developer.huawei.com/consumer/en/doc/hmscore-guides/obtain-smart-watch-data-0000001365189921>

What they say:

- There is a **REST API** (`health-api.cloud.huawei.com/healthkit/v2`) with **OAuth 2.0** (authorization code) and a bearer token, and a scope for reading sleep (`HEALTHKIT_SLEEP_READ`).
- Sleep is stored as the type `com.huawei.continuous.sleep.fragment`; REST data lags by about 10 minutes.
- The watch documentation says that historical sleep records can be read (fall-asleep time, wake-up time, total duration).

Why it does **not** work directly from this app (a conclusion, partly my own interpretation):

1. A **Huawei Developer account and a registered app** with approval for health scopes are needed (reviewed by Huawei). **Unconfirmed:** the exact process and whether private/student apps are approved.
2. The OAuth code-for-token exchange needs a **client secret**, which must not go into code that runs in the browser. That means a **small server** is needed (the task says: no server).
3. The Huawei developer forum has reports that REST returns empty lists until data is set up (unconfirmed, anecdotal).

## 3. Decision for version 1

- **Manual sleep entry**: "Went to bed" and "Got up" buttons (2 clicks) or quick entry "bed 1:30".
- No file import until we have a real export sample.

## 4. Plan for version 2

1. Request a copy of the data from the Huawei account, look at the actual format and build the import (`lib/importSleep.ts`) + tests on a real sample.
2. Alternative: sync Huawei Health → Health Connect/Google Fit (if supported on your phone), then read from there through a small Android/PWA integration. **Unconfirmed** that the GT 6 Pro supports it.
3. A small server (e.g. a free serverless function) that keeps the client secret and does OAuth, so the PWA reads sleep through the Health Kit REST API.
