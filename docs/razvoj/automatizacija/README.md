# Automatizacija: zadatak koji se pokreće sam

Update 0.4 nije kucan komandu po komandu. Zadatak je napisan u jednom fajlu ([`ZADATAK_0.4.md`](../ZADATAK_0.4.md)), a Windows Task Scheduler je u zakazano vreme pokrenuo Claude Code da ga uradi bez nadzora. Ovde je skripta kojom je to rađeno, u opštem obliku.

## Šta radi `run-task.ps1`

1. upiše u log vreme početka;
2. uđe u repo i uradi `git pull`;
3. pokrene `claude -p` sa porukom „pročitaj fajl sa zadatkom i uradi ceo zadatak“, uz `--dangerously-skip-permissions`;
4. sve što Claude Code ispiše ide u `run.log`, na kraju i vreme završetka i izlazni kod.

| Parametar  | Obavezan | Značenje                                                         |
| ---------- | -------- | ---------------------------------------------------------------- |
| `RepoPath` | da       | koren git repoa                                                  |
| `TaskFile` | da       | fajl sa zadatkom, putanja u odnosu na koren repoa                |
| `Model`    | ne       | naziv modela za `claude --model`; prazno = podrazumevani         |
| `Effort`   | ne       | nivo razmišljanja za `claude --effort`; prazno = podrazumevani   |
| `LogFile`  | ne       | gde ide log; podrazumevano `run.log` u istom folderu sa skriptom |

Ručno pokretanje:

```powershell
.\run-task.ps1 -RepoPath C:\src\my-app -TaskFile docs/razvoj/ZADATAK_0.4.md -Effort high
```

## Kako je 0.4 pokrenut preko Task Scheduler-a

Lična kopija skripte stoji u folderu van praćenih fajlova, a zadatak se zakazuje jednom, za vreme kad se limit naloga obnavlja. Primer (putanje i vreme su izmišljeni):

```powershell
$skripta = 'C:\src\my-app\.local-automation\run-task.ps1'
$argumenti = "-NoProfile -ExecutionPolicy Bypass -File `"$skripta`" " +
  '-RepoPath C:\src\my-app -TaskFile docs/razvoj/ZADATAK_0.4.md -Effort high'

$akcija = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $argumenti
$okidac = New-ScheduledTaskTrigger -Once -At '03:10'
Register-ScheduledTask -TaskName 'MyDayAI-zadatak' -Action $akcija -Trigger $okidac
```

Provera i brisanje:

```powershell
Get-ScheduledTaskInfo -TaskName 'MyDayAI-zadatak'   # poslednje pokretanje i rezultat
Get-Content .\run.log -Tail 20                      # dokle je stigao
Unregister-ScheduledTask -TaskName 'MyDayAI-zadatak' -Confirm:$false
```

Zadatak se izvršava samo dok je korisnik prijavljen i računar budan. U podešavanjima zadatka treba isključiti „Start the task only if the computer is on AC power“ na laptopu, a računaru zabraniti spavanje te noći.

## Šta je naučeno

- **Limit prekida rad.** Kad se potroši limit naloga, `claude -p` staje usred zadatka. Ništa se ne gubi ako se radi kako piše u zadatku (svaka stavka je poseban commit i push), ali posao nije gotov.
- **Log pokazuje vreme reseta.** Poslednji red u `run.log` je poruka o limitu sa vremenom kad se obnavlja. Po tom vremenu se zakazuje sledeće pokretanje.
- **Nastavak mora da bude moguć.** Fajl sa zadatkom ima numerisane stavke i pravilo „jedna stavka = jedan commit“, pa sledeće pokretanje iz `git log` vidi dokle se stiglo. Započeta, a necommitovana izmena ostaje u radnom folderu i prvo se ona završava.
- **Zadatak mora da kaže šta kad nešto ne može.** Bez nadzora nema koga da pita, zato u zadatku stoji „ne pitaj ništa; ako ne može kako piše, uradi najbližu dobru varijantu i zapiši zašto“.
- **`--dangerously-skip-permissions` je ozbiljna stvar.** Claude Code tada izvršava komande bez pitanja. Korišćeno je samo u ovom repou, gde se sve vraća iz gita, i uz zadatak koji tačno kaže šta sme (na primer „git istoriju ne dirati“).
- **Skripta bez naših slova.** Windows PowerShell 5.1 čita skriptu bez BOM-a u sistemskoj kodnoj strani, pa bi „č“ i „š“ u poruci stigli oštećeni. Zato je poruka u skripti pisana bez dijakritika.

## Šta nije u repou

Lična kopija skripte (sa putanjama ovog računara) i logovi pokretanja stoje u `.local-automation/`, koji je u `.gitignore`. Log može da sadrži putanje i delove razgovora, pa ne ide u javni repo. Ako se skripta pokreće direktno iz ovog foldera, `run.log` nastaje pored nje; i `*.log` u ovom folderu je u `.gitignore`.
