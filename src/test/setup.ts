// The tests are written for Serbian; jsdom reports 'en-US', so pretend to be a Serbian browser.
Object.defineProperty(window.navigator, 'language', { value: 'sr-RS', configurable: true })

import '@testing-library/jest-dom/vitest'
import 'fake-indexeddb/auto'
import { detectLanguage, loadAllLanguages, setLanguage } from '../i18n'

// the app loads one language at a time; the tests use all of them
await loadAllLanguages()
setLanguage(detectLanguage())

// A surprise after an award would change exact XP totals in tests; its own tests switch it on.
import { setSurprisesEnabled } from '../lib/surprise'
setSurprisesEnabled(false)
