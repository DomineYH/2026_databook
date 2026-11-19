import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// og:image must be absolute for 카카오톡 previews; Vercel exposes the production domain at build time.
const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : ''

export default defineConfig({
  plugins: [react(), { name: 'site-url', transformIndexHtml: (html) => html.replaceAll('%SITE_URL%', siteUrl) }],
})
