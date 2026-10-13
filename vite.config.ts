import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'

const sha = (() => {
  try { return execSync('git rev-parse --short HEAD').toString().trim() } catch { return 'dev' }
})()

export default defineConfig({
  // relative base so the build works under https://<user>.github.io/<repo>/
  base: './',
  define: { __BUILD__: JSON.stringify(sha) },
  plugins: [react()],
  test: { environment: 'node' },
})
