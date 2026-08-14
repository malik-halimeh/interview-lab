import type { AbilityEstimate } from './rasch'
import type { PublicAssessmentItem, TopicFamily } from '../content/types'
import { supabase } from './supabase'

export type AssessmentMode = 'flexible' | 'strict'

export interface AssessmentSessionView {
  id: string
  mode: AssessmentMode
  status: 'active' | 'completed'
  item: PublicAssessmentItem | null
  deadline: string | null
  answeredCount: number
  focusEvents: number
  leaderboardEligible: boolean
}

export interface AssessmentReview {
  itemId: string
  studyQuestionId: string
  correct: boolean
  explanation: string
  difficulty: number
}

export interface AssessmentResultView {
  id: string
  mode: AssessmentMode
  estimate: AbilityEstimate
  families: Record<TopicFamily, AbilityEstimate>
  correctCount: number
  answeredCount: number
  leaderboardEligible: boolean
  highestDifficulty: number
  reviews: AssessmentReview[]
}

export interface LeaderboardRow {
  rank: number
  displayName: string
  grade: number
  band: AbilityEstimate['band']
  own: boolean
}

const endpoint = import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/assessment-api`
  : null

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!supabase || !endpoint) throw new Error('The secure assessment backend is not configured.')
  const { data } = await supabase.auth.getSession()
  if (!data.session) throw new Error('Sign in to continue.')
  const response = await fetch(`${endpoint}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.session.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      ...init?.headers
    }
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error ?? 'The assessment service could not complete the request.')
  return body as T
}

export const startAssessment = (mode: AssessmentMode, turnstileToken?: string) => request<AssessmentSessionView>('/assessment/start', {
  method: 'POST',
  body: JSON.stringify({ mode, turnstileToken })
})

export const submitAssessmentAnswer = (sessionId: string, itemId: string, answerIds: string[]) => request<AssessmentSessionView>(`/assessment/${sessionId}/answer`, {
  method: 'POST',
  body: JSON.stringify({ responseId: crypto.randomUUID(), itemId, answerIds, clientSubmittedAt: new Date().toISOString() })
})

export const sendIntegrityEvent = (sessionId: string, eventType: 'focus-hidden' | 'reload') => request<AssessmentSessionView>(`/assessment/${sessionId}/integrity-event`, {
  method: 'POST',
  body: JSON.stringify({ eventType })
})

export const getAssessmentResult = (sessionId: string) => request<AssessmentResultView>(`/assessment/${sessionId}/result`)

export const acceptAssessmentConsent = () => request<{ accepted: true }>('/profile/assessment-consent', { method: 'POST', body: '{}' })

export const updateNamePublication = (realName: string | null, publish: boolean) => request<{ updated: true }>('/profile/name-publication', {
  method: 'POST', body: JSON.stringify({ realName, publish })
})

export const updateLeaderboardVisibility = (visible: boolean) => request<{ updated: true }>('/leaderboard/visibility', {
  method: 'POST', body: JSON.stringify({ visible })
})

export const getLeaderboard = async (mode: AssessmentMode) => {
  if (!endpoint) return []
  const response = await fetch(`${endpoint}/leaderboard?mode=${mode}`, {
    headers: { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY }
  })
  if (!response.ok) throw new Error('The leaderboard is unavailable.')
  return await response.json() as LeaderboardRow[]
}
