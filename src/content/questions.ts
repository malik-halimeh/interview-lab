import { conceptGroups, topicMeta } from './concepts.ts'
import type { SceneKind, StudyQuestion, Topic } from './types.ts'

const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

const sceneFor = (topic: Topic, title: string): SceneKind => {
  const value = title.toLowerCase()
  if (/event loop|task|promise|async|call stack/.test(value)) return 'event-loop'
  if (/security|auth|cookie|cors|csrf|xss|injection|tls|access/.test(value)) return 'security'
  if (/database|sql|join|index|transaction|acid|constraint|pool/.test(value)) return 'database'
  if (topic === 'git') return 'git-graph'
  if (topic === 'react') return 'component-tree'
  if (topic === 'nextjs' || topic === 'fullstack' || /http|api|express|request|route/.test(value)) return 'request-flow'
  if (/versus|equality|primitive|copy|coercion/.test(value)) return 'comparison'
  return topicMeta[topic].scene
}

const sceneNodes: Record<SceneKind, string[]> = {
  execution: ['Input', 'Runtime rule', 'Observed result'],
  'event-loop': ['Call stack', 'Microtask queue', 'Task queue'],
  'component-tree': ['Parent', 'Component boundary', 'Committed UI'],
  'request-flow': ['Browser', 'Server boundary', 'Data source'],
  database: ['Application', 'Query planner', 'Stored rows'],
  security: ['Untrusted input', 'Policy check', 'Protected resource'],
  'git-graph': ['Working tree', 'Staging index', 'Commit history'],
  comparison: ['First behavior', 'Decision rule', 'Second behavior']
}

const makeSteps = (title: string, focus: string, nodes: string[]) => [
  {
    title: 'Set the stage',
    caption: `Start with ${nodes[0].toLowerCase()}. The interview question is asking what changes and what stays stable.`,
    active: [nodes[0]]
  },
  {
    title: 'Apply the rule',
    caption: focus,
    active: [nodes[0], nodes[1]]
  },
  {
    title: 'Explain the result',
    caption: `Connect ${title.toLowerCase()} to ${nodes[2].toLowerCase()}, then state the practical tradeoff.`,
    active: nodes
  }
]

export const studyQuestions: StudyQuestion[] = Object.entries(conceptGroups).flatMap(([topicKey, concepts]) => {
  const topic = topicKey as Topic
  const meta = topicMeta[topic]
  return concepts.map((concept, index) => {
    const ordinal = index + 1
    const id = `${topic}-${String(ordinal).padStart(2, '0')}`
    const kind = sceneFor(topic, concept.title)
    const nodes = sceneNodes[kind]
    return {
      id,
      slug: `${id}-${slugify(concept.title)}`,
      topic,
      family: meta.family,
      title: concept.title,
      difficulty: ((index % 5) + 1) as 1 | 2 | 3 | 4 | 5,
      prompt: `Explain ${concept.title.toLowerCase()}. What happens, why does it happen, and when does it matter in a real application?`,
      modelAnswer: `${concept.focus} In an interview, connect that rule to a concrete example and name the tradeoff instead of only defining the term.`,
      keyPoints: [
        concept.focus,
        `Describe the observable behavior of ${concept.title.toLowerCase()}.`,
        `Trace ${concept.title.toLowerCase()} from ${nodes[0].toLowerCase()} through ${nodes[1].toLowerCase()}, then verify its effect on ${nodes[2].toLowerCase()}.`
      ],
      commonMistake: `A common mistake is memorizing a one-line definition of ${concept.title.toLowerCase()} without explaining the runtime behavior or tradeoff.`,
      followUp: `How would you demonstrate ${concept.title.toLowerCase()} with the smallest useful code or architecture example?`,
      reference: { label: `${meta.label} documentation`, url: meta.reference },
      scene: { kind, nodes, steps: makeSteps(concept.title, concept.focus, nodes) },
      assessmentId: `assessment-${id}`
    }
  })
})

export const studyQuestionBySlug = new Map(studyQuestions.map((question) => [question.slug, question]))
export const studyQuestionById = new Map(studyQuestions.map((question) => [question.id, question]))

export const topicLabels: Record<Topic, string> = {
  javascript: 'JavaScript',
  react: 'React',
  nextjs: 'Next.js',
  backend: 'APIs and databases',
  fullstack: 'Full-stack concepts',
  git: 'Git and GitHub'
}
