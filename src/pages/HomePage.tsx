import { ArrowRight, CalendarDots, Gauge, Sparkle } from '@phosphor-icons/react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { ScenePlayer } from '../components/ScenePlayer'
import { studyQuestions, topicLabels } from '../content/questions'
import { db } from '../lib/db'
import { todayKey } from '../lib/scheduler'

export function HomePage() {
  const progress = useLiveQuery(() => db.progress.toArray(), []) ?? []
  const completed = progress.filter((item) => item.completed).length
  const dueIds = new Set(progress.filter((item) => item.dueDate <= todayKey()).map((item) => item.questionId))
  const next = studyQuestions.find((question) => dueIds.has(question.id)) ?? studyQuestions.find((question) => !progress.some((item) => item.questionId === question.id)) ?? studyQuestions[0]

  return (
    <div className="page home-page">
      <section className="home-hero">
        <div className="hero-copy">
          <span className="eyebrow">Your interview workspace</span>
          <h1>See the answer<br /><em>move.</em></h1>
          <p>Practice the explanation, inspect the system behind it, then prove what you know under pressure.</p>
          <div className="hero-actions">
            <Link className="button primary" to={`/lesson/${next.slug}`}>Continue learning <ArrowRight /></Link>
            <Link className="button secondary" to="/assess">Take an assessment</Link>
          </div>
        </div>
        <ScenePlayer question={studyQuestions[15]} compact />
      </section>

      <section className="home-metrics" aria-label="Study progress">
        <div><CalendarDots size={23} /><span><strong>{dueIds.size || 1}</strong> due today</span></div>
        <div><Sparkle size={23} /><span><strong>{completed}</strong> mastered</span></div>
        <div><Gauge size={23} /><span><strong>{200 - completed}</strong> concepts ahead</span></div>
      </section>

      <section className="topic-runway">
        <div className="section-heading"><h2>Five interview systems</h2><p>Every assessment balances the full stack instead of hiding weak topics inside one average.</p></div>
        <div className="topic-strips">
          {(['javascript', 'react', 'backend', 'fullstack', 'git'] as const).map((topic, index) => {
            const total = studyQuestions.filter((question) => question.topic === topic || (topic === 'react' && question.topic === 'nextjs')).length
            const done = progress.filter((item) => studyQuestions.find((question) => question.id === item.questionId)?.topic === topic && item.completed).length
            return (
              <Link to={`/library?topic=${topic}`} className="topic-strip" key={topic}>
                <span className="topic-number">0{index + 1}</span>
                <span className="topic-name">{topicLabels[topic]}</span>
                <span className="topic-progress">{done} / {total}</span>
                <ArrowRight />
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}
