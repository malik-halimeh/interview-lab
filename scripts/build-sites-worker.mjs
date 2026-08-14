import { mkdir, writeFile } from 'node:fs/promises'

const worker = `export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request)
    if (response.status !== 404 || request.method !== 'GET') return response
    const acceptsHtml = request.headers.get('accept')?.includes('text/html')
    if (!acceptsHtml) return response
    const fallback = new URL('/index.html', request.url)
    return env.ASSETS.fetch(new Request(fallback, request))
  }
}
`

await mkdir('dist/server', { recursive: true })
await writeFile('dist/server/index.js', worker, 'utf8')
console.log('Prepared the static PWA for Cloudflare Worker hosting.')
