import React from 'react'
import { Link } from 'react-router-dom'
import Reveal from './Reveal'

const AboutPage = () => {
  return (
    <section className="section about-page">
      <Reveal>
        <header className="about-intro">
          <p className="about-kicker">About NawfHomes</p>
          <h1>Thoughtful real estate in Ibadan and beyond</h1>
          <p className="about-lead">
            We help families, professionals, and investors find homes they are proud to live in — whether
            you are renting for a season, buying your first apartment, or listing a property you have outgrown.
          </p>
        </header>
      </Reveal>

      <Reveal delay={80}>
        <div className="about-story">
          <h2>Who we are</h2>
          <p>
            NawfHomes was built on a simple idea: property decisions should feel clear, not overwhelming.
            Our team combines local market knowledge with straightforward advice — no jargon, no pressure,
            just honest guidance from first viewing to final keys.
          </p>
          <p>
            From canal-side rentals to family homes in the suburbs, we work acrossIbadan and nearby
            communities. Every listing on this site is curated and kept up to date so you can browse with
            confidence.
          </p>
        </div>
      </Reveal>

      <Reveal delay={120}>
        <div className="about-pillars">
          <article>
            <h3>Rent & short stay</h3>
            <p>
              Furnished apartments and long-term rentals for expats, students, and professionals relocating
              to the city. Transparent nightly and monthly pricing, with viewings by appointment.
            </p>
          </article>
          <article>
            <h3>Buy & sell</h3>
            <p>
              End-to-end support for buyers and sellers — valuations, marketing, negotiations, and
              coordination with notaries and inspectors so nothing falls through the cracks.
            </p>
          </article>
          <article>
            <h3>Property management</h3>
            <p>
              Landlords trust us to present their homes professionally, handle inquiries, and keep
              listings accurate with photos, details, and optional video tours.
            </p>
          </article>
        </div>
      </Reveal>

      <Reveal delay={160}>
        <div className="stats">
          <article>
            <h3>500+</h3>
            <p>Properties sold</p>
          </article>
          <article>
            <h3>35+</h3>
            <p>Agents & appraisers</p>
          </article>
          <article>
            <h3>98%</h3>
            <p>Client satisfaction</p>
          </article>
        </div>
      </Reveal>

      <Reveal delay={200}>
        <div className="about-visit">
          <h2>Visit us</h2>
          <p>
            <strong>NawfHomes Office</strong>
            <br />
            16, Islamic Shopping Mall, Mall Block D (Upstairs), Bashorun, Ibadan
            <br />
            <a href="mailto:info@nbmakelaardij.nl">nawfhomes@gmail.com</a>
            <br />
            <a href="tel:+31206768022">09027512008</a>
          </p>
          <p className="about-note">
            <strong>Please note:</strong> Office visits and property viewings are by appointment only.
            Plan at least 24 hours ahead so we can prepare the right listings for you.
          </p>
          <div className="about-actions">
            <Link to="/login" className="btn btn-secondary">
              View all homes
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  )
}

export default AboutPage
