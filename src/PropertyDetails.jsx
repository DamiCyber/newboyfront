import React, { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { fetchListingByKey, findListing, getListingImages, ensureListingVideos } from './api'
import Reveal from './Reveal'

function enrichListing(property) {
  if (!property) return null
  const gallery = getListingImages(property)
  const description =
    property.description?.trim() ||
    `${property.title} is a ${property.type?.toLowerCase() ?? 'listing'} in ${property.city}. ` +
      `Contact NB Homes to schedule a viewing or request more information about this property.`

  return {
    ...property,
    gallery,
    description,
    videos: ensureListingVideos(property, property.source),
  }
}

const PropertyDetails = ({ properties }) => {
  const { id: routeId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [property, setProperty] = useState(() =>
    enrichListing(location.state?.property ?? findListing(properties, routeId)),
  )
  const [loading, setLoading] = useState(!property)
  const [activeImage, setActiveImage] = useState(0)

  useEffect(() => {
    const fromList = enrichListing(findListing(properties, routeId))
    if (fromList) {
      setProperty(fromList)
      setLoading(false)
      return
    }

    if (location.state?.property) {
      setProperty(enrichListing(location.state.property))
      setLoading(false)
      return
    }

    const controller = new AbortController()
    setLoading(true)
    fetchListingByKey(routeId, controller.signal)
      .then((found) => {
        if (!controller.signal.aborted) setProperty(enrichListing(found))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [routeId, properties, location.state?.property])

  const images = useMemo(() => property?.gallery ?? [], [property])

  useEffect(() => {
    setActiveImage(0)
  }, [property?.listingKey])

  if (loading) {
    return (
      <section className="section property-detail">
        <p className="meta skeleton-shimmer" style={{ maxWidth: 200, height: 20, borderRadius: 4 }}>
          &nbsp;
        </p>
      </section>
    )
  }

  if (!property) {
    return (
      <section className="section property-detail">
        <Reveal>
          <div className="section-head">
            <h2>Property not found</h2>
          </div>
          <p>
            The requested property does not exist.{' '}
            <Link className="btn btn-secondary" to="/">
              Go back
            </Link>
          </p>
        </Reveal>
      </section>
    )
  }

  const handleCheckout = () => {
    navigate('/checkout', {
      state: {
        listingKey: property.listingKey ?? String(property.id),
        intent: property.type === 'Rent' ? 'rent' : 'buy',
      },
    })
  }

  const mainImage = images[activeImage] ?? property.image
  const sqftLabel =
    (property.sqft ?? 0) > 0 ? `${Number(property.sqft).toLocaleString()} sqft` : '—'

  return (
    <section className="section property-detail">
      <Reveal>
        <Link className="property-detail-back" to="/">
          ← Back to listings
        </Link>

        <header className="property-detail-header">
          <span className="badge">{property.badge}</span>
          <h1>{property.title}</h1>
          <p className="meta">
            {property.city}
            {property.address ? ` • ${property.address}` : ''} • {property.type}
          </p>
          <p className="price">{property.price}</p>
        </header>
      </Reveal>

      {mainImage && (
        <Reveal delay={80}>
          <div className="property-detail-gallery">
            <img
              key={mainImage}
              className="property-detail-hero"
              src={mainImage}
              alt={property.title}
              loading="eager"
            />
            {images.length > 1 && (
              <div className="property-detail-thumbs">
                {images.map((src, index) => (
                  <button
                    key={`${src}-${index}`}
                    type="button"
                    className={`property-detail-thumb ${index === activeImage ? 'active' : ''}`}
                    onClick={() => setActiveImage(index)}
                    aria-label={`Show image ${index + 1}`}
                    aria-pressed={index === activeImage}
                  >
                    <img src={src} alt="" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </Reveal>
      )}

      <Reveal delay={120}>
        <div className="property-detail-facts">
          <article>
            <h3>Bedrooms</h3>
            <p>{property.bedrooms ?? '—'}</p>
          </article>
          <article>
            <h3>Bathrooms</h3>
            <p>{property.bathrooms ?? '—'}</p>
          </article>
          <article>
            <h3>Size</h3>
            <p>{sqftLabel}</p>
          </article>
          <article>
            <h3>Type</h3>
            <p>{property.type}</p>
          </article>
        </div>
      </Reveal>

      <Reveal delay={160}>
        <div className="property-detail-description">
          <h2>About this home</h2>
          <p>{property.description}</p>
        </div>
      </Reveal>

      {images.length > 0 && (
        <Reveal delay={200}>
          <div className="property-detail-grid">
            <h2>All photos</h2>
            <div className="grid">
              {images.map((src, index) => (
                <article key={`${src}-${index}`} className="property-card">
                  <div className="property-image-frame">
                    <img
                      className="property-image"
                      src={src}
                      alt={`${property.title} — photo ${index + 1}`}
                      loading="lazy"
                    />
                  </div>
                </article>
              ))}
            </div>
          </div>
        </Reveal>
      )}

      {property.videos?.length > 0 && (
        <Reveal delay={240}>
          <div className="property-detail-videos">
            <h2>Video tour</h2>
            <div className="grid">
              {property.videos.map((videoUrl) => (
                <article key={videoUrl} className="property-card">
                  <video controls src={videoUrl} className="property-detail-video" preload="metadata" />
                </article>
              ))}
            </div>
          </div>
        </Reveal>
      )}

      <Reveal delay={280}>
        <div className="property-detail-actions">
          <button className="btn btn-primary" type="button" onClick={handleCheckout}>
            {property.type === 'Rent' ? 'Rent this home' : 'Buy this home'}
          </button>
          <Link className="btn btn-secondary" to="/">
            Browse more homes
          </Link>
        </div>
      </Reveal>
    </section>
  )
}

export default PropertyDetails
