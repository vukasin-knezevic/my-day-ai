import { applyTheme, BG_DARK, BG_LIGHT } from './theme'

test('the phone bars follow the app background', () => {
  document.head.innerHTML = '<meta name="theme-color" content="#000000" />'
  const meta = () => document.querySelector('meta[name="theme-color"]')!.getAttribute('content')
  applyTheme('dark')
  expect(meta()).toBe(BG_DARK)
  applyTheme('light')
  expect(meta()).toBe(BG_LIGHT)
})
