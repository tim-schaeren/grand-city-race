import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { sentryVitePlugin } from '@sentry/vite-plugin'

// Where the console's code came from, for readable crash reports: when the
// build has a Sentry token (Netlify does), its source maps go to Sentry and
// are then deleted, so they're never published with the site.
const uploadSourceMaps = !!process.env.SENTRY_AUTH_TOKEN

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    uploadSourceMaps && sentryVitePlugin({
      org: 'da8ba6275eca',
      project: 'grand-city-race-console',
      sourcemaps: { filesToDeleteAfterUpload: ['./dist/**/*.map'] },
      telemetry: false,
    }),
  ],
  build: { sourcemap: uploadSourceMaps ? 'hidden' : false },
})
