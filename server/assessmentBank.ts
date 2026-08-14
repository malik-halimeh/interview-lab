/**
 * Server-only assessment material.
 *
 * Nothing in src/ imports this module. That boundary keeps answer keys,
 * explanations, and the unseen item pool out of browser production assets.
 */
import { studyQuestions } from '../src/content/questions.ts'
import type { AssessmentItemInternal } from '../src/content/types.ts'

const hash = (value: string) => Array.from(value).reduce((acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) | 0, 0)

const rotate = <T,>(items: T[], amount: number) => {
  const offset = Math.abs(amount) % items.length
  return [...items.slice(offset), ...items.slice(0, offset)]
}

export const assessmentItems: AssessmentItemInternal[] = studyQuestions.map((question, index) => {
  const sameTopic = studyQuestions.filter((candidate) => candidate.topic === question.topic && candidate.id !== question.id)
  const distractors = rotate(sameTopic, hash(question.id)).slice(0, 3)
  const baseVariant = index % 5
  const type = question.topic === 'git' && index % 3 === 0
    ? 'git-sequencing'
    : question.topic === 'backend' && /sql|database|schema|join|table|row|transaction|index/i.test(question.title)
      ? 'sql-reasoning'
      : ['backend', 'nextjs', 'fullstack'].includes(question.topic) && index % 5 === 0
        ? 'http-flow'
        : (['single-choice', 'multiple-select', 'ordering', 'code-output', 'debugging-patch'] as const)[baseVariant]

  if (type === 'ordering' || type === 'http-flow' || type === 'git-sequencing') {
    return {
      id: question.assessmentId,
      studyQuestionId: question.id,
      family: question.family,
      difficulty: question.difficulty,
      difficultyB: question.difficulty - 3,
      type,
      prompt: type === 'git-sequencing'
        ? `Put the Git states for ${question.title.toLowerCase()} into a valid history sequence.`
        : type === 'http-flow'
          ? `Order the request flow that best demonstrates ${question.title.toLowerCase()}.`
          : `Put the ${question.title.toLowerCase()} explanation in the order used by the visual model.`,
      options: rotate(question.scene.nodes.map((label, optionIndex) => ({ id: `step-${optionIndex + 1}`, label })), hash(question.slug)),
      correctOptionIds: question.scene.nodes.map((_, optionIndex) => `step-${optionIndex + 1}`),
      explanation: question.modelAnswer
    }
  }

  if (type === 'multiple-select') {
    return {
      id: question.assessmentId,
      studyQuestionId: question.id,
      family: question.family,
      difficulty: question.difficulty,
      difficultyB: question.difficulty - 3,
      type: 'multiple-select',
      prompt: `Select both statements that correctly explain ${question.title.toLowerCase()}.`,
      options: rotate([
        { id: 'correct-rule', label: question.keyPoints[0] },
        { id: 'correct-practice', label: question.keyPoints[2] },
        { id: 'distractor-1', label: distractors[0].keyPoints[0] },
        { id: 'distractor-2', label: distractors[1].keyPoints[0] }
      ], hash(question.title)),
      correctOptionIds: ['correct-rule', 'correct-practice'],
      explanation: question.modelAnswer
    }
  }

  return {
    id: question.assessmentId,
    studyQuestionId: question.id,
    family: question.family,
    difficulty: question.difficulty,
    difficultyB: question.difficulty - 3,
    type,
    prompt: type === 'code-output'
      ? `Which observable result is consistent with ${question.title.toLowerCase()}?`
      : type === 'debugging-patch'
        ? `Which patch or rule correctly resolves a bug involving ${question.title.toLowerCase()}?`
        : type === 'sql-reasoning'
          ? `Which database conclusion is correct for ${question.title.toLowerCase()}?`
          : `Which statement best explains ${question.title.toLowerCase()}?`,
    options: rotate([
      { id: 'correct', label: question.keyPoints[0] },
      ...distractors.map((item, distractorIndex) => ({ id: `distractor-${distractorIndex + 1}`, label: item.keyPoints[0] }))
    ], hash(question.id)),
    correctOptionIds: ['correct'],
    explanation: question.modelAnswer
  }
})

export const assessmentItemById = new Map(assessmentItems.map((item) => [item.id, item]))
