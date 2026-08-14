import { ArrowRight, EyeSlash, GlobeHemisphereWest, GoogleLogo, LockKey, Medal, WarningCircle } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { getLeaderboard, getPersonalScores, type AssessmentMode, type LeaderboardRow, type PersonalScoreRow } from '../lib/assessmentApi'
import { useAuth } from '../lib/auth'

type ScoreView = 'public' | 'mine'

const formatDate = (value: string) => new Intl.DateTimeFormat(undefined, {
  day: 'numeric', month: 'short', year: 'numeric'
}).format(new Date(value))

export function LeaderboardPage() {
  const auth = useAuth()
  const [view, setView] = useState<ScoreView>('public')
  const [mode, setMode] = useState<AssessmentMode>('flexible')
  const [publicRows, setPublicRows] = useState<LeaderboardRow[]>([])
  const [personalRows, setPersonalRows] = useState<PersonalScoreRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setError('')
    if (view === 'mine' && !auth.user) {
      setPersonalRows([])
      setLoading(false)
      return
    }
    setLoading(true)
    const load = view === 'public' ? getLeaderboard(mode).then(setPublicRows) : getPersonalScores(mode).then(setPersonalRows)
    load.catch((reason: Error) => setError(reason.message)).finally(() => setLoading(false))
  }, [auth.user, mode, view])

  return (
    <div className="page leaderboard-page">
      <PageHeader
        eyebrow="Public ranking / private history"
        title="Scores, separated clearly"
        description="Public visibility controls sharing only. Your completed attempts remain private and available to your account."
        actions={<div className="score-view-switch" aria-label="Choose score view">
          <button className={view === 'public' ? 'selected' : ''} onClick={() => setView('public')}><GlobeHemisphereWest /> Public board</button>
          <button className={view === 'mine' ? 'selected' : ''} onClick={() => setView('mine')}><LockKey /> My scores</button>
        </div>}
      />

      <div className="score-controls">
        <div className="mode-switch" aria-label="Assessment mode"><button className={mode === 'flexible' ? 'selected' : ''} onClick={() => setMode('flexible')}>Flexible</button><button className={mode === 'strict' ? 'selected' : ''} onClick={() => setMode('strict')}>Strict</button></div>
        <span>{view === 'public' ? 'Shared pseudonymous rankings' : 'Visible only to your signed-in account'}</span>
      </div>

      {view === 'public' ? <>
        <div className="board-notice"><EyeSlash /><p>Hiding your score removes it from this public board only. Your complete attempt history stays available under <button onClick={() => setView('mine')}>My scores</button>.</p></div>
        <div className="leaderboard-table" role="table" aria-label={`${mode} public leaderboard`}>
          <div className="leaderboard-head" role="row"><span>Rank</span><span>Candidate</span><span>Readiness</span><span>Scaled grade</span></div>
          {loading && <div className="leaderboard-empty">Loading verified scores...</div>}
          {!loading && error && <div className="leaderboard-empty"><WarningCircle /> {error}</div>}
          {!loading && !error && publicRows.length === 0 && <div className="leaderboard-empty">No eligible {mode} scores are currently public.</div>}
          {!loading && !error && publicRows.map((row) => (
            <div className={`leaderboard-row${row.own ? ' own' : ''}`} role="row" key={`${row.rank}-${row.displayName}`}><span className="rank">{row.rank <= 3 ? <Medal weight={row.rank === 1 ? 'fill' : 'duotone'} /> : null}{String(row.rank).padStart(2, '0')}</span><strong>{row.displayName}{row.own && <small>You</small>}</strong><span>{row.band}</span><b>{row.grade}</b></div>
          ))}
        </div>
        <p className="board-footnote">The board uses the best eligible grade from each candidate's latest three completed attempts in this mode. Response time is never a hidden tie-breaker.</p>
      </> : !auth.user ? (
        <section className="signin-callout scores-signin">
          <GoogleLogo size={34} weight="duotone" />
          <div><h2>Sign in to see your scores</h2><p>Only your authenticated account can request your private assessment history.</p></div>
          <button className="button primary" onClick={() => void auth.signIn('/leaderboard')}><GoogleLogo weight="bold" /> Continue with Google</button>
        </section>
      ) : <>
        <div className="personal-score-summary"><LockKey weight="duotone" /><div><strong>Your private {mode} history</strong><span>{auth.profile.leaderboardVisible ? 'Public sharing is currently on. Every attempt below remains private to you.' : 'Public sharing is off. These attempts remain visible only to you.'}</span></div></div>
        <div className="personal-scores" role="table" aria-label={`Your ${mode} assessment history`}>
          <div className="personal-score-head" role="row"><span>Completed</span><span>Result status</span><span>Raw score</span><span>Scaled grade</span><span>Report</span></div>
          {loading && <div className="leaderboard-empty">Loading your private scores...</div>}
          {!loading && error && <div className="leaderboard-empty"><WarningCircle /> {error}</div>}
          {!loading && !error && personalRows.length === 0 && <div className="leaderboard-empty">You have no completed {mode} assessments yet.</div>}
          {!loading && !error && personalRows.map((row) => (
            <div className="personal-score-row" role="row" key={row.id}>
              <span>{formatDate(row.completedAt)}</span>
              <span><strong>{row.band}</strong><small>{row.leaderboardEligible ? auth.profile.leaderboardVisible ? 'Eligible for public board' : 'Eligible, currently hidden' : 'Private result'}</small></span>
              <span>{row.correctCount} / {row.answeredCount}</span>
              <b>{row.grade}</b>
              <Link to={`/results/${row.id}`} aria-label={`Open ${row.mode} result from ${formatDate(row.completedAt)}`}>Open <ArrowRight /></Link>
            </div>
          ))}
        </div>
        <p className="board-footnote">My scores includes completed attempts even when public sharing is off or an attempt is not leaderboard eligible.</p>
      </>}
    </div>
  )
}
