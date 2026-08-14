import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  return (await Promise.all(entries.map((entry) => entry.isDirectory() ? files(join(directory, entry.name)) : [join(directory, entry.name)]))).flat()
}

const forbidden = ['correctOptionIds', 'assessmentItemById', 'difficultyB', 'server/assessmentBank']
const assets = (await files('dist')).filter((file) => /\.(js|html)$/.test(file))
const leaks = []
for (const file of assets) {
  const content = await readFile(file, 'utf8')
  for (const marker of forbidden) if (content.includes(marker)) leaks.push(`${file}: ${marker}`)
}
if (leaks.length) {
  console.error(`Server-only assessment material leaked into the browser build:\n${leaks.join('\n')}`)
  process.exit(1)
}
console.log(`Checked ${assets.length} browser files: no assessment keys or server item bank markers found.`)
