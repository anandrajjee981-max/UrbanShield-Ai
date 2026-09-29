import { CITY } from '../utils/constants.js'

/**
 * Browser geolocation + reverse geocoding helpers.
 *
 * Coordinates always come from the device; the map is only a fallback so the
 * report form still works on a desktop with location disabled.
 */

const FALLBACK_POSITION = {
  latitude: CITY.center[0],
  longitude: CITY.center[1],
  accuracy: 5000,
  isFallback: true,
}

/**
 * Resolves the device position.
 * Rejects with a readable message the report form can show inline.
 */
export function getCurrentPosition(options = {}) {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser.'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: Number(position.coords.latitude.toFixed(5)),
          longitude: Number(position.coords.longitude.toFixed(5)),
          accuracy: Math.round(position.coords.accuracy),
          isFallback: false,
        })
      },
      (error) => {
        const messages = {
          1: 'Location permission denied. Enable it or place the pin manually on the map.',
          2: 'Your location is unavailable right now. Place the pin manually on the map.',
          3: 'Locating timed out. Place the pin manually on the map.',
        }
        reject(new Error(messages[error.code] ?? 'Could not detect your location.'))
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000, ...options },
    )
  })
}

/** City-centre coordinates, used when the device refuses to share a position. */
export function getFallbackPosition() {
  return FALLBACK_POSITION
}

/**
 * Reverse geocodes coordinates to a human address using the free OpenStreetMap
 * Nominatim endpoint. Returns `null` when the network or the service fails -
 * the report is still valid without a resolved address.
 */
export async function reverseGeocode(latitude, longitude) {
  try {
    const params = new URLSearchParams({
      format: 'jsonv2',
      lat: String(latitude),
      lon: String(longitude),
      zoom: '17',
      addressdetails: '1',
    })

    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`, {
      headers: { Accept: 'application/json' },
    })

    if (!response.ok) return null

    const data = await response.json()
    if (!data?.display_name) return null

    return {
      address: data.display_name,
      road: data.address?.road ?? null,
      suburb: data.address?.suburb ?? data.address?.neighbourhood ?? null,
      city: data.address?.city ?? data.address?.town ?? data.address?.county ?? CITY.name,
      postcode: data.address?.postcode ?? null,
    }
  } catch {
    return null
  }
}

/** Great-circle distance in kilometres. */
export function distanceInKm(fromLat, fromLng, toLat, toLng) {
  const R = 6371
  const toRad = (deg) => (deg * Math.PI) / 180

  const dLat = toRad(toLat - fromLat)
  const dLng = toRad(toLng - fromLng)
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(fromLat)) * Math.cos(toRad(toLat)) * Math.sin(dLng / 2) ** 2

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
