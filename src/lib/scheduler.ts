export type ReviewRating = 'again' | 'hard' | 'good' | 'easy'

export interface ReviewState {
  repetitions: number
  intervalDays: number
  ease: number
  lapses: number
  dueDate: string
}

const localDate = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const todayKey = () => localDate(new Date())

const addDays = (date: Date, days: number) => {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + days)
  return localDate(copy)
}

export const newReviewState = (): ReviewState => ({ repetitions: 0, intervalDays: 0, ease: 2.5, lapses: 0, dueDate: todayKey() })

export const scheduleReview = (current: ReviewState, rating: ReviewRating, now = new Date()): ReviewState => {
  let repetitions = current.repetitions
  let intervalDays = current.intervalDays
  let ease = current.ease
  let lapses = current.lapses

  if (rating === 'again') {
    repetitions = 0
    intervalDays = 1
    ease -= 0.2
    lapses += 1
  } else if (rating === 'hard') {
    repetitions += 1
    intervalDays = Math.max(1, Math.round(Math.max(1, intervalDays) * 1.2))
    ease -= 0.15
  } else if (rating === 'good') {
    intervalDays = repetitions === 0 ? 1 : repetitions === 1 ? 3 : Math.round(intervalDays * ease)
    repetitions += 1
  } else {
    intervalDays = repetitions === 0 ? 4 : Math.round(Math.max(1, intervalDays) * ease * 1.3)
    repetitions += 1
    ease += 0.15
  }

  ease = Math.max(1.3, Math.min(3, ease))
  intervalDays = Math.max(1, Math.min(365, intervalDays))
  return { repetitions, intervalDays, ease, lapses, dueDate: addDays(now, intervalDays) }
}
