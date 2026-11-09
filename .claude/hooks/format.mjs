// PostToolUse hook: formats every file Claude edits with Prettier.
import { execFileSync } from 'node:child_process'

let raw = ''
for await (const chunk of process.stdin) raw += chunk
if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1)
const file = JSON.parse(raw || '{}')?.tool_input?.file_path

if (file && /\.(ts|tsx|js|jsx|mjs|json|css|md|html)$/.test(file)) {
  try {
    // No shell: the file path is passed as a plain argument, so it can never run as a command.
    execFileSync(
      process.execPath,
      ['node_modules/prettier/bin/prettier.cjs', '--write', '--ignore-unknown', file],
      { stdio: 'ignore' },
    )
  } catch {
    // Formatting must never block the edit.
  }
}
