// Stop hook: when Claude finishes and something in src/ changed,
// run typecheck + lint (errors go back to Claude to fix), then refresh the Graphify map.
import { execSync } from 'node:child_process'

let raw = ''
for await (const chunk of process.stdin) raw += chunk
if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1)
const input = JSON.parse(raw || '{}')

// Already sent back once for errors: don't loop forever.
if (input.stop_hook_active) process.exit(0)

// Nothing changed in src/: skip (saves time on plain questions).
if (!execSync('git status --porcelain src').toString().trim()) process.exit(0)

try {
  execSync('npm run typecheck && npm run lint', { stdio: 'pipe' })
} catch (e) {
  process.stderr.write(`Typecheck/lint failed, fix these:\n${e.stdout ?? ''}${e.stderr ?? ''}`)
  process.exit(2)
}

try {
  execSync('graphify . --code-only', { stdio: 'ignore' })
} catch {
  // Graphify missing or failed: not a reason to block.
}
