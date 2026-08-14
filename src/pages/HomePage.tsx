import { ArrowRight, BookOpenText, CalendarDots, Gauge, GoogleLogo, LockKey, Sparkle, Stack } from '@phosphor-icons/react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { ScenePlayer } from '../components/ScenePlayer'
import { studyQuestions, topicLabels } from '../content/questions'
import type { Topic } from '../content/types'
import { useAuth } from '../lib/auth'
import { db, type StudyProgress } from '../lib/db'
import { todayKey } from '../lib/scheduler'

const homeTopics: Topic[] = ['javascript', 'react', 'nextjs', 'backend', 'fullstack', 'git']

export function HomePage() {
  const auth = useAuth()
  const isSignedIn = Boolean(auth.user)
  const progress = useLiveQuery(
    () => isSignedIn ? db.progress.toArray() : Promise.resolve<StudyProgress[]>([]),
    [auth.user?.id]
  ) ?? []
  const completed = progress.filter((item) => item.completed).length
  const dueIds = new Set(progress.filter((item) => item.dueDate <= todayKey()).map((item) => item.questionId))
  const next = studyQuestions.find((question) => dueIds.has(question.id))
    ?? studyQuestions.find((question) => !progress.some((item) => item.questionId === question.id))
    ?? studyQuestions[0]

  return (
    <div className="page home-page">
      <section className="home-hero">
        <div className="hero-copy">
          <span className="eyebrow">DigitalHub / 1st Interview Mock Up</span>
          <h1>Build the answer.<br /><em>Read the system.</em></h1>
          <p>A visual preparation studio for explaining full-stack concepts clearly, then testing your judgment under real interview pressure.</p>
          <div className="hero-actions">
            {isSignedIn ? <>
              <Link className="button primary" to={`/lesson/${next.slug}`}>Continue your plan <ArrowRight /></Link>
              <Link className="button secondary" to="/assess">Take an assessment</Link>
            </> : <>
              <Link className="button primary" to="/library">Explore 200 lessons <ArrowRight /></Link>
              {auth.configured && <button className="button secondary" onClick={() => void auth.signIn('/')}><GoogleLogo weight="bold" /> Sign in with Google</button>}
            </>}
          </div>
          <div className="hero-trust"><LockKey weight="duotone" /><span>{isSignedIn ? `Private progress for ${auth.profile.nickname}` : 'No candidate progress is shown while signed out'}</span></div>
        </div>
        <div className="hero-lab">
          <div className="lab-status"><span className="signal-dot" /> Live concept lab <b>JS / 016</b></div>
          <ScenePlayer question={studyQuestions[15]} compact />
        </div>
      </section>

      <section className="dashboard-label">
        <span>{isSignedIn ? 'Your private study data' : 'Inside the preparation lab'}</span>
        <p>{isSignedIn ? 'These counters belong only to your authenticated account.' : 'Platform totals only. Sign in to load your own progress and review schedule.'}</p>
      </section>
      <section className="home-metrics" aria-label={isSignedIn ? 'Your study progress' : 'Platform overview'}>
        {isSignedIn ? <>
          <div><CalendarDots size={23} /><span><strong>{dueIds.size}</strong> due today</span></div>
          <div><Sparkle size={23} /><span><strong>{completed}</strong> reviewed</span></div>
          <div><Gauge size={23} /><span><strong>{studyQuestions.length - completed}</strong> concepts ahead</span></div>
        </> : <>
          <div><BookOpenText size={23} /><span><strong>{studyQuestions.length}</strong> animated lessons</span></div>
          <div><Stack size={23} /><span><strong>{homeTopics.length}</strong> specialist tracks</span></div>
          <div><Gauge size={23} /><span><strong>2</strong> adaptive exam modes</span></div>
        </>}
      </section>

      <section className="topic-runway">
        <div className="section-heading"><span className="section-index">01 / FIELD MANUAL</span><h2>Six systems. One interview voice.</h2><p>Move through the curriculum in sequence or enter at the exact concept you need to strengthen.</p></div>
        <div className="topic-strips">
          {homeTopics.map((topic, index) => {
            const total = studyQuestions.filter((question) => question.topic === topic).length
            const done = progress.filter((item) => studyQuestions.find((question) => question.id === item.questionId)?.topic === topic && item.completed).length
            return (
              <Link to={`/library?topic=${topic}`} className="topic-strip" key={topic}>
                <span className="topic-number">0{index + 1}</span>
                <span className="topic-name">{topicLabels[topic]}</span>
                <span className="topic-progress">{isSignedIn ? `${done} / ${total}` : `${total} lessons`}</span>
                <ArrowRight />
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}
