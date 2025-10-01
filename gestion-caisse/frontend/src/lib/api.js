const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

function getToken() {
  try {
    const raw = localStorage.getItem('gcaisse-auth-v1')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed?.token || null
  } catch { return null }
}

async function request(path, { method = 'GET', body, headers = {} } = {}) {
  const token = getToken()
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  })
  if (res.status === 401) {
    // invalide/expiré → purge locale
    try { localStorage.removeItem('gcaisse-auth-v1') } catch {}
  }
  if (!res.ok) {
    const msg = await res.text().catch(()=>'')
    let error
    try { error = JSON.parse(msg).error } catch { error = msg || `HTTP ${res.status}` }
    throw new Error(error)
  }
  return res.json()
}

export const api = {
  get: (p) => request(p),
  post: (p, b) => request(p, { method: 'POST', body: b }),
  patch: (p, b) => request(p, { method: 'PATCH', body: b }),
  del: (p) => request(p, { method: 'DELETE' })
}
