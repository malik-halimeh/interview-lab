import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const viteConfig = readFileSync('vite.config.ts', 'utf8')
const appSource = readFileSync('src/App.tsx', 'utf8')
const mainSource = readFileSync('src/main.tsx', 'utf8')

describe('PWA deployment recovery', () => {
  it('activates new builds and removes outdated precaches automatically', () => {
    expect(existsSync('vite.config.js')).toBe(false)
    expect(existsSync('vite.config.d.ts')).toBe(false)
    expect(viteConfig).toContain("registerType: 'autoUpdate'")
    expect(viteConfig).toContain('skipWaiting: true')
    expect(viteConfig).toContain('clientsClaim: true')
    expect(viteConfig).toContain('cleanupOutdatedCaches: true')
  })

  it('keeps online assessment routes out of the offline navigation fallback', () => {
    expect(viteConfig).toContain('navigateFallbackDenylist')
    expect(viteConfig).toContain('assess|exam|results')
  })

  it('does not lazy-load the exam-to-result transition and catches render failures', () => {
    expect(appSource).toContain("import { ExamPage } from './pages/ExamPage'")
    expect(appSource).toContain("import { ResultPage } from './pages/ResultPage'")
    expect(appSource).toContain('<AppErrorBoundary>')
    expect(mainSource).toContain("window.addEventListener('vite:preloadError'")
  })
})
