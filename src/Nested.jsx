import React, { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import './Nested.css'
import { getHealth } from './api'

const navPillStyle = ({ isActive }) => ({
  padding: '8px 12px',
  borderRadius: 999,
  textDecoration: 'none',
  color: isActive ? '#fff' : '#222',
  background: isActive ? '#111' : 'transparent',
  border: isActive ? '1px solid #111' : '1px solid #ddd',
})

const Nested = () => {
  const location = useLocation()
  const [apiOk, setApiOk] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    let cancelled = false
    const check = async () => {
      try {
        const ok = await getHealth()
        if (!cancelled) setApiOk(ok)
      } catch {
        if (!cancelled) setApiOk(false)
      }
    }
    check()
    const id = window.setInterval(check, 15000)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [])

  return (
    <div className="site-shell">
      <div className="contact-strip contact-strip--dark">
        <p>Challenge 22, Nigeria</p>
        <a href="tel:091200391">091200391</a>
        <p>
          <strong>Important:</strong> Office visits by appointment only.
        </p>
      </div>
      <header className="topbar site-header">
        <div className="topbar-inner">
          <div className="topbar-brand">
            <p className="brand-kicker">Newboy STYLE</p>
            <Link to="/" className="brand">
              NawftHomes
            </Link>
          </div>
          <button
            type="button"
            className={`nav-toggle ${menuOpen ? 'nav-toggle--open' : ''}`}
            aria-expanded={menuOpen}
            aria-controls="site-navigation"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="nav-toggle-icon" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </button>
          <div
            id="site-navigation"
            className={`topbar-nav ${menuOpen ? 'is-open' : ''}`}
          >
            <nav className="nav nav-group" aria-label="Main">
              <NavLink to="/" end className="nav-pill" style={navPillStyle}>
                Home
              </NavLink>
              <NavLink to="/about" className="nav-pill" style={navPillStyle}>
                About
              </NavLink>
              <NavLink to="/login" className="nav-pill" style={navPillStyle}>
                Bookings
              </NavLink>
              <NavLink to="/checkout" className="nav-pill" style={navPillStyle}>
                Checkout
              </NavLink>
            </nav>
            <nav className="nav nav-group" aria-label="Admin">
              <NavLink to="/admin" className="nav-pill" style={navPillStyle}>
                Admin
              </NavLink>
            </nav>
            <div className="api-status">
              <span
                className={`api-status-dot ${apiOk == null ? 'api-status-dot--checking' : ''}`}
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  display: 'inline-block',
                  flexShrink: 0,
                  backgroundColor: apiOk == null ? '#bbb' : apiOk ? '#2ecc71' : '#e74c3c',
                }}
                aria-hidden
              />
              <span className="api-status-label">
                {apiOk == null ? 'Checking API' : apiOk ? 'API Online' : 'API Offline'}
              </span>
            </div>
          </div>
        </div>
      </header>
      <main className="main-content">
        <div key={location.pathname} className="page-enter">
          <Outlet />
        </div>
      </main>
      <footer className="footer">
        <p>NawftHomes - Challenge 22, Nigeria - 091200391</p>
      </footer>
    </div>
  )
}

export default Nested
