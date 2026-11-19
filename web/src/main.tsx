import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import './index.css'
import Viewer from './Viewer.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Viewer />
    <Analytics />
  </StrictMode>,
)
