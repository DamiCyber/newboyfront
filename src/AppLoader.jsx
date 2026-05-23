import React, { useEffect, useState } from 'react'

const AppLoader = ({ onDone }) => {
  const [phase, setPhase] = useState('in') // 'in' | 'hold' | 'out'

  useEffect(() => {
    // 'in' phase: logo animates in (handled by CSS transition on mount)
    // after 300ms switch to 'hold' so elements become visible
    const holdTimer = setTimeout(() => setPhase('hold'), 300)
    // after 2.8s start exit
    const outTimer = setTimeout(() => setPhase('out'), 2800)
    // after exit animation completes, unmount
    const doneTimer = setTimeout(() => onDone?.(), 3600)
    return () => {
      clearTimeout(holdTimer)
      clearTimeout(outTimer)
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
      pointerEvents: 'none',
      // Exit: scale up + fade out
      opacity: phase === 'out' ? 0 : 1,
      transform: phase === 'out' ? 'scale(1.06)' : 'scale(1)',
      transition: phase === 'out'
        ? 'opacity 0.7s cubic-bezier(0.4,0,1,1), transform 0.7s cubic-bezier(0.4,0,1,1)'
        : 'none',
    }}>

      {/* Logo mark — springs in */}
      <div style={{
        opacity: phase === 'in' ? 0 : 1,
        transform: phase === 'in' ? 'scale(0.75) translateY(12px)' : 'scale(1) translateY(0)',
        transition: 'opacity 0.55s cubic-bezier(0.22,1,0.36,1), transform 0.55s cubic-bezier(0.22,1,0.36,1)',
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

      {/* Brand name — slides up */}
      <div style={{
        opacity: phase === 'in' ? 0 : 1,
        transform: phase === 'in' ? 'translateY(10px)' : 'translateY(0)',
        transition: 'opacity 0.5s cubic-bezier(0.22,1,0.36,1) 0.1s, transform 0.5s cubic-bezier(0.22,1,0.36,1) 0.1s',
        textAlign: 'center',
      }}>
        <p style={{
          margin: 0,
          fontFamily: 'system-ui, sans-serif',
          fontSize: '0.6rem',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.4)',
          marginBottom: 5,
        }}>Oluwanifemi STYLE</p>
        <p style={{
          margin: 0,
          fontFamily: 'Georgia, serif',
          fontSize: '1.5rem',
          fontWeight: 700,
          color: '#ffffff',
          letterSpacing: '0.04em',
        }}>nawfhomes</p>
      </div>

      {/* Progress bar — fills over 2.4s then holds full */}
      <div style={{
        opacity: phase === 'in' ? 0 : 1,
        transition: 'opacity 0.4s ease 0.2s',
        marginTop: 8,
        width: 52,
        height: 2,
        background: 'rgba(255,255,255,0.12)',
        borderRadius: 999,
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          background: '#ffffff',
          borderRadius: 999,
          animation: phase !== 'in' ? 'loaderBar 2.2s cubic-bezier(0.4,0,0.2,1) forwards' : 'none',
          width: '0%',
        }}/>
      </div>

      <style>{`
        @keyframes loaderBar {
          0%   { width: 0% }
          60%  { width: 75% }
          85%  { width: 92% }
          100% { width: 100% }
        }
      `}</style>
    </div>
  )
}

export default AppLoader