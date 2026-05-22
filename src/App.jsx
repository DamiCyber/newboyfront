import React, { useEffect, useMemo, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useNavigate, Link } from 'react-router-dom'
import Nested from './Nested'
import NB from './NB'
import AboutPage from './AboutPage'
import PropertyDetailsPage from './PropertyDetails'
import CheckoutPage from './CheckoutPage'
import AdminPage from './AdminPage'
import './App.css'
import Reveal from './Reveal'
import { clearAdminSession } from './adminAuth'
import { getCachedListings, loadListingsProgressive } from './api'

const HomePage = ({ properties, loading, error }) => {
  const [search, setSearch] = useState('')
  const [type, setType] = useState('All')
  const [heroIndex, setHeroIndex] = useState(0)

  const heroImages = useMemo(
    () => [
      'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1800&q=80',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1800&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1800&q=80',
      'https://images.unsplash.com/photo-1600566753151-384129cf4e3e?auto=format&fit=crop&w=1800&q=80',
    ],
    [],
  )

  const availableTypes = useMemo(() => {
    const types = properties?.map((property) => property.type) ?? []
    return ['All', ...new Set(types)]
  }, [properties])

  const visibleProperties = useMemo(() => {
    const list = properties ?? []
    return list.filter((property) => {
      const matchesSearch = `${property.title} ${property.city}`
        .toLowerCase()
        .includes(search.toLowerCase())
      const matchesType = type === 'All' || property.type === type
      return matchesSearch && matchesType
    })
  }, [properties, search, type])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % heroImages.length)
    }, 4500)

    return () => window.clearInterval(timer)
  }, [heroImages.length])

  const showSkeleton = loading && visibleProperties.length === 0

  return (
    <>
      {error && (
        <section className="section">
          <p className="error-text">{error}</p>
        </section>
      )}
      <section className="hero hero-carousel reveal reveal--visible" style={{ '--reveal-delay': '0ms' }}>
        <div className="hero-image-wrap">
          <img
            key={heroImages[heroIndex]}
            src={heroImages[heroIndex]}
            alt="Amsterdam real estate"
            className="hero-image hero-image--swap"
            loading="eager"
          />
          <div className="hero-overlay">
            <p className="hero-overline">Peter Bruin inspired layout</p>
            <h1>Our Service</h1>
            <p>
              NB Real Estate specializes in rentals, purchases, lettings, and sales in
              Amsterdam. Expect more than the usual quality and reliability.
            </p>
            <div className="hero-actions">
              <a href="#discover" className="btn btn-primary">
                View listings
              </a>
              <a href="tel:091200391" className="btn btn-secondary">
                Call 091200391
              </a>
            </div>
            <p className="success-text">
              <strong>Important:</strong> Schedule viewings at least 24 hours in advance.
            </p>
          </div>
          <div className="carousel-dots">
            {heroImages.map((image, index) => (
              <button
                key={image}
                type="button"
                className={`carousel-dot ${index === heroIndex ? 'active' : ''}`}
                onClick={() => setHeroIndex(index)}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      <Reveal>
        <section id="discover" className="filters">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by street, neighborhood, or city"
            aria-label="Search properties"
          />
          <select
            value={type}
            onChange={(event) => setType(event.target.value)}
            aria-label="Filter by property type"
          >
            {availableTypes.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </section>
      </Reveal>

      <NB
        loading={showSkeleton}
        skeletonCount={8}
        visibleProperties={visibleProperties.slice(0, 12)}
      />

      <Reveal delay={100}>
        <section className="section office-block">
          <h2>Our Office</h2>
          <p>16, Islamic Shopping Mall, Mall Block D (Upstairs), Bashorun, Ibadan</p>
          <p>nawfthome@gmail.com</p>
        </section>
      </Reveal>
    </>
  )
}

const AdminLogoutPage = () => {
  const navigate = useNavigate()
  useEffect(() => {
    clearAdminSession()
  }, [])
  return (
    <section className="section">
      <div className="section-head">
        <h2>Logged out</h2>
        <p>You have been logged out as admin.</p>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn btn-primary" type="button" onClick={() => navigate('/')}>
          Back to Home
        </button>
        <button className="btn btn-secondary" type="button" onClick={() => navigate('/login')}>
          Browse listings
        </button>
        <button className="btn" type="button" onClick={() => navigate('/admin')}>
          Back to Admin (login required)
        </button>
      </div>
    </section>
  )
}

const BookingsPage = () => {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    const fetchAll = async (isRefresh = false) => {
      try {
        if (!isRefresh) setLoading(true)
        setError('')
        const { data, offline } = await loadListingsProgressive(
          ({ data: partial }) => {
            if (!controller.signal.aborted) {
              setItems(partial)
              setLoading(false)
            }
          },
          controller.signal,
        )
        if (!controller.signal.aborted) {
          setItems(data)
          if (offline) setError('API offline — showing demo listings.')
        }
      } catch (e) {
        if (e.name !== 'AbortError') {
          setError('Could not load properties.')
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    fetchAll(false)
    const id = window.setInterval(() => fetchAll(true), 60000)
    return () => {
      controller.abort()
      window.clearInterval(id)
    }
  }, [])

  if (loading && items.length === 0) {
    return (
      <section className="section" aria-busy="true" aria-live="polite">
        <div className="section-head">
          <h2>All Homes</h2>
          <p>Loading...</p>
        </div>
        <div className="grid">
          {[...Array(6)].map((_, i) => (
            <article key={i} className="property-card" style={{ opacity: 0.6 }}>
              <div className="property-image" style={{ background: '#eee', width: '100%', height: 180, borderRadius: 8 }} />
              <span className="badge" style={{ background: '#ddd', color: '#ddd' }}>••••</span>
              <h3 style={{ background: '#eee', height: 18, borderRadius: 4 }}>&nbsp;</h3>
              <p className="meta" style={{ background: '#f2f2f2', height: 14, borderRadius: 4 }}>&nbsp;</p>
              <p className="price" style={{ background: '#eee', height: 16, borderRadius: 4 }}>&nbsp;</p>
              <p className="features" style={{ background: '#f2f2f2', height: 14, borderRadius: 4 }}>&nbsp;</p>
            </article>
          ))}
        </div>
      </section>
    )
  }

  return (
    <section className="section">
      <div className="section-head">
        <h2>All Homes</h2>
        <p>All properties: Rent, Sale, and Luxury (where applicable).</p>
      </div>
      {error && <p className="error-text" style={{ marginBottom: '16px' }}>{error}</p>}
      <div className="grid">
        {items.map((property) => (
          <article key={property.listingKey ?? `item-${property.id}`} className="property-card">
            <img className="property-image" src={property.image} alt={property.title} loading="lazy" />
            <span className="badge">{property.badge}</span>
            <h3>{property.title}</h3>
            <p className="meta">
              {property.city} • {property.type}
            </p>
            <p className="price">{property.price}</p>
            <p className="features">
              {property.bedrooms} Beds • {property.bathrooms} Baths • {(property.sqft ?? 0).toLocaleString()} sqft
            </p>
            <div className="property-card-actions">
              <Link
                className="btn btn-secondary"
                to={`/property/${property.listingKey ?? `item-${property.id}`}`}
                state={{ property }}
              >
                View Details
              </Link>
              <Link
                className={`btn btn-primary ${property.type === 'Rent' ? 'rent-now' : ''}`}
                to="/checkout"
                state={{
                  listingKey: property.listingKey ?? String(property.id),
                  intent: property.type === 'Rent' ? 'rent' : 'buy',
                }}
              >
                {property.type === 'Rent' ? 'Rent Now' : 'Buy Now'}
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

const App = () => {
  const cached = getCachedListings()
  const [properties, setProperties] = useState(cached ?? [])
  const [loading, setLoading] = useState(!cached?.length)
  const [error, setError] = useState('')
  const [listingsVersion, setListingsVersion] = useState(0)

  const refreshListings = () => setListingsVersion((v) => v + 1)

  useEffect(() => {
    const controller = new AbortController()

    const fetchData = async (isRefresh = false) => {
      try {
        if (!isRefresh) setLoading(true)
        setError('')

        const { data, offline } = await loadListingsProgressive(
          ({ data: partial }) => {
            if (!controller.signal.aborted) {
              setProperties(partial)
              setLoading(false)
            }
          },
          controller.signal,
        )

        if (!controller.signal.aborted) {
          setProperties(data)
          if (offline) {
            setError(
              'API offline — showing demo properties. Start the backend on port 4000 for live data.',
            )
          }
        }
      } catch (e) {
        if (e.name !== 'AbortError') {
          setError('Could not load properties. Please try again later.')
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    fetchData(false)
    const id = window.setInterval(() => fetchData(true), 60000)
    return () => {
      controller.abort()
      window.clearInterval(id)
    }
  }, [listingsVersion])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Nested />}>
          <Route index element={<HomePage properties={properties} loading={loading} error={error} />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="login" element={<BookingsPage />} />
          <Route path="admin" element={<AdminPage onListingsChange={refreshListings} />} />
          <Route path="admin/logout" element={<AdminLogoutPage />} />
          <Route path="property/:id" element={<PropertyDetailsPage properties={properties} />} />
          <Route path="checkout" element={<CheckoutPage properties={properties} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App