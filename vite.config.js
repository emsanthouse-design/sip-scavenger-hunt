import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Plain Vite + React single-page app. Front end and admin live in the same
// build; the admin is a client-side route guarded by a password. Keep it boring.
export default defineConfig({
  plugins: [react()],
})
