import { describe, expect, it } from 'vitest'
import type { PublicAssessmentItem } from '../content/types'
import { initialExamSelection, selectionForItem } from './examSelection'

const item = (id: string, type: PublicAssessmentItem['type'], optionIds: string[]): PublicAssessmentItem => ({
  id,
  studyQuestionId: 'study-test',
  type,
  family: 'git',
  difficulty: 2,
  prompt: 'Test prompt',
  options: optionIds.map((optionId) => ({ id: optionId, label: optionId })),
})

describe('exam selection state', () => {
  it('initializes every step when an ordering item replaces a single-choice item', () => {
    const nextItem = item('git-order', 'git-sequencing', ['step-a', 'step-b', 'step-c'])
    const staleSelection = { itemId: 'previous-item', ids: ['correct'] }

    expect(selectionForItem(nextItem, staleSelection)).toEqual(['step-a', 'step-b', 'step-c'])
  })

  it('filters answer IDs that do not belong to the current item', () => {
    const currentItem = item('choice', 'single-choice', ['a', 'b'])

    expect(selectionForItem(currentItem, { itemId: 'choice', ids: ['a', 'old-answer'] })).toEqual(['a'])
  })

  it('creates a complete initial ordering selection', () => {
    const orderingItem = item('http-order', 'http-flow', ['request', 'server', 'response'])

    expect(initialExamSelection(orderingItem)).toEqual({
      itemId: 'http-order',
      ids: ['request', 'server', 'response'],
    })
  })
})
