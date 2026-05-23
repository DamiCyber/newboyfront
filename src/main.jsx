import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './animations.css'
import './responsive.css'
import { prefetchListings } from './api'
import App from './App.jsx'
import AppLoader from './AppLoader.jsx'

prefetchListings()

const Root = () => {
  const [loaded, setLoaded] = useState(false)
  return (
    <>
      {!loaded && <AppLoader onDone={() => setLoaded(true)} />}
      <div style={{ visibility: loaded ? 'visible' : 'hidden' }}>
        <App />
      </div>
    </>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
