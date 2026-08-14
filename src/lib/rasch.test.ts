import { describe, expect, it } from 'vitest'
import { estimateAbility, itemInformation, raschProbability, readinessBand } from './rasch'
import golden from './catr-golden.json'

describe('Rasch CAT calculations', () => {
  it('matches the Rasch logistic probability', () => {
    expect(raschProbability(0, 0)).toBeCloseTo(0.5, 10)
    expect(raschProbability(1, 0)).toBeCloseTo(0.7310585786, 10)
    expect(itemInformation(0, 0)).toBeCloseTo(0.25, 10)
  })

  it('keeps the standard-normal prior centered before evidence', () => {
    const estimate = estimateAbility([])
    expect(estimate.theta).toBeCloseTo(0, 8)
    expect(estimate.standardError).toBeCloseTo(0.9995, 3)
    expect(estimate.grade).toBe(50)
  })

  it('moves ability in the direction of evidence', () => {
    const correct = estimateAbility([{ difficultyB: 0, correct: true }])
    const incorrect = estimateAbility([{ difficultyB: 0, correct: false }])
    expect(correct.theta).toBeGreaterThan(0)
    expect(incorrect.theta).toBeLessThan(0)
    expect(correct.theta).toBeCloseTo(-incorrect.theta, 6)
  })

  it('applies the published grade bands', () => {
    expect(readinessBand(39)).toBe('Foundations Needed')
    expect(readinessBand(40)).toBe('Developing')
    expect(readinessBand(50)).toBe('Junior Ready')
    expect(readinessBand(60)).toBe('Strong Junior')
    expect(readinessBand(70)).toBe('Advanced Junior')
  })

  it.each(golden.vectors)('matches the catR golden vector: $name', (vector) => {
    const result = estimateAbility(vector.difficulties.map((difficultyB, index) => ({ difficultyB, correct: vector.answers[index] })))
    expect(result.theta).toBeCloseTo(vector.theta, 10)
    expect(result.standardError).toBeCloseTo(vector.standardError, 10)
    expect(result.grade).toBe(vector.grade)
  })
})
