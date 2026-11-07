#!/bin/sh
# lint + typecheck + tests, short output
cd "$(dirname "$0")/.." || exit 1
npm run lint 2>&1 | grep -v "^>" | grep -v "^$" | head -30
npm run typecheck 2>&1 | grep -v "^>" | grep -v "^$" | head -30
npm test 2>&1 | grep -E "FAIL|Tests |Test Files|Error|expected|received" | head -30
