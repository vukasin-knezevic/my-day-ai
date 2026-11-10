import { swipeDirection } from './useSwipe'

test('a long sideways move is a swipe; a short or a mostly vertical one is not', () => {
  expect(swipeDirection(-80, 5)).toBe('left')
  expect(swipeDirection(90, -20)).toBe('right')
  expect(swipeDirection(-40, 0)).toBeNull()
  expect(swipeDirection(-80, 60)).toBeNull()
})
