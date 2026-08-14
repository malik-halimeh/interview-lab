import type { AssessmentItemInternal, TopicFamily } from '../content/types.ts'

export interface ScoredResponse {
  itemId: string
  family: TopicFamily
  difficultyB: number
  correct: boolean
}

export interface AbilityEstimate {
  theta: number
  standardError: number
  grade: number
  band: 'Foundations Needed' | 'Developing' | 'Junior Ready' | 'Strong Junior' | 'Advanced Junior'
}

const GRID_MIN = -4
const GRID_MAX = 4
const GRID_STEP = 0.05
const thetaGrid = Array.from({ length: Math.round((GRID_MAX - GRID_MIN) / GRID_STEP) + 1 }, (_, index) => GRID_MIN + index * GRID_STEP)

export const raschProbability = (theta: number, difficultyB: number) => 1 / (1 + Math.exp(-(theta - difficultyB)))

const normalLogDensity = (theta: number) => -0.5 * theta * theta

export const readinessBand = (grade: number): AbilityEstimate['band'] => {
  if (grade < 40) return 'Foundations Needed'
  if (grade < 50) return 'Developing'
  if (grade < 60) return 'Junior Ready'
  if (grade < 70) return 'Strong Junior'
  return 'Advanced Junior'
}

export const estimateAbility = (responses: Pick<ScoredResponse, 'difficultyB' | 'correct'>[]): AbilityEstimate => {
  const logWeights = thetaGrid.map((theta) => {
    const likelihood = responses.reduce((sum, response) => {
      const probability = Math.min(1 - 1e-12, Math.max(1e-12, raschProbability(theta, response.difficultyB)))
      return sum + Math.log(response.correct ? probability : 1 - probability)
    }, 0)
    return normalLogDensity(theta) + likelihood
  })
  const maxLogWeight = Math.max(...logWeights)
  const weights = logWeights.map((value) => Math.exp(value - maxLogWeight))
  const total = weights.reduce((sum, value) => sum + value, 0)
  const theta = weights.reduce((sum, value, index) => sum + value * thetaGrid[index], 0) / total
  const variance = weights.reduce((sum, value, index) => sum + value * (thetaGrid[index] - theta) ** 2, 0) / total
  const grade = Math.max(0, Math.min(100, Math.round(50 + 10 * theta)))
  return { theta, standardError: Math.sqrt(variance), grade, band: readinessBand(grade) }
}

export const itemInformation = (theta: number, difficultyB: number) => {
  const probability = raschProbability(theta, difficultyB)
  return probability * (1 - probability)
}

const randomIndex = (size: number, random: () => number) => Math.min(size - 1, Math.floor(random() * size))

export const selectInformativeItem = (
  items: AssessmentItemInternal[],
  responses: ScoredResponse[],
  family: TopicFamily,
  random: () => number = Math.random
) => {
  const used = new Set(responses.map((response) => response.itemId))
  const familyResponses = responses.filter((response) => response.family === family)
  const theta = estimateAbility(familyResponses).theta
  const eligible = items.filter((item) => item.family === family && !used.has(item.id))
  if (!eligible.length) return undefined

  if (familyResponses.length === 0) {
    const levelTwo = eligible.filter((item) => item.difficulty === 2)
    if (levelTwo.length) return levelTwo[randomIndex(levelTwo.length, random)]
  }

  const topFive = [...eligible]
    .sort((a, b) => itemInformation(theta, b.difficultyB) - itemInformation(theta, a.difficultyB))
    .slice(0, 5)
  return topFive[randomIndex(topFive.length, random)]
}

export const scoreObjectiveAnswer = (item: AssessmentItemInternal, answerIds: string[]) => {
  if (item.type === 'ordering' || item.type === 'http-flow' || item.type === 'git-sequencing') {
    return item.correctOptionIds.length === answerIds.length && item.correctOptionIds.every((id, index) => answerIds[index] === id)
  }
  const expected = [...item.correctOptionIds].sort()
  const received = [...answerIds].sort()
  return expected.length === received.length && expected.every((id, index) => received[index] === id)
}

export const familyEstimates = (responses: ScoredResponse[]) => {
  const families: TopicFamily[] = ['javascript', 'frontend', 'backend', 'fullstack', 'git']
  return Object.fromEntries(families.map((family) => [family, estimateAbility(responses.filter((response) => response.family === family))])) as Record<TopicFamily, AbilityEstimate>
}
