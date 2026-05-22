import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  createCatalogProperty,
  createHouse,
  deleteCatalogProperty,
  deleteHouse,
  getAdminHouses,
  getAdminProperties,
  getAdminPaymentReceipt,
  getAdminPayments,
  getAdminStats,
  mapHouseToProperty,
  updateCatalogProperty,
  updateHouse,
} from './api'
import { formatNaira } from './pricing'
import {
  clearAdminSession,
  isAdminLoggedIn,
  setAdminSession,
} from './adminAuth'
import './Admin.css'

const MAX_PRICE = 500_000_000
const EMPTY_FORM = {
  title: '',
  city: '',
  address: '',
  description: '',
  listingType: 'Rent',
  price: '',
  bedrooms: 1,
  bathrooms: 1,
  sqft: 0,
  imageUrl: '',
  videoTourUrl: '',
  badge: 'Available',
  storage: 'database',
}

function DonutChart({ rent, sale }) {
  const total = rent + sale || 1
  const rentPct = (rent / total) * 100
  const salePct = 100 - rentPct
  return (
    <div className="admin-donut-wrap">
      <div
        className="admin-donut"
        style={{
          background: `conic-gradient(
            var(--accent) 0 ${rentPct}%,
            #1a1a1a ${rentPct}% 100%
          )`,
        }}
        role="img"
        aria-label={`Rent ${rent}, Sale ${sale}`}
      />
      <div className="admin-donut-hole">
        <strong>{total}</strong>
        <span>listings</span>
      </div>
      <ul className="admin-donut-legend">
        <li>
          <span className="admin-legend-dot admin-legend-dot--rent" />
          Rent ({rent}) — {rentPct.toFixed(0)}%
        </li>
        <li>
          <span className="admin-legend-dot admin-legend-dot--sale" />
          Sale ({sale}) — {salePct.toFixed(0)}%
        </li>
      </ul>
    </div>
  )
}

function StatusBars({ byStatus }) {
  const total = Object.values(byStatus).reduce((a, b) => a + b, 0) || 1
  const items = [
    { key: 'CONFIRMED', label: 'Confirmed', className: 'confirmed' },
    { key: 'PENDING', label: 'Pending', className: 'pending' },
    { key: 'CANCELLED', label: 'Cancelled', className: 'cancelled' },
  ]
  return (
    <div className="admin-status-bars">
      {items.map(({ key, label, className }) => {
        const count = byStatus[key] || 0
        const pct = (count / total) * 100
        return (
          <div key={key} className="admin-status-row">
            <div className="admin-status-label">
              <span>{label}</span>
              <strong>{count}</strong>
            </div>
            <div className="admin-status-track">
              <div
                className={`admin-status-fill admin-status-fill--${className}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

const AdminPage = ({ onListingsChange }) => {
  const navigate = useNavigate()
  const [authed, setAuthed] = useState(isAdminLoggedIn())
  const [keyInput, setKeyInput] = useState('')
  const [loginError, setLoginError] = useState('')
  const [tab, setTab] = useState('overview')
  const [stats, setStats] = useState(null)
  const [houses, setHouses] = useState([])
  const [catalog, setCatalog] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [editing, setEditing] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [payments, setPayments] = useState([])
  const [paymentsLoading, setPaymentsLoading] = useState(false)
  const [paymentsError, setPaymentsError] = useState('')
  const [receipt, setReceipt] = useState(null)
  const [receiptLoading, setReceiptLoading] = useState(false)

  const loadDashboard = useCallback(async () => {
    if (!isAdminLoggedIn()) return
    setLoading(true)
    setError('')
    try {
      const [statsData, housesData, catalogData] = await Promise.all([
        getAdminStats(),
        getAdminHouses(),
        getAdminProperties(),
      ])
      setStats(statsData)
      setHouses(housesData)
      setCatalog(catalogData)
    } catch (e) {
      if (e.message?.includes('401') || String(e).includes('Admin')) {
        clearAdminSession()
        setAuthed(false)
      }
      setError(e.message || 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (authed) loadDashboard()
  }, [authed, loadDashboard])

  const loadPayments = useCallback(async () => {
    if (!isAdminLoggedIn()) return
    setPaymentsLoading(true)
    setPaymentsError('')
    try {
      const data = await getAdminPayments()
      setPayments(data)
    } catch (e) {
      setPaymentsError(e.message || 'Failed to load payments')
    } finally {
      setPaymentsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (authed && tab === 'payments') loadPayments()
  }, [authed, tab, loadPayments])

  const viewReceipt = async (reference) => {
    setReceiptLoading(true)
    setReceipt(null)
    try {
      const data = await getAdminPaymentReceipt(reference)
      setReceipt(data)
    } catch (e) {
      alert('Could not load receipt: ' + e.message)
    } finally {
      setReceiptLoading(false)
    }
  }

  const listings = useMemo(() => {
    const db = houses.map((h) => {
      const mapped = mapHouseToProperty(h)
      return {
        key: `house-${h.id}`,
        source: 'house',
        id: h.id,
        title: h.title,
        city: h.city,
        type: h.listingType === 'Sale' ? 'Sale' : 'Rent',
        price: mapped.price,
        isActive: h.isActive,
        raw: h,
      }
    })
    const file = catalog.map((p) => ({
      key: `property-${p.id}`,
      source: 'property',
      id: p.id,
      title: p.title,
      city: p.city,
      type: p.type,
      price: p.price,
      isActive: true,
      raw: p,
    }))
    return [...db, ...file].sort((a, b) => a.title.localeCompare(b.title))
  }, [houses, catalog])

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoginError('')
    try {
      setAdminSession(keyInput)
      const res = await fetch('/api/admin/verify', {
        headers: { 'X-Admin-Key': keyInput },
      })
      if (res.status === 401) {
        clearAdminSession()
        setLoginError('Invalid admin key')
        return
      }
      if (!res.ok) {
        clearAdminSession()
        const body = await res.json().catch(() => ({}))
        setLoginError(
          body.detail?.includes('listingType')
            ? 'Server needs a restart after update. Stop the API, run "npx prisma generate" in the server folder, then start it again.'
            : body.error || `Server error (${res.status}). Is the API running on port 4000?`,
        )
        return
      }
      setAuthed(true)
    } catch {
      clearAdminSession()
      setLoginError('Could not reach API. Is the server running on port 4000?')
    }
  }

  const handleLogout = () => {
    clearAdminSession()
    setAuthed(false)
    navigate('/', { replace: true })
  }

  const notifyHome = () => {
    onListingsChange?.()
  }

  const onChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const startEdit = (row) => {
    setTab('add')
    if (row.source === 'house') {
      const h = row.raw
      setForm({
        title: h.title,
        city: h.city,
        address: h.address || '',
        description: h.description || '',
        listingType: h.listingType === 'Sale' ? 'Sale' : 'Rent',
        price: String(Number(h.pricePerNight)),
        bedrooms: h.bedrooms,
        bathrooms: h.bathrooms,
        sqft: h.sqft ?? 0,
        imageUrl: h.imageUrl || '',
        videoTourUrl: h.videoTourUrl || '',
        badge: h.isActive ? 'Available' : 'Inactive',
        storage: 'database',
      })
      setEditing({ source: 'house', id: h.id })
    } else {
      const p = row.raw
      setForm({
        title: p.title,
        city: p.city,
        address: '',
        description: '',
        listingType: p.type === 'Sale' ? 'Sale' : 'Rent',
        price: p.price,
        bedrooms: p.bedrooms,
        bathrooms: p.bathrooms,
        sqft: p.sqft ?? 0,
        imageUrl: p.image || '',
        videoTourUrl: '',
        badge: p.badge || 'Available',
        storage: 'catalog',
      })
      setEditing({ source: 'property', id: p.id })
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setEditing(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    setSuccess('')

    const useCatalog = form.storage === 'catalog' || editing?.source === 'property'

    try {
      if (useCatalog) {
        const payload = {
          title: form.title,
          city: form.city,
          price: form.price.includes('₦') ? form.price : `₦${Number(form.price).toLocaleString('en-NG')}`,
          type: form.listingType,
          badge: form.badge,
          bedrooms: Number(form.bedrooms),
          bathrooms: Number(form.bathrooms),
          sqft: Number(form.sqft),
          image: form.imageUrl,
        }
        if (editing?.source === 'property') {
          await updateCatalogProperty(editing.id, payload)
          setSuccess('Catalog listing updated — visible on the home page.')
        } else {
          await createCatalogProperty(payload)
          setSuccess('Catalog listing created — visible on the home page.')
        }
      } else {
        const price = Number(form.price)
        if (!Number.isFinite(price) || price < 0) throw new Error('Enter a valid price.')
        if (price > MAX_PRICE) throw new Error(`Price cannot exceed ₦${MAX_PRICE.toLocaleString('en-NG')}.`)

        const payload = {
          title: form.title,
          city: form.city,
          address: form.address || 'n/a',
          description: form.description || 'n/a',
          listingType: form.listingType,
          pricePerNight: price,
          bedrooms: Number(form.bedrooms),
          bathrooms: Number(form.bathrooms),
          sqft: Number(form.sqft),
          imageUrl: form.imageUrl || null,
          videoTourUrl: form.videoTourUrl?.trim() || null,
          isActive: form.badge !== 'Inactive',
        }
        if (editing?.source === 'house') {
          await updateHouse(editing.id, payload)
          setSuccess('Property updated — home page listings refreshed.')
        } else {
          await createHouse(payload)
          setSuccess('Property published to the home page.')
        }
      }
      resetForm()
      setTab('listings')
      notifyHome()
      await loadDashboard()
    } catch (err) {
      setError(err.message || 'Save failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete "${row.title}"? This cannot be undone.`)) return
    setError('')
    try {
      if (row.source === 'house') {
        await deleteHouse(row.id)
      } else {
        await deleteCatalogProperty(row.id)
      }
      setSuccess('Listing removed from the site.')
      notifyHome()
      await loadDashboard()
    } catch (err) {
      setError(err.message || 'Delete failed')
    }
  }

  if (!authed) {
    return (
      <section className="section admin-page">
        <div className="admin-login-card">
          <p className="admin-kicker">Staff only</p>
          <h2>Admin sign in</h2>
          <p className="meta">Manage listings, pricing, and view rent & sale progress.</p>
          <form onSubmit={handleLogin}>
            <label className="admin-label">
              Admin key
              <input
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="Enter admin key"
                required
                autoComplete="current-password"
              />
            </label>
            {loginError && <p className="error-text">{loginError}</p>}
            <div className="admin-login-actions">
              <button type="submit" className="btn btn-primary">
                Sign in
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/')}>
                Back to site
              </button>
            </div>
          </form>
        </div>
      </section>
    )
  }

  return (
    <section className="section admin-page">
      <header className="admin-top">
        <div>
          <p className="admin-kicker">NawftHomes · Admin</p>
          <h1>Dashboard</h1>
          <p className="meta">Create listings for the home page, edit or remove any property.</p>
        </div>
        <div className="admin-top-actions">
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/')}>
            View site
          </button>
          <button type="button" className="btn" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </header>

      <nav className="admin-tabs" aria-label="Admin sections">
        {['overview', 'listings', 'payments', 'add'].map((t) => (
          <button
            key={t}
            type="button"
            className={`admin-tab ${tab === t ? 'admin-tab--active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'overview' ? 'Overview' : t === 'listings' ? 'All listings' : t === 'payments' ? 'Payments' : editing ? 'Edit listing' : 'Add new'}
          </button>
        ))}
      </nav>

      {error && <p className="error-text admin-banner">{error}</p>}
      {success && <p className="success-text admin-banner">{success}</p>}

      {loading && tab === 'overview' && <p className="meta">Loading dashboard…</p>}

      {tab === 'overview' && stats && !loading && (
        <div className="admin-overview">
          <div className="admin-stat-grid">
            <article className="admin-stat-card">
              <span>Active on homepage</span>
              <strong>{stats.listings.active}</strong>
            </article>
            <article className="admin-stat-card">
              <span>Rent listings</span>
              <strong>{stats.listings.rent}</strong>
            </article>
            <article className="admin-stat-card">
              <span>Sale listings</span>
              <strong>{stats.listings.sale}</strong>
            </article>
            <article className="admin-stat-card">
              <span>Confirmed booking revenue</span>
              <strong>{formatNaira(stats.bookings.confirmedRevenue)}</strong>
            </article>
          </div>

          <div className="admin-charts">
            <article className="admin-chart-card">
              <h3>Rent vs sale mix</h3>
              <p className="meta">Share of listings on the site</p>
              <DonutChart rent={stats.listings.rent} sale={stats.listings.sale} />
            </article>
            <article className="admin-chart-card">
              <h3>Rental booking pipeline</h3>
              <p className="meta">{stats.bookings.total} total bookings</p>
              <StatusBars byStatus={stats.bookings.byStatus} />
            </article>
          </div>

          <div className="admin-pipeline">
            <h3>Progress snapshot</h3>
            <div className="admin-pipeline-grid">
              <div className="admin-pipeline-card">
                <h4>Rent</h4>
                <div
                  className="admin-pipeline-bar"
                  style={{
                    '--pct': `${stats.listings.total ? (stats.listings.rent / stats.listings.total) * 100 : 0}%`,
                  }}
                >
                  <div className="admin-pipeline-fill admin-pipeline-fill--rent" />
                </div>
                <p>{stats.listings.rent} of {stats.listings.total} listings</p>
              </div>
              <div className="admin-pipeline-card">
                <h4>Sale</h4>
                <div
                  className="admin-pipeline-bar"
                  style={{
                    '--pct': `${stats.listings.total ? (stats.listings.sale / stats.listings.total) * 100 : 0}%`,
                  }}
                >
                  <div className="admin-pipeline-fill admin-pipeline-fill--sale" />
                </div>
                <p>{stats.listings.sale} of {stats.listings.total} listings</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'listings' && (
        <div className="admin-table-wrap">
          {loading ? (
            <p className="meta">Loading listings…</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Property</th>
                  <th>City</th>
                  <th>Type</th>
                  <th>Price</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {listings.map((row) => (
                  <tr key={row.key}>
                    <td><strong>{row.title}</strong></td>
                    <td>{row.city}</td>
                    <td>
                      <span className={`admin-type-pill admin-type-pill--${row.type === 'Sale' ? 'sale' : 'rent'}`}>
                        {row.type}
                      </span>
                    </td>
                    <td>{row.price}</td>
                    <td>{row.source === 'house' ? 'Database' : 'Catalog'}</td>
                    <td>{row.isActive ? 'Live' : 'Hidden'}</td>
                    <td className="admin-row-actions">
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => startEdit(row)}>
                        Edit
                      </button>
                      <button type="button" className="btn btn-sm admin-btn-danger" onClick={() => handleDelete(row)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!loading && listings.length === 0 && (
            <p className="meta">No listings yet. Add your first property.</p>
          )}
        </div>
      )}


      {tab === 'payments' && (
        <div className="admin-table-wrap">
          {paymentsLoading && <p className="meta">Loading payments from Paystack…</p>}
          {paymentsError && <p className="error-text admin-banner">{paymentsError}</p>}
          {!paymentsLoading && !paymentsError && payments.length === 0 && (
            <p className="meta">No payments found on your Paystack account.</p>
          )}
          {!paymentsLoading && payments.length > 0 && (
            <>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Client</th>
                    <th>Email</th>
                    <th>Amount</th>
                    <th>Reference</th>
                    <th>Channel</th>
                    <th>Status</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.reference}>
                      <td>{p.paidAt ? new Date(p.paidAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td>
                      <td><strong>{p.customerName ?? '—'}</strong></td>
                      <td>{p.customerEmail ?? '—'}</td>
                      <td>{p.property || '—'}</td>
                      <td style={{ textTransform: 'capitalize' }}>{p.intent || '—'}</td>
                      <td><strong>{formatNaira((p.amount ?? 0) / 100)}</strong></td>
                      <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{p.reference}</td>
                      <td>
                        <span
                          className="admin-type-pill"
                          style={{
                            background: p.status === 'success' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                            color: p.status === 'success' ? '#059669' : '#dc2626',
                          }}
                        >
                          {p.status === 'success' ? 'Success' : p.status}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => viewReceipt(p.reference)}
                          disabled={receiptLoading}
                        >
                          Receipt
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'right', paddingTop: '12px', color: 'var(--text-muted, #888)', fontSize: '13px' }}>
                      Total received
                    </td>
                    <td colSpan={4} style={{ paddingTop: '12px' }}>
                      <strong>{formatNaira(payments.filter(p => p.status === 'success').reduce((sum, p) => sum + ((p.amount ?? 0) / 100), 0))}</strong>
                    </td>
                  </tr>
                </tfoot>
              </table>

              {receipt && (
                <div
                  style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
                  onClick={(e) => { if (e.target === e.currentTarget) setReceipt(null) }}
                >
                  <div style={{ background: 'var(--bg, #fff)', borderRadius: '12px', padding: '32px', maxWidth: '480px', width: '100%', maxHeight: '85vh', overflowY: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <h3 style={{ margin: 0 }}>Payment receipt</h3>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => setReceipt(null)}>Close</button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {[
                        ['Reference', receipt.reference],
                        ['Status', receipt.status],
                        ['Amount', formatNaira((receipt.amount ?? 0) / 100)],
                        ['Channel', receipt.channel],
                        ['Currency', receipt.currency],
                        ['Client name', (() => { const meta = receipt.metadata?.custom_fields ?? []; return meta.find(f => f.variable_name === 'full_name')?.value || receipt.customer?.first_name || receipt.customer?.name || '—'; })()],
                        ['Client email', receipt.customer?.email ?? '—'],
                        ['Phone', (receipt.metadata?.custom_fields ?? []).find(f => f.variable_name === 'phone')?.value ?? '—'],
                        ['Property', (receipt.metadata?.custom_fields ?? []).find(f => f.variable_name === 'property')?.value ?? '—'],
                        ['Intent', (receipt.metadata?.custom_fields ?? []).find(f => f.variable_name === 'intent')?.value ?? '—'],
                        ['Date paid', receipt.paid_at ? new Date(receipt.paid_at).toLocaleString('en-NG') : '—'],
                        ['IP address', receipt.ip_address ?? '—'],
                      ].map(([label, value]) => (
                        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', borderBottom: '0.5px solid rgba(0,0,0,0.08)', paddingBottom: '8px' }}>
                          <span style={{ color: '#888' }}>{label}</span>
                          <strong style={{ textAlign: 'right', maxWidth: '60%', wordBreak: 'break-all', textTransform: label === 'Status' || label === 'Intent' || label === 'Channel' ? 'capitalize' : 'none' }}>{value ?? '—'}</strong>
                        </div>
                      ))}
                    </div>
                    {receipt.authorization && (
                      <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(0,0,0,0.04)', borderRadius: '8px', fontSize: '13px' }}>
                        <p style={{ margin: '0 0 6px', fontWeight: 500 }}>Card details</p>
                        <p style={{ margin: 0, color: '#555' }}>
                          {receipt.authorization.card_type} •••• {receipt.authorization.last4} &nbsp;·&nbsp; {receipt.authorization.bank}
                        </p>
                      </div>
                    )}
                    <div style={{ marginTop: '20px', display: 'flex', gap: '8px' }}>
                      <a
                        href={`https://dashboard.paystack.com/#/transactions/${receipt.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-secondary btn-sm"
                      >
                        View on Paystack ↗
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {tab === 'add' && (
        <form className="admin-form" onSubmit={handleSubmit} noValidate>

          {/* ── Section: Publish settings ── */}
          {!editing && (
            <fieldset className="admin-fieldset admin-fieldset--section">
              <legend>Publish settings</legend>
              <div className="admin-form-row admin-form-row--2">
                <label className="admin-label">
                  Publish to
                  <select name="storage" value={form.storage} onChange={onChange}>
                    <option value="database">Database — shows on home immediately</option>
                    <option value="catalog">Catalog file (legacy)</option>
                  </select>
                  <span className="admin-field-hint">Database is recommended for new listings</span>
                </label>
                <label className="admin-label">
                  Listing type <span className="admin-required">*</span>
                  <select name="listingType" value={form.listingType} onChange={onChange}>
                    <option value="Rent">Rent</option>
                    <option value="Sale">Sale</option>
                  </select>
                </label>
              </div>
            </fieldset>
          )}

          {/* ── Section: Basic info ── */}
          <fieldset className="admin-fieldset admin-fieldset--section">
            <legend>Basic info</legend>
            <div className="admin-form-row admin-form-row--2">
              <label className="admin-label">
                Title <span className="admin-required">*</span>
                <input
                  name="title"
                  value={form.title}
                  onChange={onChange}
                  required
                  placeholder="e.g. 3-Bedroom Flat at Ring Road"
                />
              </label>
              <label className="admin-label">
                City <span className="admin-required">*</span>
                <input
                  name="city"
                  value={form.city}
                  onChange={onChange}
                  required
                  placeholder="e.g. Ibadan"
                />
              </label>
            </div>
            {form.storage === 'database' && (
              <label className="admin-label">
                Address
                <input
                  name="address"
                  value={form.address}
                  onChange={onChange}
                  placeholder="e.g. 12 Abeokuta Road, Agodi"
                />
              </label>
            )}
            {form.storage === 'database' && (
              <label className="admin-label">
                Description
                <textarea
                  name="description"
                  value={form.description}
                  onChange={onChange}
                  rows={4}
                  placeholder="Describe the property — location highlights, features, nearby landmarks…"
                  style={{ resize: 'vertical', lineHeight: 1.6 }}
                />
              </label>
            )}
          </fieldset>

          {/* ── Section: Pricing ── */}
          <fieldset className="admin-fieldset admin-fieldset--section">
            <legend>Pricing</legend>
            <label className="admin-label" style={{ maxWidth: 320 }}>
              {form.listingType === 'Rent' ? 'Price per night (₦)' : 'Sale price (₦)'} <span className="admin-required">*</span>
              <input
                name="price"
                type={form.storage === 'catalog' ? 'text' : 'number'}
                min="0"
                value={form.price}
                onChange={onChange}
                required
                placeholder={form.storage === 'catalog' ? '₦1,250,000' : '45000'}
              />
              <span className="admin-field-hint">
                {form.listingType === 'Rent' ? 'Amount in Naira charged per night' : 'Full asking price in Naira'}
              </span>
            </label>
          </fieldset>

          {/* ── Section: Property details ── */}
          <fieldset className="admin-fieldset admin-fieldset--section">
            <legend>Property details</legend>
            <div className="admin-form-row admin-form-row--3">
              <label className="admin-label">
                Bedrooms
                <input name="bedrooms" type="number" min="0" value={form.bedrooms} onChange={onChange} />
              </label>
              <label className="admin-label">
                Bathrooms
                <input name="bathrooms" type="number" min="0" value={form.bathrooms} onChange={onChange} />
              </label>
              <label className="admin-label">
                Size (sqft)
                <input name="sqft" type="number" min="0" value={form.sqft} onChange={onChange} />
              </label>
            </div>
            <label className="admin-label" style={{ maxWidth: 260 }}>
              Badge
              <input
                name="badge"
                value={form.badge}
                onChange={onChange}
                placeholder="Available, Luxury, New…"
              />
              <span className="admin-field-hint">Shown as a tag on the listing card</span>
            </label>
          </fieldset>

          {/* ── Section: Media ── */}
          <fieldset className="admin-fieldset admin-fieldset--section">
            <legend>Media</legend>
            <label className="admin-label">
              Image URL
              <input
                name="imageUrl"
                type="url"
                value={form.imageUrl}
                onChange={onChange}
                placeholder="https://images.unsplash.com/…"
              />
              <span className="admin-field-hint">Paste a direct image link (Unsplash, Cloudinary, etc.)</span>
            </label>
            {form.imageUrl && (
              <div style={{ marginTop: 8 }}>
                <img
                  src={form.imageUrl}
                  alt="Preview"
                  onError={(e) => { e.currentTarget.style.display = 'none' }}
                  style={{ width: '100%', maxWidth: 320, height: 180, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }}
                />
              </div>
            )}
            {form.storage === 'database' && (
              <label className="admin-label" style={{ marginTop: 14 }}>
                Video tour URL <span style={{ fontWeight: 400, color: '#888' }}>(optional)</span>
                <input
                  name="videoTourUrl"
                  type="url"
                  value={form.videoTourUrl}
                  onChange={onChange}
                  placeholder="https://…"
                />
                <span className="admin-field-hint">Direct link to an MP4 video tour</span>
              </label>
            )}
          </fieldset>

          {/* ── Actions ── */}
          <div className="admin-form-actions">
            <button type="submit" className="btn btn-primary" disabled={submitting} style={{ minWidth: 160 }}>
              {submitting ? 'Saving…' : editing ? 'Save changes' : 'Publish listing'}
            </button>
            {editing && (
              <button type="button" className="btn btn-secondary" onClick={resetForm}>
                Cancel edit
              </button>
            )}
          </div>
        </form>
      )}
    </section>
  )
}

export default AdminPage
