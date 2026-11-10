// The tests are written for Serbian; jsdom reports 'en-US', so pretend to be a Serbian browser.
Object.defineProperty(window.navigator, 'language', { value: 'sr-RS', configurable: true })

import '@testing-library/jest-dom/vitest'
import 'fake-indexeddb/auto'

// A surprise after an award would change exact XP totals in tests; its own tests switch it on.
import { setSurprisesEnabled } from '../lib/surprise'
setSurprisesEnabled(false)
