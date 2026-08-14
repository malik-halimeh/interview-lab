import { describe, expect, it } from 'vitest'
import { newReviewState, scheduleReview } from './scheduler'

describe('review scheduler', () => {
  const date = new Date(2026, 7, 14)

  it('resets and schedules tomorrow after Again', () => {
    const state = scheduleReview({ ...newReviewState(), repetitions: 4, intervalDays: 10 }, 'again', date)
    expect(state.repetitions).toBe(0)
    expect(state.lapses).toBe(1)
    expect(state.dueDate).toBe('2026-08-15')
  })

  it('uses the first Good intervals', () => {
    const first = scheduleReview(newReviewState(), 'good', date)
    const second = scheduleReview(first, 'good', date)
    expect(first.intervalDays).toBe(1)
    expect(second.intervalDays).toBe(3)
  })
})
