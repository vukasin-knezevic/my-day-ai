import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
    // no animations in the tests (axe would measure colours in the middle of a fade)
    reducedMotion: 'reduce',
    viewport: { width: 390, height: 844 },
    // the tests are written for Serbian; the app picks its language from the browser
    locale: 'sr-RS',
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: /(iphone|screens)\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 } },
    },
    {
      // iPhone: WebKit (Safari's engine) with an iPhone profile. It cannot replace a real iPhone, see IZVESTAJ.md
      name: 'iphone',
      testMatch: /iphone\.spec\.ts/,
      use: { ...devices['iPhone 14'] },
    },
    // the same short walk through the screens in other browsers and sizes (A-34)
    {
      name: 'firefox',
      testMatch: /screens\.spec\.ts/,
      use: { ...devices['Desktop Firefox'], viewport: { width: 390, height: 844 } },
    },
    {
      name: 'tablet',
      testMatch: /screens\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 820, height: 1180 } },
    },
    {
      name: 'desktop1920',
      testMatch: /screens\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } },
    },
  ],
  webServer: {
    command: 'npm run build && npx vite preview --port 4173',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
