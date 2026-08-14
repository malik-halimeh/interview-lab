export type Topic = 'javascript' | 'react' | 'nextjs' | 'backend' | 'fullstack' | 'git'
export type TopicFamily = 'javascript' | 'frontend' | 'backend' | 'fullstack' | 'git'
export type SceneKind =
  | 'execution'
  | 'event-loop'
  | 'component-tree'
  | 'request-flow'
  | 'database'
  | 'security'
  | 'git-graph'
  | 'comparison'

export interface SceneStep {
  title: string
  caption: string
  active: string[]
}

export interface StudyQuestion {
  id: string
  slug: string
  topic: Topic
  family: TopicFamily
  title: string
  difficulty: 1 | 2 | 3 | 4 | 5
  prompt: string
  modelAnswer: string
  keyPoints: string[]
  commonMistake: string
  followUp: string
  reference: { label: string; url: string }
  scene: { kind: SceneKind; nodes: string[]; steps: SceneStep[] }
  assessmentId: string
}

export interface PublicAssessmentItem {
  id: string
  studyQuestionId: string
  family: TopicFamily
  difficulty: number
  type: AssessmentFormat
  prompt: string
  options: { id: string; label: string }[]
}

export type AssessmentFormat =
  | 'single-choice'
  | 'multiple-select'
  | 'ordering'
  | 'code-output'
  | 'debugging-patch'
  | 'http-flow'
  | 'sql-reasoning'
  | 'git-sequencing'

export interface AssessmentItemInternal extends PublicAssessmentItem {
  correctOptionIds: string[]
  explanation: string
  difficultyB: number
}
