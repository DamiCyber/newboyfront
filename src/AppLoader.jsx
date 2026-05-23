import React, { useEffect, useState } from 'react'

const AppLoader = ({ onDone }) => {
  const [phase, setPhase] = useState('in') // 'in' | 'hold' | 'out'

  useEffect(() => {
    const holdTimer = setTimeout(() => setPhase('out'), 1200)
    const doneTimer = setTimeout(() => onDone?.(), 1750)
    return () => {
      clearTimeout(holdTimer)
      clearTimeout(doneTimer)
    }
  }, [onDone])

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      background: '#111111',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 20,
      opacity: phase === 'out' ? 0 : 1,
      transition: phase === 'out' ? 'opacity 0.55s ease' : 'none',
      pointerEvents: 'none',
    }}>
      {/* Logo mark */}
      <div style={{
        opacity: phase === 'in' ? 0 : 1,
        transform: phase === 'in' ? 'scale(0.82) translateY(10px)' : 'scale(1) translateY(0)',
        transition: 'opacity 0.5s cubic-bezier(0.22,1,0.36,1), transform 0.5s cubic-bezier(0.22,1,0.36,1)',
      }}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="none" width="72" height="72">
          <rect width="200" height="200" fill="#ffffff" rx="20"/>
          <polygon points="100,30 158,82 42,82" fill="#111111"/>
          <rect x="50" y="78" width="100" height="74" fill="#111111"/>
          <rect x="79" y="112" width="28" height="40" rx="2" fill="#ffffff"/>
          <rect x="57" y="88" width="22" height="18" rx="2" fill="#ffffff"/>
          <rect x="121" y="88" width="22" height="18" rx="2" fill="#ffffff"/>
          <rect x="128" y="22" width="10" height="36" fill="#111111"/>
        </svg>
      </div>

      {/* Brand name */}
      <div style={{
        opacity: phase === 'in' ? 0 : 1,
        transform: phase === 'in' ? 'translateY(8px)' : 'translateY(0)',
        transition: 'opacity 0.5s cubic-bezier(0.22,1,0.36,1) 0.1s, transform 0.5s cubic-bezier(0.22,1,0.36,1) 0.1s',
        textAlign: 'center',
      }}>
        <p style={{
          margin: 0,
          fontFamily: 'system-ui, sans-serif',
          fontSize: '0.65rem',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.45)',
          marginBottom: 4,
        }}>Newboy Style</p>
        <p style={{
          margin: 0,
          fontFamily: 'Georgia, serif',
          fontSize: '1.5rem',
          fontWeight: 700,
          color: '#ffffff',
          letterSpacing: '0.04em',
        }}>NawftHomes</p>
      </div>

      {/* Loading bar */}
      <div style={{
        width: 48,
        height: 2,
        background: 'rgba(255,255,255,0.12)',
        borderRadius: 999,
        overflow: 'hidden',
        marginTop: 8,
        opacity: phase === 'in' ? 0 : 1,
        transition: 'opacity 0.4s ease 0.2s',
      }}>
        <div style={{
          height: '100%',
          background: '#ffffff',
          borderRadius: 999,
          animation: 'loaderBar 0.9s cubic-bezier(0.22,1,0.36,1) 0.3s forwards',
          width: '0%',
        }}/>
      </div>

      <style>{`
        @keyframes loaderBar {
          from { width: 0% }
          to   { width: 100% }
        }
      `}</style>
    </div>
  )
}

export default AppLoader
