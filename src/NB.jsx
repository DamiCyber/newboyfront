import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Reveal from './Reveal'
import './NB.css'

const SkeletonCard = () => {
  return (
    <article className="property-card" style={{ opacity: 1 }}>
      <div className="property-image skeleton-shimmer" style={{ width: '100%', height: 180, borderRadius: 8 }} />
      <span className="badge skeleton-shimmer" style={{ width: 80, height: 20 }}>&nbsp;</span>
      <h3 className="skeleton-shimmer" style={{ height: 18, borderRadius: 4 }}>&nbsp;</h3>
      <p className="meta skeleton-shimmer" style={{ height: 14, borderRadius: 4 }}>&nbsp;</p>
      <p className="price skeleton-shimmer" style={{ height: 16, borderRadius: 4 }}>&nbsp;</p>
      <p className="features skeleton-shimmer" style={{ height: 14, borderRadius: 4 }}>&nbsp;</p>
    </article>
  )
}

const PropertyCard = ({ property, index }) => {
  const navigate = useNavigate()
  return (
    <Reveal delay={Math.min(index * 60, 360)}>
      <Link
        to={`/property/${property.listingKey ?? property.id}`}
        state={{ property }}
        style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
      >
        <article className="property-card property-card--clickable">
          <div className="property-image-frame">
            <img className="property-image" src={property.image} alt={property.title} loading="lazy" />
          </div>
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
            <span className="btn btn-secondary">View Details</span>
            <button
              className={`btn btn-primary ${property.type === 'Rent' ? 'rent-now' : ''}`}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                navigate('/checkout', {
                  state: {
                    listingKey: property.listingKey ?? String(property.id),
                    intent: property.type === 'Rent' ? 'rent' : 'buy',
                  },
                })
              }}
            >
              {property.type === 'Rent' ? 'Rent Now' : 'Buy Now'}
            </button>
          </div>
        </article>
      </Link>
    </Reveal>
  )
}

const NB = ({ visibleProperties, loading = false, skeletonCount = 8 }) => {
  return (
    <section className="section">
      <Reveal>
        <div className="section-head">
          <h2>New at Nawf Real Estate</h2>
          <p>For sale and for rent in Ibadan and surroundings.</p>
          <p>
            <strong>Important:</strong> Availability can change daily; contact us before planning a visit.
          </p>
        </div>
      </Reveal>
      <div className="grid">
        {loading
          ? [...Array(skeletonCount)].map((_, i) => <SkeletonCard key={i} />)
          : visibleProperties.map((property, index) => (
              <PropertyCard
                key={property.listingKey ?? `${property.source ?? 'item'}-${property.id}`}
                property={property}
                index={index}
              />
            ))}
      </div>
    </section>
  )
}

export default NB