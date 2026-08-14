import { ArrowLeft, ArrowRight, ArrowSquareOut, Check, List } from '@phosphor-icons/react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ScenePlayer } from '../components/ScenePlayer'
import { getStudySequence, studyQuestionBySlug, topicLabels } from '../content/questions'
import { useAuth } from '../lib/auth'
import { db, syncStudyData } from '../lib/db'
import { newReviewState, scheduleReview, type ReviewRating } from '../lib/scheduler'

export function LessonPage() {
  const auth = useAuth()
  const { slug } = useParams()
  const question = slug ? studyQuestionBySlug.get(slug) : undefined
  const existing = useLiveQuery(() => question ? db.progress.get(question.id) : undefined, [question?.id])
  const [answer, setAnswer] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [saved, setSaved] = useState(false)
  const sequence = slug ? getStudySequence(slug) : null
  const questionIndex = sequence?.index ?? -1
  const previousQuestion = sequence?.previous ?? null
  const nextQuestion = sequence?.next ?? null

  useEffect(() => {
    if (!question) return
    setAnswer('')
    setRevealed(false)
    setSaved(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [question?.id])

  if (!question || !sequence) return <Navigate to="/library" replace />

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
      <nav className="lesson-toolbar" aria-label="Lesson sequence">
        <Link to="/library" className="back-link"><List /> All 200 questions</Link>
        <span className="lesson-position">{String(sequence.position).padStart(3, '0')} / {sequence.total}</span>
        <div className="lesson-step-links">
          {previousQuestion ? <Link to={`/lesson/${previousQuestion.slug}`} aria-label={`Previous lesson: ${previousQuestion.title}`}><ArrowLeft /></Link> : <span aria-hidden="true" />}
          {nextQuestion ? <Link to={`/lesson/${nextQuestion.slug}`} aria-label={`Next lesson: ${nextQuestion.title}`}><ArrowRight /></Link> : <Link to="/library" aria-label="Return to library"><List /></Link>}
        </div>
      </nav>
      <div className="lesson-progress-track" aria-hidden="true"><span style={{ width: `${(sequence.position / sequence.total) * 100}%` }} /></div>
      <div className="lesson-title">
        <div><span className="eyebrow">{topicLabels[question.topic]} / Level {question.difficulty}</span><h1>{question.title}</h1><p>{question.prompt}</p></div>
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
      <nav className="lesson-sequence" aria-label="Continue studying">
        <div className="sequence-copy"><span>Continue the field manual</span><strong>{nextQuestion ? nextQuestion.title : 'You reached question 200'}</strong><p>{nextQuestion ? `${topicLabels[nextQuestion.topic]} / Level ${nextQuestion.difficulty}` : 'Return to the library and revisit any concept.'}</p></div>
        {nextQuestion ? <Link className="button primary next-lesson-button" to={`/lesson/${nextQuestion.slug}`}>Next question <span>{String(questionIndex + 2).padStart(3, '0')}</span><ArrowRight /></Link> : <Link className="button primary next-lesson-button" to="/library">Finish library <List /></Link>}
      </nav>
    </div>
  )
}
