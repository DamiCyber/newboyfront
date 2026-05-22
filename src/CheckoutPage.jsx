import React, { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { fetchListingByKey, findListing, getListingImages } from './api'
import { computeCheckoutQuote, formatNaira } from './pricing'
import Reveal from './Reveal'

function usePaystackScript() {
  const [ready, setReady] = useState(!!window.PaystackPop)
  useEffect(() => {
    if (window.PaystackPop) { setReady(true); return }
    const script = document.createElement('script')
    script.src = 'https://js.paystack.co/v1/inline.js'
    script.async = true
    script.onload = () => setReady(true)
    document.body.appendChild(script)
    return () => { document.body.removeChild(script) }
  }, [])
  return ready
}

function nightsBetween(checkIn, checkOut) {
  if (!checkIn || !checkOut) return null
  const start = new Date(checkIn)
  const end = new Date(checkOut)
  const diff = Math.round((end - start) / (1000 * 60 * 60 * 24))
  return diff > 0 ? diff : null
}

function defaultCheckIn() {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  return d.toISOString().slice(0, 10)
}

function defaultCheckOut(nights = 3) {
  const d = new Date()
  d.setDate(d.getDate() + 7 + nights)
  return d.toISOString().slice(0, 10)
}

const responsiveStyles = `

  .checkout-page {
    padding-left: clamp(16px, 4vw, 48px);
    padding-right: clamp(16px, 4vw, 48px);
  }

  .checkout-property-image-wrap {
    position: relative;
    overflow: hidden;
  }

  .checkout-property-image {
    width: 100%;
    height: 120px;
    object-fit: cover;
    display: block;
  }

  /* Header */
  .checkout-header {
    max-width: 640px;
  }
  .checkout-header h1 {
    font-size: clamp(1.5rem, 5vw, 2.5rem);
  }

  /* Progress steps – shrink labels on small screens */
  .checkout-steps {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .checkout-step {
    font-size: clamp(0.7rem, 2.5vw, 0.875rem);
    white-space: nowrap;
  }

  /* Two-column layout → single column on mobile */
  .checkout-layout {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: 32px;
    align-items: start;
  }

  @media (max-width: 768px) {
  checkout-form{
   width: 60%;
  }
    .checkout-layout {
      grid-template-columns: 1fr;
      gap: 24px;
    }

    /* On mobile: move sidebar below the form */
    .checkout-sidebar {
    width: 95%;
      order: 2;
    }
    .checkout-main {
      order: 1;
    }

    /* Show mobile total above submit, hide desktop sidebar total */
    .checkout-mobile-total {
      display: flex !important;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-top: 1px solid rgba(0,0,0,0.1);
      font-size: 1rem;
      font-weight: 600;
    }
  }

  @media (min-width: 769px) {
    /* Hide the inline mobile total when sidebar is visible */
    .checkout-mobile-total {
      display: none !important;
    }
  }

  /* Date row – side by side normally, stacked on very small screens */
  .checkout-date-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  @media (max-width: 480px) {
    .checkout-date-row {
      grid-template-columns: 1fr;
    }

    /* Tighter fieldset padding */
    .checkout-fieldset {
      padding: 16px;
    }

    /* Full-width submit button */
    .checkout-submit {
      width: 100%;
    }

    /* Success page actions */
    .checkout-success-actions {
      flex-direction: column;
      gap: 12px;
    }
    .checkout-success-actions .btn {
      width: 100%;
      text-align: center;
    }
  }

  .checkout-paystack-badge {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: #888;
    margin-top: 8px;
  }
  .checkout-paystack-badge strong { color: #0ba360; }

  /* Property facts grid – 2 columns on narrow screens */
  .checkout-property-facts {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
  }

  @media (max-width: 480px) {
    .checkout-property-facts {
      grid-template-columns: repeat(2, 1fr);
    }
  }
`

const CheckoutPage = ({ properties }) => {
  const location = useLocation()
  const initialKey =
    location.state?.listingKey ??
    properties?.[0]?.listingKey ??
    (properties?.[0] ? `${properties[0].source ?? 'item'}-${properties[0].id}` : '')

  const initialIntent =
    location.state?.intent ??
    (properties?.find((p) => p.listingKey === initialKey)?.type === 'Rent' ? 'rent' : 'buy')

  const [listingKey, setListingKey] = useState(initialKey)
  const [intent, setIntent] = useState(initialIntent)
  const [checkIn, setCheckIn] = useState(defaultCheckIn)
  const [checkOut, setCheckOut] = useState(() => defaultCheckOut(3))
  const [nightsOverride, setNightsOverride] = useState(3)
  const [months, setMonths] = useState(1)
  const [resolvedProperty, setResolvedProperty] = useState(null)
  const paystackReady = usePaystackScript()
  const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || ''

  const [form, setForm] = useState({ fullName: '', email: '', phone: '' })
  const [confirmation, setConfirmation] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const selected =
    findListing(properties, listingKey) ??
    (resolvedProperty?.listingKey === listingKey ? resolvedProperty : null) ??
    findListing(properties, listingKey?.replace(/^item-/, ''))

  useEffect(() => {
    if (selected || !listingKey) return
    const controller = new AbortController()
    fetchListingByKey(listingKey, controller.signal).then((found) => {
      if (!controller.signal.aborted && found) setResolvedProperty(found)
    })
    return () => controller.abort()
  }, [listingKey, selected])

  useEffect(() => {
    if (location.state?.listingKey) setListingKey(location.state.listingKey)
    if (location.state?.intent) setIntent(location.state.intent)
  }, [location.state?.listingKey, location.state?.intent])

  const priceMeta = useMemo(() => {
    if (!selected) return null
    return computeCheckoutQuote(selected, {
      intent,
      nights: nightsBetween(checkIn, checkOut) ?? nightsOverride,
      months,
    })
  }, [selected, intent, checkIn, checkOut, nightsOverride, months])

  const isMonthlyRent = priceMeta?.unit === 'month'
  const computedNights = nightsBetween(checkIn, checkOut) ?? nightsOverride

  useEffect(() => {
    const n = nightsBetween(checkIn, checkOut)
    if (n) setNightsOverride(n)
  }, [checkIn, checkOut])

  const handlePropertyChange = (event) => {
    const key = event.target.value
    setListingKey(key)
    const prop = findListing(properties, key)
    if (prop) {
      setIntent(prop.type === 'Rent' ? 'rent' : 'buy')
    }
  }

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handlePay = (event) => {
    event.preventDefault()
    if (!selected || !priceMeta || !paystackReady) return
    setSubmitting(true)
    const handler = window.PaystackPop.setup({
      key: PAYSTACK_PUBLIC_KEY,
      email: form.email,
      amount: Math.round(priceMeta.total * 100),
      currency: 'NGN',
      channels: ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer'],
      ref: `order_${Date.now()}`,
      metadata: {
        custom_fields: [
          { display_name: 'Full Name', variable_name: 'full_name', value: form.fullName },
          { display_name: 'Phone', variable_name: 'phone', value: form.phone },
          { display_name: 'Property', variable_name: 'property', value: selected?.title ?? '' },
          { display_name: 'Intent', variable_name: 'intent', value: intent },
        ],
      },
      onClose: () => setSubmitting(false),
      callback: (response) => {
        // Always verify on your backend: POST /verify-payment { reference: response.reference }
        setConfirmation({
          name: form.fullName,
          email: form.email,
          property: selected,
          quote: priceMeta,
          intent,
          reference: response.reference,
        })
        setSubmitting(false)
      },
    })
    handler.openIframe()
  }

  const heroImage = selected ? (getListingImages(selected)[0] ?? selected.image) : null

  if (confirmation) {
    return (
      <section className="section checkout-page">
        <style>{responsiveStyles}</style>
        <Reveal>
          <div className="checkout-success">
            <div className="checkout-success-icon" aria-hidden>
              ✓
            </div>
            <h2>Request received</h2>
            <p>
              Thank you, <strong>{confirmation.name}</strong>. Your{' '}
              {confirmation.intent === 'rent' ? 'reservation request' : 'purchase inquiry'} for{' '}
              <strong>{confirmation.property.title}</strong> has been submitted.
            </p>
            <p className="meta">
              We sent a summary to <strong>{confirmation.email}</strong>. Our team will confirm
              availability within one business day.
            </p>
            <div className="checkout-summary-card checkout-summary-card--compact">
              <p className="checkout-total-row">
                <span>Estimated total</span>
                <strong>{formatNaira(confirmation.quote.total)}</strong>
              </p>
              {confirmation.reference && (
                <p className="checkout-total-row" style={{ fontSize: '12px', color: '#888', marginTop: '8px' }}>
                  <span>Payment reference</span>
                  <span style={{ fontFamily: 'monospace' }}>{confirmation.reference}</span>
                </p>
              )}
            </div>
            <div className="checkout-success-actions">
              <Link to="/" className="btn btn-primary">
                Back to home
              </Link>
              <Link
                to={`/property/${confirmation.property.listingKey ?? confirmation.property.id}`}
                state={{ property: confirmation.property }}
                className="btn btn-secondary"
              >
                View property
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    )
  }

  return (
    <section className="section checkout-page">
      <style>{responsiveStyles}</style>
      <Reveal>
        <header className="checkout-header">
          <p className="checkout-kicker">Secure checkout</p>
          <h1>Complete your {intent === 'rent' ? 'stay' : 'purchase'}</h1>
          <p className="checkout-lead">
            Review your home, dates, and pricing — then submit your details. No charge until we
            confirm with you.
          </p>
          <ol className="checkout-steps" aria-label="Checkout progress">
            <li className="checkout-step checkout-step--done">Property</li>
            <li className="checkout-step checkout-step--active">Details</li>
            <li className="checkout-step">Confirm</li>
          </ol>
        </header>
      </Reveal>

      <div className="checkout-layout">
        <aside className="checkout-sidebar">
          <Reveal delay={60}>
            <div className="checkout-property-card">
              {selected ? (
                <>
                  {heroImage && (
                    <div className="checkout-property-image-wrap">
                      <img src={heroImage} alt="" className="checkout-property-image" />
                      <span className="badge checkout-property-badge">{selected.badge}</span>
                    </div>
                  )}
                  <div className="checkout-property-body">
                    <h2>{selected.title}</h2>
                    <p className="meta">
                      {selected.city}
                      {selected.address ? ` · ${selected.address}` : ''}
                    </p>
                    <ul className="checkout-property-facts">
                      <li>
                        <span>Beds</span>
                        <strong>{selected.bedrooms ?? '—'}</strong>
                      </li>
                      <li>
                        <span>Baths</span>
                        <strong>{selected.bathrooms ?? '—'}</strong>
                      </li>
                      <li>
                        <span>Size</span>
                        <strong>
                          {(selected.sqft ?? 0) > 0
                            ? `${Number(selected.sqft).toLocaleString()} sqft`
                            : '—'}
                        </strong>
                      </li>
                      <li>
                        <span>Type</span>
                        <strong>{selected.type}</strong>
                      </li>
                    </ul>
                    <p className="checkout-rate">{priceMeta?.rateLabel ?? selected.price}</p>
                    <Link
                      className="checkout-property-link"
                      to={`/property/${selected.listingKey ?? selected.id}`}
                      state={{ property: selected }}
                    >
                      View full listing →
                    </Link>
                  </div>
                </>
              ) : (
                <div style={{ padding: '20px' }}>
                  <p className="meta">Select a property to see details and pricing.</p>
                </div>
              )}
            </div>
          </Reveal>

          {selected && priceMeta && (
            <Reveal delay={120}>
              <div className="checkout-summary-card">
                <h3>Price summary</h3>
                <ul className="checkout-line-items">
                  {priceMeta.lines.map((line) => (
                    <li key={line.key} className="checkout-line-item">
                      <div>
                        <span>{line.label}</span>
                        {line.detail && <small>{line.detail}</small>}
                      </div>
                      <strong>{formatNaira(line.value)}</strong>
                    </li>
                  ))}
                </ul>
                <p className="checkout-total-row checkout-total-row--grand">
                  <span>Estimated total</span>
                  <strong>{formatNaira(priceMeta.total)}</strong>
                </p>
                <p className="checkout-disclaimer">
                  {intent === 'rent'
                    ? 'Final amount may vary slightly based on confirmed dates and local taxes.'
                    : 'Purchase costs are estimates; your notary will provide exact figures.'}
                </p>
              </div>
            </Reveal>
          )}
        </aside>

        <div className="checkout-main">
          <Reveal delay={80}>
            <form className="checkout-form" onSubmit={handlePay}>
              <fieldset className="checkout-fieldset">
                <legend>Your stay</legend>
                <label className="checkout-label">
                  Property
                  <select
                    name="listingKey"
                    value={listingKey}
                    onChange={handlePropertyChange}
                    required
                  >
                    {(properties ?? []).map((property) => (
                      <option
                        key={property.listingKey ?? `item-${property.id}`}
                        value={property.listingKey ?? `item-${property.id}`}
                      >
                        {property.title} — {property.city}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="checkout-label">
                  I want to
                  <select
                    name="intent"
                    value={intent}
                    onChange={(e) => setIntent(e.target.value)}
                  >
                    <option value="rent">Rent this home</option>
                    <option value="buy">Buy this home</option>
                  </select>
                </label>

                {intent === 'rent' && (
                  <>
                    {isMonthlyRent ? (
                      <label className="checkout-label">
                        Months
                        <input
                          type="number"
                          min={1}
                          max={24}
                          value={months}
                          onChange={(e) => setMonths(Number(e.target.value) || 1)}
                        />
                      </label>
                    ) : (
                      <>
                        <div className="checkout-date-row">
                          <label className="checkout-label">
                            Check-in
                            <input
                              type="date"
                              value={checkIn}
                              onChange={(e) => setCheckIn(e.target.value)}
                              required
                            />
                          </label>
                          <label className="checkout-label">
                            Check-out
                            <input
                              type="date"
                              value={checkOut}
                              min={checkIn}
                              onChange={(e) => setCheckOut(e.target.value)}
                              required
                            />
                          </label>
                        </div>
                        <p className="checkout-nights-pill">
                          {computedNights} night{computedNights !== 1 ? 's' : ''}
                        </p>
                      </>
                    )}
                  </>
                )}
              </fieldset>

              <fieldset className="checkout-fieldset">
                <legend>Contact & payment</legend>
                <label className="checkout-label">
                  Full name
                  <input
                    type="text"
                    name="fullName"
                    value={form.fullName}
                    onChange={handleChange}
                    required
                    placeholder="Jane Smith"
                    autoComplete="name"
                  />
                </label>
                <label className="checkout-label">
                  Email
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    placeholder="jane@example.com"
                    autoComplete="email"
                  />
                </label>
                <label className="checkout-label">
                  Phone number
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="+234 800 000 0000"
                    autoComplete="tel"
                  />
                </label>
                <div className="checkout-paystack-badge">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.35C16.5 22.15 20 17.25 20 12V6l-8-4z" fill="#0ba360"/>
                  </svg>
                  Payments secured by <strong>Paystack</strong> · SSL encrypted
                </div>
              </fieldset>

              {selected && priceMeta && (
                <div className="checkout-mobile-total">
                  <span>Total (est.)</span>
                  <strong>{formatNaira(priceMeta.total)}</strong>
                </div>
              )}

              <button
                className="btn btn-primary checkout-submit"
                type="submit"
                disabled={!selected || submitting || !paystackReady}
              >
                {!paystackReady
                  ? 'Loading…'
                  : submitting
                  ? 'Processing…'
                  : intent === 'rent'
                    ? `Reserve for ${formatNaira(priceMeta?.total ?? 0)}`
                    : `Submit offer — ${formatNaira(priceMeta?.total ?? 0)}`}
              </button>
            </form>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

export default CheckoutPage