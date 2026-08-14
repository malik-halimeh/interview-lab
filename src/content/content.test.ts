import { describe, expect, it } from 'vitest'
import { assessmentItems } from '../../server/assessmentBank'
import { studyQuestions } from './questions'

describe('question bank', () => {
  it('contains the exact requested distribution', () => {
    expect(studyQuestions).toHaveLength(200)
    expect(studyQuestions.filter((q) => q.topic === 'javascript')).toHaveLength(55)
    expect(studyQuestions.filter((q) => q.topic === 'react')).toHaveLength(35)
    expect(studyQuestions.filter((q) => q.topic === 'nextjs')).toHaveLength(15)
    expect(studyQuestions.filter((q) => q.topic === 'backend')).toHaveLength(40)
    expect(studyQuestions.filter((q) => q.topic === 'fullstack')).toHaveLength(35)
    expect(studyQuestions.filter((q) => q.topic === 'git')).toHaveLength(20)
  })

  it('has unique and complete lesson records', () => {
    expect(new Set(studyQuestions.map((q) => q.id)).size).toBe(200)
    expect(new Set(studyQuestions.map((q) => q.slug)).size).toBe(200)
    for (const question of studyQuestions) {
      expect(question.scene.steps.length).toBeGreaterThanOrEqual(3)
      expect(question.keyPoints.length).toBeGreaterThanOrEqual(3)
      expect(question.modelAnswer.length).toBeGreaterThan(80)
      expect(question.reference.url).toMatch(/^https:/)
    }
  })

  it('links one deterministic assessment item to every lesson', () => {
    expect(assessmentItems).toHaveLength(200)
    expect(new Set(assessmentItems.map((item) => item.studyQuestionId)).size).toBe(200)
    expect(new Set(assessmentItems.map((item) => item.type))).toEqual(new Set(['single-choice', 'multiple-select', 'ordering', 'code-output', 'debugging-patch', 'http-flow', 'sql-reasoning', 'git-sequencing']))
  })

  it('uses distinct, topic-specific practical statements in scored options', () => {
    const practicalOptions = assessmentItems.flatMap((item) => item.options.filter((option) => option.id === 'correct-practice'))
    expect(practicalOptions.length).toBeGreaterThan(0)
    expect(new Set(practicalOptions.map((option) => option.label)).size).toBe(practicalOptions.length)
    expect(assessmentItems.flatMap((item) => item.options).map((option) => option.label)).not.toContain(
      'Give one practical situation where the distinction affects implementation.',
    )
  })
})
