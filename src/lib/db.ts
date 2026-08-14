import Dexie, { type EntityTable } from 'dexie'
import type { ReviewRating, ReviewState } from './scheduler'
import { supabase } from './supabase'

export interface StudyProgress extends ReviewState {
  questionId: string
  completed: boolean
  confidence: ReviewRating | null
  updatedAt: string
}

export interface StudyAttempt {
  id: string
  questionId: string
  answer: string
  rating: ReviewRating
  createdAt: string
}

class InterviewLabDatabase extends Dexie {
  progress!: EntityTable<StudyProgress, 'questionId'>
  attempts!: EntityTable<StudyAttempt, 'id'>

  constructor() {
    super('interview-lab')
    this.version(1).stores({
      progress: 'questionId, dueDate, completed, updatedAt',
      attempts: 'id, questionId, createdAt'
    })
  }
}

export const db = new InterviewLabDatabase()

export const clearLocalCandidateData = () => db.transaction('rw', db.progress, db.attempts, async () => {
  await db.progress.clear()
  await db.attempts.clear()
})

const progressStatus = (progress: StudyProgress) => !progress.completed ? 'unseen' : progress.repetitions >= 3 ? 'mastered' : progress.repetitions > 0 ? 'review' : 'learning'

/** Merge the offline-first study cache with the authenticated candidate's rows. */
export async function syncStudyData(userId: string) {
  if (!supabase || !navigator.onLine) return
  const [localProgress, localAttempts] = await Promise.all([db.progress.toArray(), db.attempts.toArray()])

  if (localProgress.length) {
    const { error } = await supabase.from('study_progress').upsert(localProgress.map((entry) => ({
      user_id: userId,
      question_id: entry.questionId,
      status: progressStatus(entry),
      ease_factor: entry.ease,
      interval_days: entry.intervalDays,
      repetitions: entry.repetitions,
      next_review_at: `${entry.dueDate}T00:00:00.000Z`,
      updated_at: entry.updatedAt
    })), { onConflict: 'user_id,question_id' })
    if (error) throw error
  }

  if (localAttempts.length) {
    const { error } = await supabase.from('study_attempts').upsert(localAttempts.map((entry) => ({
      id: entry.id,
      user_id: userId,
      question_id: entry.questionId,
      rating: entry.rating,
      private_answer: entry.answer,
      created_at: entry.createdAt
    })), { onConflict: 'id', ignoreDuplicates: true })
    if (error) throw error
  }

  const { data: remote, error } = await supabase.from('study_progress').select('question_id, status, ease_factor, interval_days, repetitions, next_review_at, updated_at').eq('user_id', userId)
  if (error) throw error
  await db.transaction('rw', db.progress, async () => {
    for (const entry of remote ?? []) {
      const local = await db.progress.get(entry.question_id)
      if (local && Date.parse(local.updatedAt) >= Date.parse(entry.updated_at)) continue
      await db.progress.put({
        questionId: entry.question_id,
        completed: entry.status !== 'unseen',
        confidence: null,
        repetitions: entry.repetitions,
        intervalDays: entry.interval_days,
        ease: Number(entry.ease_factor),
        lapses: local?.lapses ?? 0,
        dueDate: entry.next_review_at?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
        updatedAt: entry.updated_at
      })
    }
  })
}
