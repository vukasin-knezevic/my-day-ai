import { useEffect, useState } from 'react'
import { todayStr } from './dates'

/** Today's date; it moves to the next day by itself when a screen is left open past midnight (A-29). */
export function useToday(): string {
  const [today, setToday] = useState(() => todayStr())
  useEffect(() => {
    const id = setInterval(() => setToday((d) => (todayStr() === d ? d : todayStr())), 30_000)
    return () => clearInterval(id)
  }, [])
  return today
}
