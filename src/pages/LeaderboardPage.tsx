import { EyeSlash, Medal, WarningCircle } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { getLeaderboard, type AssessmentMode, type LeaderboardRow } from '../lib/assessmentApi'

export function LeaderboardPage() {
  const [mode, setMode] = useState<AssessmentMode>('flexible')
  const [rows, setRows] = useState<LeaderboardRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    getLeaderboard(mode).then(setRows).catch((reason: Error) => setError(reason.message)).finally(() => setLoading(false))
  }, [mode])

  return (
    <div className="page leaderboard-page">
      <PageHeader eyebrow="Pseudonymous by default" title="Candidate scores" description="Flexible and Strict results never share a ranking. Equal grades share a rank." actions={<div className="mode-switch"><button className={mode === 'flexible' ? 'selected' : ''} onClick={() => setMode('flexible')}>Flexible</button><button className={mode === 'strict' ? 'selected' : ''} onClick={() => setMode('strict')}>Strict</button></div>} />
      <div className="board-notice"><EyeSlash /><p>Nicknames are public, but the identity behind each nickname is private. Candidates reveal a real name only from their own profile.</p></div>
      <div className="leaderboard-table" role="table" aria-label={`${mode} leaderboard`}>
        <div className="leaderboard-head" role="row"><span>Rank</span><span>Candidate</span><span>Readiness</span><span>Scaled grade</span></div>
        {loading && <div className="leaderboard-empty">Loading verified scores...</div>}
        {!loading && error && <div className="leaderboard-empty"><WarningCircle /> {error}</div>}
        {!loading && !error && rows.length === 0 && <div className="leaderboard-empty">No eligible {mode} scores yet. The first completed attempt will set the pace.</div>}
        {rows.map((row) => (
          <div className={`leaderboard-row${row.own ? ' own' : ''}`} role="row" key={`${row.rank}-${row.displayName}`}><span className="rank">{row.rank <= 3 ? <Medal weight={row.rank === 1 ? 'fill' : 'duotone'} /> : null}{String(row.rank).padStart(2, '0')}</span><strong>{row.displayName}{row.own && <small>You</small>}</strong><span>{row.band}</span><b>{row.grade}</b></div>
        ))}
      </div>
      <p className="board-footnote">The board uses the best eligible grade from each candidate’s latest three completed attempts in this mode. Response time is never a hidden tie-breaker.</p>
    </div>
  )
}
