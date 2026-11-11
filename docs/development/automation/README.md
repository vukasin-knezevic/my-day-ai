# Automation: a task that starts itself

Update 0.4 was not typed in command by command. The task was written in a single file ([`TASK_0.4.md`](../TASK_0.4.md)), and Windows Task Scheduler started Claude Code at the scheduled time to do it unattended. This is the script used for that, in a general form.

## What `run-task.ps1` does

1. writes the start time to the log;
2. enters the repo and runs `git pull`;
3. starts `claude -p` with the message "read the task file and do the whole task", with `--dangerously-skip-permissions`;
4. everything Claude Code prints goes to `run.log`, and at the end the finish time and the exit code.

| Parameter  | Required | Meaning                                                                |
| ---------- | -------- | ---------------------------------------------------------------------- |
| `RepoPath` | yes      | root of the git repo                                                   |
| `TaskFile` | yes      | the task file, path relative to the repo root                          |
| `Model`    | no       | model name for `claude --model`; empty = default                       |
| `Effort`   | no       | reasoning level for `claude --effort`; empty = default                 |
| `LogFile`  | no       | where the log goes; default `run.log` in the same folder as the script |

Running it by hand:

```powershell
.\run-task.ps1 -RepoPath C:\src\my-app -TaskFile docs/development/TASK_0.4.md -Effort high
```

## How 0.4 was started through Task Scheduler

A personal copy of the script lives in a folder outside the tracked files, and the task is scheduled once, for the time when the account limit renews. Example (paths and time are made up):

```powershell
$script = 'C:\src\my-app\.local-automation\run-task.ps1'
$arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$script`" " +
  '-RepoPath C:\src\my-app -TaskFile docs/development/TASK_0.4.md -Effort high'

$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $arguments
$trigger = New-ScheduledTaskTrigger -Once -At '03:10'
Register-ScheduledTask -TaskName 'MyDayAI-task' -Action $action -Trigger $trigger
```

Checking and deleting:

```powershell
Get-ScheduledTaskInfo -TaskName 'MyDayAI-task'   # last run and result
Get-Content .\run.log -Tail 20                   # how far it got
Unregister-ScheduledTask -TaskName 'MyDayAI-task' -Confirm:$false
```

The task runs only while the user is signed in and the computer is awake. In the task settings, "Start the task only if the computer is on AC power" should be turned off on a laptop, and the computer should be kept from sleeping that night.

## What was learned

- **The limit interrupts the work.** When the account limit runs out, `claude -p` stops in the middle of the task. Nothing is lost if the task is done as written (every item is a separate commit and push), but the work is not finished.
- **The log shows the reset time.** The last line in `run.log` is the limit message with the time it renews. That time is used to schedule the next run.
- **Resuming must be possible.** The task file has numbered items and the rule "one item = one commit", so the next run sees from `git log` how far it got. A started but uncommitted change stays in the working folder and is finished first.
- **The task must say what to do when something cannot be done.** Unattended, there is nobody to ask, so the task says "ask nothing; if it cannot be done as written, do the closest good variant and write down why".
- **`--dangerously-skip-permissions` is serious.** Claude Code then runs commands without asking. It was used only in this repo, where everything can be restored from git, and with a task that says exactly what is allowed (for example "do not touch the git history").
- **A script without diacritics.** Windows PowerShell 5.1 reads a script without a BOM in the system code page, so letters like "č" and "š" in the message would arrive damaged. That is why the message in the script is written without diacritics.

## What is not in the repo

The personal copy of the script (with this computer's paths) and the run logs live in `.local-automation/`, which is in `.gitignore`. A log can contain paths and parts of the conversation, so it does not go into a public repo. If the script is run directly from this folder, `run.log` is created next to it; `*.log` in this folder is in `.gitignore` too.
