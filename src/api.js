import { formatNaira } from './pricing'
import { adminHeaders } from './adminAuth'

const BASE_URL = import.meta.env.VITE_API_URL ?? ''
const DEFAULT_TIMEOUT = 8000

async function apiFetch(path, { signal, timeout = DEFAULT_TIMEOUT, ...init } = {}) {
  const ctrl = new AbortController()
  const timer = window.setTimeout(() => ctrl.abort(), timeout)
  const onParentAbort = () => ctrl.abort()
  signal?.addEventListener('abort', onParentAbort)

  try {
    return await fetch(`${BASE_URL}${path}`, { ...init, signal: ctrl.signal })
  } finally {
    window.clearTimeout(timer)
    signal?.removeEventListener('abort', onParentAbort)
  }
}

/** Demo tour clips — only for static JSON / fallback listings, not admin DB houses. */
export const DEMO_TOUR_VIDEOS = [
  'https://www.w3schools.com/html/mov_bbb.mp4',
  'https://www.w3schools.com/html/movie.mp4',
]

/** Fill demo video only for non-DB listings when none is set. */
export function ensureListingVideos(property, source) {
  const existing = (property?.videos ?? []).filter(Boolean)
  if (existing.length > 0) return existing
  if (source === 'house') return []
  const idx = Math.abs(Number(property?.id) || 0) % DEMO_TOUR_VIDEOS.length
  return [DEMO_TOUR_VIDEOS[idx]]
}

export function tagListing(property, source) {
  const id = property.id
  return {
    ...property,
    source,
    listingKey: `${source}-${id}`,
    videos: ensureListingVideos(property, source),
  }
}

const DEFAULT_HOUSE_IMAGE =
  'https://images.unsplash.com/photo-1600585154154-1e8a1cc28b3e?auto=format&fit=crop&w=1200&q=80'

export function mapHouseToProperty(h) {
  const listingType = h.listingType === 'Sale' ? 'Sale' : 'Rent'
  const amount = Number(h.pricePerNight)
  const isRent = listingType === 'Rent'
  const priceStr = isRent ? `${formatNaira(amount)} / night` : formatNaira(amount)
  const isLuxury = isRent && amount >= 50_000
  const image = h.imageUrl || DEFAULT_HOUSE_IMAGE
  return tagListing(
    {
      id: h.id,
      title: h.title,
      city: h.city,
      address: h.address || '',
      description: h.description || '',
      price: priceStr,
      priceNumeric: amount,
      priceUnit: isRent ? 'night' : 'sale',
      bedrooms: h.bedrooms,
      bathrooms: h.bathrooms,
      sqft: h.sqft ?? 0,
      type: listingType,
      badge: h.isActive ? (isLuxury ? 'Luxury' : 'Available') : 'Inactive',
      image,
      gallery: image ? [image] : [],
      videos: h.videoTourUrl?.trim() ? [h.videoTourUrl.trim()] : [],
    },
    'house',
  )
}

export function getListingImages(property) {
  if (!property) return []
  const fromGallery = (property.gallery ?? []).filter(Boolean)
  if (fromGallery.length) return fromGallery
  if (property.image) return [property.image]
  return []
}

export function findListing(list, routeId) {
  if (!list?.length || !routeId) return null
  return (
    list.find(
      (p) =>
        p.listingKey === routeId ||
        String(p.id) === routeId ||
        p.listingKey === `house-${routeId}` ||
        p.listingKey === `property-${routeId}` ||
        p.listingKey === `fallback-${routeId}`,
    ) ?? null
  )
}

/** Load one listing by route id (e.g. house-3, property-1, or bare numeric id). */
export async function fetchListingByKey(routeId, signal) {
  const cached = findListing(getCachedListings(), routeId)
  if (cached) return cached

  const dash = routeId.indexOf('-')
  const source = dash > 0 ? routeId.slice(0, dash) : null
  const id = Number(dash > 0 ? routeId.slice(dash + 1) : routeId)
  if (!Number.isFinite(id)) return null

  if (!source || source === 'house') {
    try {
      const houses = await getHouses(signal)
      const match = houses.find((x) => x.id === id)
      if (match) return mapHouseToProperty(match)
    } catch {
      /* try other sources */
    }
  }

  if (!source || source === 'property') {
    try {
      const props = await getProperties(signal)
      const match = props.find((x) => x.id === id)
      if (match) return tagListing(match, 'property')
    } catch {
      /* try fallback */
    }
  }

  if (!source || source === 'fallback') {
    try {
      const fallback = await loadFallbackListings(signal)
      const match = fallback.find((x) => x.id === id)
      if (match) return tagListing(match, 'fallback')
    } catch {
      return null
    }
  }

  return null
}

async function loadFallbackListings(signal) {
  const res = await fetch('/listings-fallback.json', { signal })
  if (!res.ok) throw new Error('Fallback listings unavailable')
  return res.json()
}

function mergeListings(houses, properties) {
  const taggedProperties = (properties ?? []).map((p) => tagListing(p, 'property'))
  return [...houses, ...taggedProperties]
}

/** Properties + houses merged; falls back to static JSON when API is down. */
export async function loadListings(signal) {
  const [houses, properties] = await Promise.all([
    getHouses(signal)
      .then((raw) => (raw ?? []).map(mapHouseToProperty))
      .catch(() => []),
    getProperties(signal)
      .then((raw) => raw ?? [])
      .catch(() => []),
  ])

  const combined = mergeListings(houses, properties)
  if (combined.length > 0) {
    return { data: combined, offline: false }
  }

  const fallback = await loadFallbackListings(signal)
  return { data: (fallback ?? []).map((p) => tagListing(p, 'fallback')), offline: true }
}

/**
 * Fetches houses first and calls onPartial so the UI can render immediately,
 * then merges in file-based properties when ready.
 */
export async function loadListingsProgressive(onPartial, signal) {
  const housesPromise = getHouses(signal)
    .then((raw) => (raw ?? []).map(mapHouseToProperty))
    .catch(() => [])

  const propertiesPromise = getProperties(signal)
    .then((raw) => raw ?? [])
    .catch(() => [])

  const houses = await housesPromise
  if (houses.length > 0) {
    onPartial({ data: houses, partial: true })
  }

  const [housesFinal, properties] = await Promise.all([housesPromise, propertiesPromise])
  const combined = mergeListings(housesFinal, properties)
  if (combined.length > 0) {
    return { data: combined, offline: false }
  }

  const fallback = await loadFallbackListings(signal)
  const fallbackData = (fallback ?? []).map((p) => tagListing(p, 'fallback'))
  onPartial({ data: fallbackData, partial: false })
  return { data: fallbackData, offline: true }
}

let listingsCache = null
let listingsPrefetch = null

export function getCachedListings() {
  return listingsCache
}

export function invalidateListingsCache() {
  listingsCache = null
  listingsPrefetch = null
}

async function adminApiFetch(path, init = {}) {
  return apiFetch(path, {
    ...init,
    headers: { ...adminHeaders(), ...(init.headers || {}) },
  })
}

/** Start loading listings as soon as the app bundle loads. */
export function prefetchListings() {
  if (!listingsPrefetch) {
    const controller = new AbortController()
    listingsPrefetch = loadListingsProgressive(
      ({ data }) => {
        listingsCache = data
      },
      controller.signal,
    )
      .then((result) => {
        listingsCache = result.data
        return result
      })
      .finally(() => {
        listingsPrefetch = null
      })
  }
  return listingsPrefetch
}

export async function getHealth() {
  try {
    const res = await apiFetch('/health', { timeout: 5000 })
    return res.ok
  } catch {
    return false
  }
}

export async function getProperties(signal) {
  const res = await apiFetch('/api/properties', { signal })
  if (!res.ok) throw new Error('Failed to load properties')
  return res.json()
}

export async function getHouses(signal) {
  const res = await apiFetch('/api/houses', { signal })
  if (!res.ok) throw new Error('Failed to load houses')
  return res.json()
}

export async function getBookings(signal) {
  const res = await apiFetch('/api/bookings', { signal })
  if (!res.ok) throw new Error('Failed to load bookings')
  return res.json()
}

export async function createBooking(payload) {
  const res = await apiFetch('/api/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await safeJson(res)
    throw new Error(err?.error || 'Failed to create booking')
  }
  return res.json()
}

export async function updateBookingStatus(id, status) {
  const res = await adminApiFetch(`/api/bookings/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  })
  if (!res.ok) throw new Error('Failed to update booking status')
  return res.json()
}

export async function getAdminStats(signal) {
  const res = await adminApiFetch('/api/admin/stats', { signal })
  if (!res.ok) throw new Error('Failed to load admin stats')
  return res.json()
}

export async function getAdminHouses(signal) {
  const res = await adminApiFetch('/api/admin/houses', { signal })
  if (!res.ok) throw new Error('Failed to load houses')
  return res.json()
}

export async function getAdminProperties(signal) {
  const res = await adminApiFetch('/api/admin/properties', { signal })
  if (!res.ok) throw new Error('Failed to load catalog properties')
  return res.json()
}

export async function createHouse(payload) {
  const res = await adminApiFetch('/api/houses', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await safeJson(res)
    throw new Error(err?.error || 'Failed to create house')
  }
  invalidateListingsCache()
  return res.json()
}

export async function updateHouse(id, payload) {
  const res = await adminApiFetch(`/api/houses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await safeJson(res)
    throw new Error(err?.error || 'Failed to update house')
  }
  invalidateListingsCache()
  return res.json()
}

export async function deleteHouse(id) {
  const res = await adminApiFetch(`/api/houses/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const err = await safeJson(res)
    throw new Error(err?.error || 'Failed to delete house')
  }
  invalidateListingsCache()
  return true
}

export async function createCatalogProperty(payload) {
  const res = await adminApiFetch('/api/admin/properties', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await safeJson(res)
    throw new Error(err?.error || 'Failed to create property')
  }
  invalidateListingsCache()
  return res.json()
}

export async function updateCatalogProperty(id, payload) {
  const res = await adminApiFetch(`/api/admin/properties/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await safeJson(res)
    throw new Error(err?.error || 'Failed to update property')
  }
  invalidateListingsCache()
  return res.json()
}

export async function deleteCatalogProperty(id) {
  const res = await adminApiFetch(`/api/admin/properties/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const err = await safeJson(res)
    throw new Error(err?.error || 'Failed to delete property')
  }
  invalidateListingsCache()
  return true
}

async function safeJson(res) {
  try {
    return await res.json()
  } catch {
    return null
  }
}

export async function verifyPayment(reference) {
  const res = await apiFetch('/api/verify-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reference }),
  })
  if (!res.ok) {
    const err = await safeJson(res)
    throw new Error(err?.error || 'Payment verification failed')
  }
  return res.json()
}

export async function getAdminPayments(signal) {
  const res = await adminApiFetch('/api/admin/payments', { signal })
  if (!res.ok) throw new Error('Failed to load payments')
  return res.json()
}

export async function getAdminPaymentReceipt(reference, signal) {
  const res = await adminApiFetch(`/api/admin/payments/${reference}`, { signal })
  if (!res.ok) throw new Error('Failed to load receipt')
  return res.json()
}
