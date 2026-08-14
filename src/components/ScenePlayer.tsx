import { ArrowLeft, ArrowRight, Pause, Play, Repeat } from '@phosphor-icons/react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import type { StudyQuestion } from '../content/types'

export function ScenePlayer({ question, compact = false }: { question: StudyQuestion; compact?: boolean }) {
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const reduceMotion = useReducedMotion()
  const stageRef = useRef<HTMLDivElement>(null)
  const current = question.scene.steps[step]

  useEffect(() => {
    if (!playing) return
    const timer = window.setInterval(() => {
      setStep((value) => {
        if (value >= question.scene.steps.length - 1) {
          setPlaying(false)
          return value
        }
        return value + 1
      })
    }, 2400)
    return () => window.clearInterval(timer)
  }, [playing, question.scene.steps.length])

  useEffect(() => {
    const node = stageRef.current
    if (!node) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') setStep((value) => Math.min(question.scene.steps.length - 1, value + 1))
      if (event.key === 'ArrowLeft') setStep((value) => Math.max(0, value - 1))
      if (event.key === ' ') {
        event.preventDefault()
        setPlaying((value) => !value)
      }
    }
    node.addEventListener('keydown', onKey)
    return () => node.removeEventListener('keydown', onKey)
  }, [question.scene.steps.length])

  const reset = () => { setStep(0); setPlaying(false) }

  return (
    <div className={`scene-player scene-${question.scene.kind}${compact ? ' compact' : ''}`} ref={stageRef} tabIndex={0} aria-label={`Animated explanation: ${question.title}`}>
      <div className="scene-topline">
        <span className="scene-kind">{question.scene.kind.replace('-', ' ')}</span>
        <span className="scene-count">{String(step + 1).padStart(2, '0')} / {String(question.scene.steps.length).padStart(2, '0')}</span>
      </div>
      <div className="concept-stage" role="img" aria-label={current.caption}>
        {question.scene.nodes.map((node, index) => {
          const active = current.active.includes(node)
          return (
            <div className="stage-segment" key={node}>
              <motion.div
                className={`concept-node${active ? ' active' : ''}`}
                animate={reduceMotion ? undefined : { y: active ? -5 : 0, scale: active ? 1.025 : 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              >
                <span className="node-index">{index + 1}</span>
                <span>{node}</span>
                <motion.span className="node-signal" animate={{ scaleX: active ? 1 : 0 }} />
              </motion.div>
              {index < question.scene.nodes.length - 1 && <motion.div className="stage-connector" animate={{ opacity: current.active.includes(question.scene.nodes[index + 1]) ? 1 : 0.2 }}><ArrowRight size={22} /></motion.div>}
            </div>
          )
        })}
      </div>
      <div className="scene-caption" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={step} initial={reduceMotion ? false : { opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? undefined : { opacity: 0, y: -7 }}>
            <strong>{current.title}</strong>
            <p>{current.caption}</p>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="scene-controls">
        <button aria-label="Previous step" onClick={() => setStep((value) => Math.max(0, value - 1))} disabled={step === 0}><ArrowLeft /></button>
        <button className="play-control" onClick={() => setPlaying((value) => !value)}>{playing ? <Pause weight="fill" /> : <Play weight="fill" />}<span>{playing ? 'Pause' : 'Play'}</span></button>
        <button aria-label="Next step" onClick={() => setStep((value) => Math.min(question.scene.steps.length - 1, value + 1))} disabled={step === question.scene.steps.length - 1}><ArrowRight /></button>
        <button aria-label="Replay" onClick={reset}><Repeat /></button>
      </div>
    </div>
  )
}
