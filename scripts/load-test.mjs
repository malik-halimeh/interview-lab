const site = process.env.SITE_URL ?? 'http://127.0.0.1:4173'
const api = process.env.ASSESSMENT_API_URL

async function timed(label, jobs) {
  const started = performance.now()
  const responses = await Promise.all(jobs)
  const failed = responses.filter((response) => !response.ok)
  const duration = Math.round(performance.now() - started)
  if (failed.length) throw new Error(`${label}: ${failed.length} requests failed`)
  console.log(`${label}: ${responses.length} requests completed in ${duration} ms`)
}

await timed('40 simultaneous candidate shell reads', Array.from({ length: 40 }, () => fetch(site, { cache: 'no-store' })))

if (api) {
  const endpoints = Array.from({ length: 100 }, (_, index) => `${api}/leaderboard?mode=${index % 2 ? 'strict' : 'flexible'}`)
  await timed('100 concurrent sanitized leaderboard reads', endpoints.map((url) => fetch(url, { cache: 'no-store' })))
} else {
  console.log('Leaderboard load check skipped: set ASSESSMENT_API_URL to the deployed assessment-api URL.')
}
