import { ArrowLeft, ArrowSquareOut, Check } from '@phosphor-icons/react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ScenePlayer } from '../components/ScenePlayer'
import { studyQuestionBySlug, topicLabels } from '../content/questions'
import { db, syncStudyData } from '../lib/db'
import { newReviewState, scheduleReview, type ReviewRating } from '../lib/scheduler'
import { useAuth } from '../lib/auth'

export function LessonPage() {
  const auth = useAuth()
  const { slug } = useParams()
  const question = slug ? studyQuestionBySlug.get(slug) : undefined
  const existing = useLiveQuery(() => question ? db.progress.get(question.id) : undefined, [question?.id])
  const [answer, setAnswer] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [saved, setSaved] = useState(false)
  if (!question) return <Navigate to="/library" replace />

  const rate = async (rating: ReviewRating) => {
    const base = existing ?? { questionId: question.id, ...newReviewState(), completed: false, confidence: null, updatedAt: new Date().toISOString() }
    const next = scheduleReview(base, rating)
    const now = new Date().toISOString()
    await db.transaction('rw', db.progress, db.attempts, async () => {
      await db.progress.put({ ...next, questionId: question.id, completed: true, confidence: rating, updatedAt: now })
      await db.attempts.add({ id: crypto.randomUUID(), questionId: question.id, answer, rating, createdAt: now })
    })
    if (auth.user) void syncStudyData(auth.user.id).catch(() => undefined)
    setSaved(true)
  }

  return (
    <div className="page lesson-page">
      <Link to="/library" className="back-link"><ArrowLeft /> Back to library</Link>
      <div className="lesson-title">
        <div><span className="eyebrow">{topicLabels[question.topic]} · Level {question.difficulty}</span><h1>{question.title}</h1><p>{question.prompt}</p></div>
        <span className="lesson-code">{question.id.toUpperCase()}</span>
      </div>
      <section className="attempt-panel">
        <label htmlFor="candidate-answer">Your explanation</label>
        <textarea id="candidate-answer" value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Answer as if the interviewer were listening. Define it, explain the mechanism, then give one practical example." rows={6} />
        <div className="attempt-footer"><span>{answer.trim().split(/\s+/).filter(Boolean).length} words</span><button className="button primary" onClick={() => setRevealed(true)}>{answer.trim() ? 'Reveal explanation' : 'Skip attempt'}</button></div>
      </section>
      {revealed && (
        <div className="lesson-reveal">
          <ScenePlayer question={question} />
          <section className="answer-grid">
            <article><span className="answer-label">Model response</span><p>{question.modelAnswer}</p><a href={question.reference.url} target="_blank" rel="noreferrer">{question.reference.label} <ArrowSquareOut /></a></article>
            <article><span className="answer-label">What the interviewer listens for</span><ul>{question.keyPoints.map((point) => <li key={point}><Check />{point}</li>)}</ul></article>
          </section>
          <section className="pitfall"><strong>Watch for this</strong><p>{question.commonMistake}</p><span>Follow-up: {question.followUp}</span></section>
          <section className="rating-panel">
            <div><h2>{saved ? 'Review scheduled' : 'How did that feel?'}</h2><p>{saved ? 'Your answer and next review date are saved on this device.' : 'Your rating sets the next review date.'}</p></div>
            {!saved && <div className="rating-buttons">{(['again', 'hard', 'good', 'easy'] as ReviewRating[]).map((rating) => <button key={rating} onClick={() => void rate(rating)}>{rating}</button>)}</div>}
          </section>
        </div>
      )}
    </div>
  )
}
