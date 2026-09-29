import { useCallback, useEffect, useRef, useState } from 'react'
import { getCurrentPosition, getFallbackPosition, reverseGeocode } from '../services/locationService.js'
import { CITY } from '../utils/constants.js'

/**
 * Wraps the browser Geolocation API for the report form.
 *
 * States: `idle` -> `locating` -> `located` | `denied` | `unsupported`.
 * A rejected lookup is never fatal - the map lets the citizen drop the pin by
 * hand instead, which is the whole point of the fallback branch.
 */
export function useGeolocation({ auto = false } = {}) {
  const [position, setPosition] = useState(null)
  const [address, setAddress] = useState(null)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const locate = useCallback(async () => {
    setStatus('locating')
    setError(null)

    try {
      const result = await getCurrentPosition()
      if (!mounted.current) return result

      setPosition(result)
      setStatus(result.isFallback ? 'fallback' : 'located')

      const place = await reverseGeocode(result.latitude, result.longitude)
      if (mounted.current && place) setAddress(place)

      return result
    } catch (locationError) {
      if (!mounted.current) return null

      setError(locationError.message)
      setStatus(locationError.message.includes('not supported') ? 'unsupported' : 'denied')
      return null
    }
  }, [])

  /** Manual pin placement - always available, and the fallback path. */
  const setManualPosition = useCallback(async (latitude, longitude) => {
    const next = { latitude: Number(latitude), longitude: Number(longitude), accuracy: null, isManual: true }
    setPosition(next)
    setStatus('located')

    const place = await reverseGeocode(next.latitude, next.longitude)
    if (mounted.current) setAddress(place)
    return next
  }, [])

  const useCityCentre = useCallback(() => {
    const fallback = getFallbackPosition()
    setPosition(fallback)
    setStatus('fallback')
    setError(null)
    return fallback
  }, [])

  useEffect(() => {
    if (!auto) return undefined
    // Deferred so the permission prompt never blocks the first paint.
    const handle = window.setTimeout(locate, 0)
    return () => window.clearTimeout(handle)
  }, [auto, locate])

  return {
    position,
    address,
    status,
    error,
    isLocating: status === 'locating',
    isResolved: status === 'located' || status === 'fallback',
    defaultCenter: CITY.center,
    locate,
    setManualPosition,
    useCityCentre,
  }
}

export default useGeolocation
