# Podaci o snu sa pametnog sata — šta je realno moguće

_Primer: Huawei Health i Huawei satovi. Isti zaključci važe za većinu proizvođača: bez zvaničnog, potvrđenog formata izvoza uvoz bi bio izmišljanje._

> Status istraživanja: **delimično potvrđeno**. Tamo gde nisam našao pouzdan izvor, piše „nepotvrđeno". Nijedan format fajla nije izmišljen.

## 1. Izvoz podataka iz Huawei Health aplikacije

- Pretraga je vratila samo SEO stranice niskog kvaliteta (bez Huawei izvora) koje tvrde da postoji izvoz u CSV/JSON, ali se **međusobno ne slažu oko menija**. Zato to tretiram kao **nepotvrđeno**.
- Što je verovatno: Huawei nalog ima „Privacy Center → zahtev za kopiju podataka" (GDPR), ali **format i polja za san nisam uspeo da potvrdim** iz zvaničnog izvora.
- **Zaključak:** u verziji 1 nema uvoza fajla, jer bi to značilo izmišljanje formata. Polje `source: 'watch'` u tipu `SleepLog` je ostavljeno za verziju 2.
- **Šta ti možeš da uradiš:** zatraži kopiju podataka (Huawei Health → Ja → Podešavanja → Privatnost, ili account.huawei.com → Privacy Center), pošalji mi dobijeni fajl i na osnovu **pravog** uzorka napravićemo uvoz.

## 2. Huawei Health Kit iz web aplikacije bez servera

Izvori (zvanična dokumentacija):

- REST referenca: <https://developer.huawei.com/consumer/en/doc/HMSCore-References/rest-overview-0000001254420693>
- Model podataka: <https://developer.huawei.com/consumer/en/doc/HMSCore-References/data-model-0000001054556973>
- Podaci sa pametnih satova: <https://developer.huawei.com/consumer/en/doc/hmscore-guides/obtain-smart-watch-data-0000001365189921>

Šta stoji u njima:

- Postoji **REST API** (`health-api.cloud.huawei.com/healthkit/v2`) sa **OAuth 2.0** (authorization code) i bearer tokenom, i opseg za čitanje sna (`HEALTHKIT_SLEEP_READ`).
- Sleep se vodi kao tip `com.huawei.continuous.sleep.fragment`; REST podaci kasne oko 10 minuta.
- Dokumentacija za satove navodi da se čitaju istorijski zapisi sna (vreme uspavljivanja, buđenja, ukupno trajanje).

Zašto **ne** ide direktno iz ove aplikacije (zaključak, deo je moje tumačenje):

1. Potreban je **Huawei Developer nalog i registrovana aplikacija** sa odobrenjem za zdravstvene opsege (pregled od strane Huawei-ja). **Nepotvrđeno:** tačan proces i da li se odobrava privatnim/studentskim aplikacijama.
2. OAuth razmena koda za token traži **client secret**, a on ne sme u kod koji radi u pregledaču. To znači da je potreban **mali server** (zadatak kaže: bez servera).
3. Forum Huawei developera sadrži prijave da REST vraća prazne liste dok se ne postave podaci (nepotvrđeno, anegdotski).

## 3. Odluka za verziju 1

- **Ručni unos sna**: dugmad „Legao" i „Ustao" (2 klika) ili brzi unos „legao 1:30".
- Nema uvoza fajla dok nemamo pravi uzorak izvoza.

## 4. Plan za verziju 2

1. Zatražiti kopiju podataka iz Huawei naloga, pogledati stvarni format i napraviti uvoz (`lib/importSleep.ts`) + testove na stvarnom uzorku.
2. Alternativa: sinhronizacija Huawei Health → Health Connect/Google Fit (ako je podržano za tvoj telefon), pa čitanje odatle preko male Android/PWA integracije. **Nepotvrđeno** da GT 6 Pro to podržava.
3. Mali server (npr. besplatna serverless funkcija) koji čuva client secret i radi OAuth, pa PWA čita san preko Health Kit REST-a.
