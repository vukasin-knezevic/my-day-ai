// PostToolUse hook: formats every file Claude edits with Prettier.
import { execSync } from 'node:child_process'

let raw = ''
for await (const chunk of process.stdin) raw += chunk
if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1)
const file = JSON.parse(raw || '{}')?.tool_input?.file_path

if (file && /\.(ts|tsx|js|jsx|mjs|json|css|md|html)$/.test(file)) {
  try {
    execSync(`npx prettier --write --ignore-unknown "${file}"`, { stdio: 'ignore' })
  } catch {
    // Formatting must never block the edit.
  }
}
