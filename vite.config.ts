import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // relative base so the build works under https://<user>.github.io/<repo>/
  base: './',
  plugins: [react()],
  test: { environment: 'node' },
})
