import { useEffect, useState } from 'react'

/**
 * Debounces a rapidly changing value.
 * Used by the header search so a request fires once typing pauses.
 */
export function useDebounce(value, delay = 350) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}

export default useDebounce
