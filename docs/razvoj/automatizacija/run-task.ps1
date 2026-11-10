<#
.SYNOPSIS
  Runs Claude Code unattended on a task file and logs everything it prints.

.DESCRIPTION
  Pulls the repository, then starts `claude -p` with a prompt that tells it to read the task
  file and do the whole task. Meant for Windows Task Scheduler (see README.md next to this script).

  WARNING: --dangerously-skip-permissions lets Claude Code run any command without asking.
  Use it only in a repository you can restore from git, on a machine you trust.

  This file is kept ASCII-only on purpose: Windows PowerShell 5.1 reads a script without a BOM
  in the system code page, and letters with diacritics in the prompt would arrive damaged.

.EXAMPLE
  .\run-task.ps1 -RepoPath C:\src\my-app -TaskFile docs/razvoj/ZADATAK_0.4.md -Model <model-id> -Effort high
#>
param(
  # Root of the git repository to work in.
  [Parameter(Mandatory = $true)][string]$RepoPath,
  # Task file, relative to the repository root.
  [Parameter(Mandatory = $true)][string]$TaskFile,
  # Model id for `claude --model`. Empty = the default model of the account.
  [string]$Model = '',
  # Reasoning effort for `claude --effort` (low, medium, high...). Empty = default.
  [string]$Effort = '',
  # Where the output goes. Default: run.log next to this script.
  [string]$LogFile = (Join-Path $PSScriptRoot 'run.log')
)

# A failed step (for example git pull without network) is logged and the run goes on.
$ErrorActionPreference = 'Continue'

function Write-Log {
  param([Parameter(ValueFromPipeline = $true)]$Line)
  process { "$Line" | Out-File -FilePath $LogFile -Append -Encoding utf8 }
}

"=== start $(Get-Date -Format o) ===" | Write-Log

if (-not (Test-Path -LiteralPath $RepoPath -PathType Container)) {
  "RepoPath not found: $RepoPath" | Write-Log
  exit 1
}
Set-Location -LiteralPath $RepoPath

if (-not (Test-Path -LiteralPath $TaskFile -PathType Leaf)) {
  "TaskFile not found in the repository: $TaskFile" | Write-Log
  exit 1
}

$claude = Get-Command claude -ErrorAction SilentlyContinue
if (-not $claude) {
  'claude was not found in PATH. Install Claude Code or add it to PATH for this user.' | Write-Log
  exit 1
}

git pull 2>&1 | Write-Log

$prompt = "Procitaj $TaskFile i uradi ceo zadatak koji je u njemu opisan. Ne pitaj nista; kratki izlazi radi stednje limita."

$claudeArgs = @('-p', $prompt, '--dangerously-skip-permissions')
if ($Model) { $claudeArgs += @('--model', $Model) }
if ($Effort) { $claudeArgs += @('--effort', $Effort) }

& $claude.Source @claudeArgs 2>&1 | Write-Log
$code = $LASTEXITCODE

"=== end $(Get-Date -Format o) (exit $code) ===" | Write-Log
exit $code
