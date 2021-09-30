import { useEffect, useRef } from 'react'

// inspired from https://overreacted.io/making-setinterval-declarative-with-react-hooks/
export const useInterval = <T extends unknown>(
  callback: () => T,
  delay: number
): { forceTrigger: typeof callback } => {
  const savedCallback = useRef(callback)
  const savedTimer = useRef<undefined | NodeJS.Timer>(undefined)

  // Remember the latest callback if it changes.
  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  // Set up the interval.
  useEffect(() => {
    savedTimer.current = setInterval(() => savedCallback.current(), delay)
    return () => clearInterval(savedTimer.current!)
  }, [delay])

  const forceTrigger = () => {
    clearInterval(savedTimer.current!)
    // make call then setup the timer again
    const res = savedCallback.current()
    savedTimer.current = setInterval(() => savedCallback.current(), delay)
    return res
  }

  return { forceTrigger }
}
