import { ArrowRight, MagnifyingGlass, Play } from '@phosphor-icons/react'
import { useDeferredValue, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { studyQuestions, topicLabels } from '../content/questions'
import type { Topic } from '../content/types'

const topics: (Topic | 'all')[] = ['all', 'javascript', 'react', 'nextjs', 'backend', 'fullstack', 'git']

export function LibraryPage() {
  const [params, setParams] = useSearchParams()
  const initialTopic = (params.get('topic') as Topic | null) ?? 'all'
  const [topic, setTopic] = useState<Topic | 'all'>(topics.includes(initialTopic) ? initialTopic : 'all')
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const filtered = useMemo(() => studyQuestions.filter((question) => {
    const topicMatch = topic === 'all' || question.topic === topic
    const text = `${question.title} ${question.prompt} ${question.modelAnswer}`.toLowerCase()
    return topicMatch && text.includes(deferredQuery.toLowerCase())
  }), [deferredQuery, topic])

  const chooseTopic = (value: Topic | 'all') => {
    setTopic(value)
    setParams(value === 'all' ? {} : { topic: value })
  }

  return (
    <div className="page library-page">
      <PageHeader
        eyebrow="DigitalHub field manual / 200 visual explanations"
        title="The interview library"
        description="Study in sequence from question 001, or search for the exact system you need to explain with confidence."
        actions={<Link className="button primary" to={`/lesson/${studyQuestions[0].slug}`}>Start at 001 <Play weight="fill" /></Link>}
      />
      <div className="library-toolbar">
        <label className="search-field"><MagnifyingGlass /><span className="sr-only">Search questions</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search closures, indexes, hydration..." /></label>
        <div className="filter-row" role="group" aria-label="Filter by topic">
          {topics.map((value) => <button key={value} className={topic === value ? 'selected' : ''} onClick={() => chooseTopic(value)}>{value === 'all' ? 'All topics' : topicLabels[value]}</button>)}
        </div>
      </div>
      <div className="library-result-line"><p className="result-count">{filtered.length} questions</p><span>Open-ended practice / interactive explanation / private notes</span></div>
      <div className="question-list">
        {filtered.map((question) => {
          const sequence = studyQuestions.findIndex((item) => item.id === question.id) + 1
          return (
            <Link className="question-row" to={`/lesson/${question.slug}`} key={question.id}>
              <span className="question-id">{String(sequence).padStart(3, '0')}</span>
              <span className="question-main"><span className="question-topic">{topicLabels[question.topic]}</span><strong>{question.title}</strong><span>{question.prompt}</span></span>
              <span className="difficulty">LEVEL {question.difficulty}</span>
              <ArrowRight />
            </Link>
          )
        })}
      </div>
    </div>
  )
}
