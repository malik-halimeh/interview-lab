import { ArrowRight, CheckCircle, WarningCircle, XCircle } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { studyQuestionById } from '../content/questions'
import { getAssessmentResult, type AssessmentResultView } from '../lib/assessmentApi'
import { useAuth } from '../lib/auth'

const familyNames = { javascript: 'JavaScript', frontend: 'React and Next.js', backend: 'APIs and databases', fullstack: 'Full-stack concepts', git: 'Git and GitHub' }

export function ResultPage() {
  const { id } = useParams()
  const auth = useAuth()
  const [result, setResult] = useState<AssessmentResultView | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id || !auth.user) return
    getAssessmentResult(id).then(setResult).catch((reason: Error) => setError(reason.message))
  }, [auth.user, id])

  if (!id || !auth.configured || !auth.user) return <Navigate to="/assess" replace />
  if (error) return <div className="page centered-state"><WarningCircle size={36} /><h1>Result unavailable</h1><p>{error}</p><Link className="button primary" to="/assess">Back to assessments</Link></div>
  if (!result) return <div className="page centered-state"><span className="loading-mark" /><p>Building your evidence report...</p></div>
  const { estimate } = result

  return (
    <div className="page result-page">
      <header className="result-hero">
        <div className="score-orbit"><span>{estimate.grade}</span><small>scaled grade</small></div>
        <div><span className="eyebrow">{result.mode} assessment complete</span><h1>{estimate.band}</h1><p>This is a provisional Rasch ability estimate, not a percentage correct or hiring decision.</p><div className="result-flags"><span>{result.correctCount} / {result.answeredCount} correct</span><span>± {estimate.standardError.toFixed(2)} uncertainty</span><span>{result.leaderboardEligible ? 'Leaderboard eligible' : 'Private result'}</span><span>Level {result.highestDifficulty} demonstrated</span></div></div>
      </header>

      <section className="topic-results">
        <div className="section-heading"><h2>Your stack profile</h2><p>Each topic uses four items, so these estimates carry limited evidence.</p></div>
        {Object.entries(result.families).map(([family, value]) => (
          <div className="topic-result" key={family}><span>{familyNames[family as keyof typeof familyNames]}</span><div className="score-line"><i style={{ width: `${value.grade}%` }} /></div><strong>{value.grade}</strong><em>{value.band}</em></div>
        ))}
      </section>

      <section className="review-section">
        <div className="section-heading"><h2>Evidence review</h2><p>Answer keys become available only after completion. Open the visual lesson for anything you missed.</p></div>
        <div className="review-list">
          {result.reviews.map((review, index) => {
            const lesson = studyQuestionById.get(review.studyQuestionId)
            return <div className="review-row" key={review.itemId}>{review.correct ? <CheckCircle className="correct-icon" /> : <XCircle className="wrong-icon" />}<span className="review-number">{String(index + 1).padStart(2, '0')}</span><div><strong>{lesson?.title ?? 'Interview concept'}</strong><p>{review.explanation}</p></div>{lesson && <Link to={`/lesson/${lesson.slug}`}>Study <ArrowRight /></Link>}</div>
          })}
        </div>
      </section>
      <div className="result-actions"><Link className="button primary" to="/assess">Take another assessment</Link><Link className="button secondary" to="/leaderboard">View scores</Link></div>
    </div>
  )
}
