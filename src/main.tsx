import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import { detectLanguage, loadLanguage, setLanguage } from './i18n'
import { setSurprisesEnabled } from './lib/surprise'

// An automated browser (the end-to-end tests) gets no surprises: they would change the XP the tests count
if (navigator.webdriver) setSurprisesEnabled(false)

// the first screen is drawn in the language of the phone; the saved one is loaded as soon as the data is read
const first = detectLanguage()
void loadLanguage(first)
  .then(() => setLanguage(first))
  .finally(() => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </StrictMode>,
    )
  })
