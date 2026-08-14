import { ArrowRight, Check, DotsSixVertical, WarningCircle } from '@phosphor-icons/react'
import { Reorder, motion, useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { sendIntegrityEvent, startAssessment, submitAssessmentAnswer, type AssessmentMode, type AssessmentSessionView } from '../lib/assessmentApi'
import { useAuth } from '../lib/auth'

const familyNames = { javascript: 'JavaScript', frontend: 'React and Next.js', backend: 'APIs and databases', fullstack: 'Full-stack', git: 'Git and GitHub' }
const isOrdering = (type: string) => type === 'ordering' || type === 'http-flow' || type === 'git-sequencing'

export function ExamPage() {
  const { mode } = useParams()
  const auth = useAuth()
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()
  const validMode: AssessmentMode | null = mode === 'strict' || mode === 'flexible' ? mode : null
  const [session, setSession] = useState<AssessmentSessionView | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [now, setNow] = useState(Date.now())
  const [warning, setWarning] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const submittedItem = useRef<string | null>(null)

  useEffect(() => {
    if (!validMode || !auth.user) return
    let active = true
    const turnstileToken = sessionStorage.getItem('interview-lab-turnstile') ?? undefined
    startAssessment(validMode, turnstileToken).then((value) => {
      sessionStorage.removeItem('interview-lab-turnstile')
      if (active) setSession(value)
    }).catch((reason: Error) => active && setError(reason.message))
    return () => { active = false }
  }, [auth.user, validMode])

  useEffect(() => {
    const ids = session?.item && isOrdering(session.item.type) ? session.item.options.map((option) => option.id) : []
    setSelected(ids)
    submittedItem.current = null
  }, [session?.item?.id])

  const submit = useCallback(async () => {
    if (!session?.item || submitting || submittedItem.current === session.item.id) return
    submittedItem.current = session.item.id
    setSubmitting(true)
    try {
      const updated = await submitAssessmentAnswer(session.id, session.item.id, selected)
      setSession(updated)
      setNow(Date.now())
      if (updated.status === 'completed') navigate(`/results/${updated.id}`)
    } catch (reason) {
      submittedItem.current = null
      setError(reason instanceof Error ? reason.message : 'Your answer could not be submitted.')
    } finally {
      setSubmitting(false)
    }
  }, [navigate, selected, session, submitting])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(timer)
  }, [])

  const remaining = Math.max(0, Math.ceil(((session?.deadline ? Date.parse(session.deadline) : now) - now) / 1000))
  useEffect(() => {
    if (remaining === 0 && session?.status === 'active') void submit()
  }, [remaining, session?.status, submit])

  useEffect(() => {
    if (!session || session.mode !== 'strict') return
    const onVisibility = () => {
      if (document.visibilityState !== 'hidden') return
      void sendIntegrityEvent(session.id, 'focus-hidden').then((updated) => {
        setSession(updated)
        setWarning(true)
        if (updated.status === 'completed') navigate(`/results/${updated.id}`)
      }).catch(() => undefined)
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [navigate, session?.id, session?.mode])

  const item = session?.item
  const selectedSet = useMemo(() => new Set(selected), [selected])
  if (!validMode) return <Navigate to="/assess" replace />
  if (!auth.configured || !auth.user) return <Navigate to="/assess" replace />
  if (error) return <div className="page centered-state"><WarningCircle size={36} /><h1>Assessment paused</h1><p>{error}</p><button className="button primary" onClick={() => window.location.reload()}>Try again</button></div>
  if (!session || !item) return <div className="page centered-state"><span className="loading-mark" /><p>Securing your first item...</p></div>

  const toggle = (id: string) => {
    if (item.type === 'single-choice') setSelected([id])
    else setSelected((values) => values.includes(id) ? values.filter((value) => value !== id) : [...values, id])
  }

  return (
    <div className={`exam-screen ${session.mode}`}>
      <header className="exam-header">
        <div><span className="exam-brand">Interview Lab</span><span className="exam-mode">{session.mode}</span></div>
        <div className="exam-progress"><span>Question {session.answeredCount + 1} of 20</span><div><span style={{ width: `${(session.answeredCount / 20) * 100}%` }} /></div></div>
        <div className={`timer${remaining <= 10 ? ' urgent' : ''}`}><span>{remaining}</span><small>seconds</small></div>
      </header>
      {warning && (
        <div className="integrity-warning" role="alert"><WarningCircle size={20} /><span>{session.leaderboardEligible ? 'Focus change recorded. One more will remove this attempt from the Strict ranking.' : 'This attempt is now private and will not appear on the Strict ranking.'}</span><button onClick={() => setWarning(false)}>Dismiss</button></div>
      )}
      <main className="exam-main">
        <div className="exam-meta"><span>{familyNames[item.family]}</span><span>Difficulty {item.difficulty} / 5</span><span>{item.type.replace('-', ' ')}</span></div>
        <motion.h1 key={item.id} initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>{item.prompt}</motion.h1>

        {isOrdering(item.type) ? (
          <div className="ordering-wrap">
            <p>Drag the rows or use the move controls to create the correct order.</p>
            <Reorder.Group axis="y" values={selected} onReorder={setSelected} className="ordering-list">
              {selected.map((id, index, list) => {
                const option = item.options.find((candidate) => candidate.id === id)!
                return <Reorder.Item value={id} key={id} className="order-option"><DotsSixVertical /><span className="order-number">{index + 1}</span><span>{option.label}</span><div className="order-buttons"><button aria-label="Move up" disabled={index === 0} onClick={() => { const copy = [...list]; [copy[index - 1], copy[index]] = [copy[index], copy[index - 1]]; setSelected(copy) }}>↑</button><button aria-label="Move down" disabled={index === list.length - 1} onClick={() => { const copy = [...list]; [copy[index + 1], copy[index]] = [copy[index], copy[index + 1]]; setSelected(copy) }}>↓</button></div></Reorder.Item>
              })}
            </Reorder.Group>
          </div>
        ) : (
          <div className="exam-options">
            {item.options.map((option, index) => (
              <button className={selectedSet.has(option.id) ? 'selected' : ''} onClick={() => toggle(option.id)} key={option.id}>
                <span className="option-key">{String.fromCharCode(65 + index)}</span><span>{option.label}</span>{selectedSet.has(option.id) && <Check weight="bold" />}
              </button>
            ))}
          </div>
        )}

        <div className="exam-submit"><span>{item.type === 'multiple-select' ? 'Select every correct statement.' : isOrdering(item.type) ? 'The current row order will be submitted.' : 'Choose one answer.'}</span><button className="button primary" onClick={() => void submit()} disabled={submitting || (!isOrdering(item.type) && selected.length === 0)}>{submitting ? 'Locking...' : 'Lock answer'} <ArrowRight /></button></div>
      </main>
    </div>
  )
}
