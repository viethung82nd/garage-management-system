import { useEffect, useRef, useState } from 'react'

const DURATION_MS = 700
const EASE_OUT_CUBIC = (t: number) => 1 - Math.pow(1 - t, 3)

/**
 * Animates a numeric stat card value counting up from its previous value on
 * change. Non-numeric values (pre-formatted currency strings, etc.) pass
 * through untouched — only plain numbers are worth animating safely.
 */
export function useCountUp(value: string | number) {
  const [displayValue, setDisplayValue] = useState(value)
  const previousNumeric = useRef<number | null>(typeof value === 'number' ? value : null)
  const frameRef = useRef<number>(0)

  useEffect(() => {
    if (typeof value !== 'number') {
      setDisplayValue(value)
      previousNumeric.current = null
      return
    }

    const from = previousNumeric.current ?? value
    const to = value
    previousNumeric.current = value

    if (from === to || typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayValue(to)
      return
    }

    const start = performance.now()

    const tick = (now: number) => {
      const progress = Math.min((now - start) / DURATION_MS, 1)
      const current = Math.round(from + (to - from) * EASE_OUT_CUBIC(progress))
      setDisplayValue(current)
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick)
      }
    }

    frameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameRef.current)
  }, [value])

  return displayValue
}
