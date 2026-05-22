const ADMIN_SESSION_KEY = 'nb_admin_key'
const ADMIN_FLAG_KEY = 'isAdmin'

export function getAdminKey() {
  return sessionStorage.getItem(ADMIN_SESSION_KEY) || ''
}

export function setAdminSession(key) {
  sessionStorage.setItem(ADMIN_SESSION_KEY, key)
  localStorage.setItem(ADMIN_FLAG_KEY, 'true')
}

export function clearAdminSession() {
  sessionStorage.removeItem(ADMIN_SESSION_KEY)
  localStorage.removeItem(ADMIN_FLAG_KEY)
}

export function isAdminLoggedIn() {
  return localStorage.getItem(ADMIN_FLAG_KEY) === 'true' && Boolean(getAdminKey())
}

export function adminHeaders() {
  const key = getAdminKey()
  return key
    ? {
        'Content-Type': 'application/json',
        'X-Admin-Key': key,
      }
    : { 'Content-Type': 'application/json' }
}
