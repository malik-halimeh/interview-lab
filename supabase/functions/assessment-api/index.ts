import { createClient } from 'npm:@supabase/supabase-js@2'
import { assessmentItemById, assessmentItems } from '../../../server/assessmentBank.ts'
import type { AssessmentItemInternal, TopicFamily } from '../../../src/content/types.ts'
import { estimateAbility, familyEstimates, itemInformation, scoreObjectiveAnswer, type ScoredResponse } from '../../../src/lib/rasch.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS'
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
})

const url = Deno.env.get('SUPABASE_URL')!
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const db = createClient(url, serviceKey, { auth: { persistSession: false } })

const randomUnit = () => {
  const value = new Uint32Array(1)
  crypto.getRandomValues(value)
  return value[0] / 0x100000000
}

const shuffle = <T,>(values: T[]) => {
  const result = [...values]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(randomUnit() * (index + 1))
    ;[result[index], result[target]] = [result[target], result[index]]
  }
  return result
}

const digestSequence = async (ids: string[]) => {
  const bytes = new TextEncoder().encode(ids.join('|'))
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

const publicItem = (item: AssessmentItemInternal, optionOrder: string[]) => ({
  id: item.id,
  studyQuestionId: item.studyQuestionId,
  family: item.family,
  difficulty: item.difficulty,
  type: item.type,
  prompt: item.prompt,
  options: optionOrder.map((id) => item.options.find((option) => option.id === id)).filter(Boolean)
})

async function requireUser(request: Request) {
  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) throw new Response(JSON.stringify({ error: 'Authentication required.' }), { status: 401, headers: corsHeaders })
  const { data, error } = await db.auth.getUser(token)
  if (error || !data.user) throw new Response(JSON.stringify({ error: 'Your session is invalid or expired.' }), { status: 401, headers: corsHeaders })
  return data.user
}

async function verifyTurnstile(token: string | undefined, request: Request) {
  const secret = Deno.env.get('TURNSTILE_SECRET_KEY')
  if (!secret) return
  if (!token) throw new Response(JSON.stringify({ error: 'Human verification is required.' }), { status: 400, headers: corsHeaders })
  const form = new FormData()
  form.set('secret', secret)
  form.set('response', token)
  form.set('remoteip', request.headers.get('CF-Connecting-IP') ?? '')
  const result = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form }).then((response) => response.json())
  if (!result.success) throw new Response(JSON.stringify({ error: 'Human verification failed.' }), { status: 403, headers: corsHeaders })
}

const getResponses = async (sessionId: string): Promise<ScoredResponse[]> => {
  const { data, error } = await db.from('assessment_responses').select('item_id, family, difficulty_b, correct').eq('session_id', sessionId).order('received_at')
  if (error) throw error
  return (data ?? []).map((row) => ({ itemId: row.item_id, family: row.family as TopicFamily, difficultyB: Number(row.difficulty_b), correct: row.correct }))
}

const getPriorSequences = async (userId: string, currentId?: string) => {
  let query = db.from('assessment_sessions').select('sequence_ids').eq('user_id', userId).eq('status', 'completed').order('completed_at', { ascending: false }).limit(2)
  if (currentId) query = query.neq('id', currentId)
  const { data } = await query
  return (data ?? []).map((row) => row.sequence_ids as string[])
}

function pickFamily(responses: ScoredResponse[], familyOrder: TopicFamily[]) {
  const counts = new Map(familyOrder.map((family) => [family, responses.filter((response) => response.family === family).length]))
  const eligible = familyOrder.filter((family) => (counts.get(family) ?? 0) < 4)
  const minimum = Math.min(...eligible.map((family) => counts.get(family) ?? 0))
  return eligible.find((family) => (counts.get(family) ?? 0) === minimum)!
}

function selectItem(responses: ScoredResponse[], family: TopicFamily, recentSeen: Set<string>, sequence: string[], priorSequences: string[]) {
  const used = new Set(responses.map((response) => response.itemId))
  const familyResponses = responses.filter((response) => response.family === family)
  let eligible = assessmentItems.filter((item) => item.family === family && !used.has(item.id))
  const withoutRecent = eligible.filter((item) => !recentSeen.has(item.id))
  if (withoutRecent.length >= 5) eligible = withoutRecent

  const matchingNext = new Set(priorSequences.filter((prior) => sequence.every((id, index) => prior[index] === id)).map((prior) => prior[sequence.length]).filter(Boolean))
  const sequenceSafe = eligible.filter((item) => !matchingNext.has(item.id))
  if (sequenceSafe.length >= 5) eligible = sequenceSafe

  if (familyResponses.length === 0) {
    const levelTwo = eligible.filter((item) => item.difficulty === 2)
    if (levelTwo.length) return levelTwo[Math.floor(randomUnit() * levelTwo.length)]
  }
  const theta = estimateAbility(familyResponses).theta
  const topFive = eligible.sort((a, b) => itemInformation(theta, b.difficultyB) - itemInformation(theta, a.difficultyB)).slice(0, 5)
  return topFive[Math.floor(randomUnit() * topFive.length)]
}

async function sessionView(session: any) {
  const item = session.current_item_id ? assessmentItemById.get(session.current_item_id) : undefined
  return {
    id: session.id,
    mode: session.mode,
    status: session.status,
    item: item ? publicItem(item, session.current_option_order as string[]) : null,
    deadline: session.current_deadline,
    answeredCount: Array.isArray(session.sequence_ids) ? Math.max(0, session.sequence_ids.length - (item ? 1 : 0)) : 0,
    focusEvents: session.focus_events,
    leaderboardEligible: session.leaderboard_eligible
  }
}

async function finishSession(session: any, responses: ScoredResponse[]) {
  const estimate = estimateAbility(responses)
  const sequence = session.sequence_ids as string[]
  const sequenceHash = await digestSequence(sequence)
  const completedAt = new Date().toISOString()
  const { data: updated, error } = await db.from('assessment_sessions').update({
    status: 'completed', completed_at: completedAt, current_item_id: null, current_option_order: null,
    current_deadline: null, theta: estimate.theta, standard_error: estimate.standardError,
    scaled_grade: estimate.grade, readiness_band: estimate.band, sequence_hash: sequenceHash
  }).eq('id', session.id).eq('status', 'active').select().single()
  if (error) throw error
  if (updated.leaderboard_eligible) {
    await db.from('leaderboard_entries').upsert({
      session_id: updated.id, user_id: updated.user_id, mode: updated.mode,
      grade: estimate.grade, band: estimate.band, eligible: true
    }, { onConflict: 'session_id' })
  }
  return updated
}

async function start(request: Request, user: any) {
  if ((Deno.env.get('ASSESSMENTS_ENABLED') ?? 'true') !== 'true') return json({ error: 'Assessment starts are temporarily disabled to protect the free-service quota. Study mode remains available.' }, 503)
  const body = await request.json()
  if (body.mode !== 'flexible' && body.mode !== 'strict') return json({ error: 'Invalid assessment mode.' }, 400)
  const { data: profile } = await db.from('profiles').select('consented_at').eq('id', user.id).single()
  if (!profile?.consented_at) return json({ error: 'Accept the assessment publishing notice before starting.' }, 409)

  const { data: active } = await db.from('assessment_sessions').select('*').eq('user_id', user.id).eq('status', 'active').maybeSingle()
  if (active) {
    if (active.mode !== body.mode) return json({ error: `Finish your active ${active.mode} assessment before starting another mode.` }, 409)
    await db.from('integrity_events').insert({ session_id: active.id, user_id: user.id, event_type: 'reload' })
    return json(await sessionView(active))
  }

  // Turnstile tokens are single-use. Verify only when creating a new session;
  // an authenticated resume is authorized by the active session's ownership.
  await verifyTurnstile(body.turnstileToken, request)

  const familyOrder = shuffle<TopicFamily>(['javascript', 'frontend', 'backend', 'fullstack', 'git'])
  const priorSequences = await getPriorSequences(user.id)
  const recentSeen = new Set(priorSequences.flat())
  const item = selectItem([], familyOrder[0], recentSeen, [], priorSequences)
  const optionOrder = shuffle(item.options.map((option) => option.id))
  const deadline = new Date(Date.now() + (body.mode === 'strict' ? 45_000 : 90_000)).toISOString()
  const { data: session, error } = await db.from('assessment_sessions').insert({
    user_id: user.id, mode: body.mode, family_order: familyOrder, current_item_id: item.id,
    current_option_order: optionOrder, current_deadline: deadline, sequence_ids: [item.id]
  }).select().single()
  if (error) throw error
  return json(await sessionView(session), 201)
}

async function answer(request: Request, user: any, sessionId: string) {
  const body = await request.json()
  if (!body.responseId || !body.itemId || !Array.isArray(body.answerIds)) return json({ error: 'Invalid answer payload.' }, 400)
  const { data: existing } = await db.from('assessment_responses').select('id').eq('id', body.responseId).maybeSingle()
  const { data: session, error } = await db.from('assessment_sessions').select('*').eq('id', sessionId).eq('user_id', user.id).single()
  if (error || !session) return json({ error: 'Assessment not found.' }, 404)
  if (existing) return json(await sessionView(session))
  if (session.status !== 'active' || session.current_item_id !== body.itemId) return json({ error: 'That item is no longer active.' }, 409)
  const item = assessmentItemById.get(body.itemId)
  if (!item) return json({ error: 'Assessment item not found.' }, 500)

  const deadline = Date.parse(session.current_deadline)
  const received = Date.now()
  const clientSubmittedAt = Date.parse(body.clientSubmittedAt)
  const withinDeadline = received <= deadline
  const eligibleForDeliveryGrace = received <= deadline + 5_000 && Number.isFinite(clientSubmittedAt) && clientSubmittedAt <= deadline
  const acceptedAnswers = withinDeadline || eligibleForDeliveryGrace ? body.answerIds : []
  const correct = scoreObjectiveAnswer(item, acceptedAnswers)
  const { error: insertError } = await db.from('assessment_responses').insert({
    id: body.responseId, session_id: session.id, user_id: user.id, item_id: item.id,
    family: item.family, difficulty_b: item.difficultyB, answer_ids: acceptedAnswers,
    correct, deadline_at: session.current_deadline
  })
  if (insertError?.code === '23505') {
    const { data: latest } = await db.from('assessment_sessions').select('*').eq('id', session.id).single()
    return json(await sessionView(latest))
  }
  if (insertError) throw insertError

  const responses = await getResponses(session.id)
  const estimate = estimateAbility(responses)
  if (responses.length >= 20) return json(await sessionView(await finishSession(session, responses)))

  const familyOrder = session.family_order as TopicFamily[]
  const family = pickFamily(responses, familyOrder)
  const priorSequences = await getPriorSequences(user.id, session.id)
  const recentSeen = new Set(priorSequences.flat())
  const currentSequence = session.sequence_ids as string[]
  const next = selectItem(responses, family, recentSeen, currentSequence, priorSequences)
  const optionOrder = shuffle(next.options.map((option) => option.id))
  const nextDeadline = new Date(Date.now() + (session.mode === 'strict' ? 45_000 : 90_000)).toISOString()
  const { data: updated, error: updateError } = await db.from('assessment_sessions').update({
    current_item_id: next.id, current_option_order: optionOrder, current_deadline: nextDeadline,
    sequence_ids: [...currentSequence, next.id], theta: estimate.theta, standard_error: estimate.standardError
  }).eq('id', session.id).eq('current_item_id', item.id).select().single()
  if (updateError) throw updateError
  return json(await sessionView(updated))
}

async function integrity(request: Request, user: any, sessionId: string) {
  const body = await request.json()
  if (body.eventType !== 'focus-hidden' && body.eventType !== 'reload') return json({ error: 'Invalid integrity event.' }, 400)
  const { data: session } = await db.from('assessment_sessions').select('*').eq('id', sessionId).eq('user_id', user.id).single()
  if (!session || session.status !== 'active') return json({ error: 'Active assessment not found.' }, 404)
  await db.from('integrity_events').insert({ session_id: session.id, user_id: user.id, event_type: body.eventType })
  if (session.mode !== 'strict' || body.eventType !== 'focus-hidden') return json(await sessionView(session))
  const focusEvents = session.focus_events + 1
  const { data: updated, error } = await db.from('assessment_sessions').update({
    focus_events: focusEvents,
    leaderboard_eligible: false
  }).eq('id', session.id).eq('status', 'active').select().single()
  if (error) throw error
  return json(await sessionView(await finishSession(updated, await getResponses(session.id))))
}

async function result(user: any, sessionId: string) {
  const { data: session } = await db.from('assessment_sessions').select('*').eq('id', sessionId).eq('user_id', user.id).single()
  if (!session || session.status !== 'completed') return json({ error: 'Completed assessment not found.' }, 404)
  const responses = await getResponses(session.id)
  const estimate = estimateAbility(responses)
  const reviews = responses.map((response) => {
    const item = assessmentItemById.get(response.itemId)!
    return { itemId: item.id, studyQuestionId: item.studyQuestionId, correct: response.correct, explanation: item.explanation, difficulty: item.difficulty }
  })
  return json({
    id: session.id, mode: session.mode, estimate, families: familyEstimates(responses),
    correctCount: responses.filter((response) => response.correct).length, answeredCount: responses.length,
    leaderboardEligible: session.leaderboard_eligible,
    highestDifficulty: Math.max(1, ...responses.filter((response) => response.correct).map((response) => response.difficultyB + 3)),
    reviews
  })
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  try {
    const path = new URL(request.url).pathname.replace(/^.*\/assessment-api/, '')
    if (request.method === 'GET' && path === '/leaderboard') {
      const mode = new URL(request.url).searchParams.get('mode')
      if (mode !== 'flexible' && mode !== 'strict') return json({ error: 'Invalid mode.' }, 400)
      const { data, error } = await db.rpc('public_leaderboard', { p_mode: mode })
      if (error) throw error
      return json((data ?? []).map((row: any) => ({ rank: Number(row.rank), displayName: row.display_name, grade: row.grade, band: row.band, own: row.own })))
    }

    const user = await requireUser(request)
    if (request.method === 'POST' && path === '/profile/assessment-consent') {
      const { error } = await db.from('profiles').update({ consented_at: new Date().toISOString() }).eq('id', user.id)
      if (error) throw error
      return json({ accepted: true })
    }
    if (request.method === 'POST' && path === '/profile/name-publication') {
      const body = await request.json()
      const realName = typeof body.realName === 'string' ? body.realName.trim().slice(0, 80) : null
      if (body.publish === true && !realName) return json({ error: 'Enter a public name before publishing it.' }, 400)
      const { error } = await db.from('profiles').update({ real_name: realName, publish_real_name: body.publish === true }).eq('id', user.id)
      if (error) throw error
      return json({ updated: true })
    }
    if (request.method === 'POST' && path === '/leaderboard/visibility') {
      const body = await request.json()
      if (typeof body.visible !== 'boolean') return json({ error: 'Invalid visibility preference.' }, 400)
      const { error } = await db.from('profiles').update({ leaderboard_visible: body.visible }).eq('id', user.id)
      if (error) throw error
      return json({ updated: true })
    }
    const adminDeleteMatch = path.match(/^\/admin\/leaderboard\/([0-9a-f-]+)$/)
    if (request.method === 'DELETE' && adminDeleteMatch) {
      if (user.app_metadata?.role !== 'leaderboard_admin') return json({ error: 'Not authorized.' }, 403)
      const body = await request.json().catch(() => ({}))
      const { data: entry, error: updateError } = await db.from('leaderboard_entries').update({ removed_at: new Date().toISOString() }).eq('id', adminDeleteMatch[1]).is('removed_at', null).select('id').maybeSingle()
      if (updateError) throw updateError
      if (!entry) return json({ error: 'Leaderboard entry not found.' }, 404)
      const { error: auditError } = await db.from('admin_actions').insert({ actor_id: user.id, action: 'leaderboard_entry_removed', target_entry_id: entry.id, reason: typeof body.reason === 'string' ? body.reason.slice(0, 300) : null })
      if (auditError) throw auditError
      return json({ removed: true })
    }
    if (request.method === 'POST' && path === '/assessment/start') return await start(request, user)
    const answerMatch = path.match(/^\/assessment\/([0-9a-f-]+)\/answer$/)
    if (request.method === 'POST' && answerMatch) return await answer(request, user, answerMatch[1])
    const integrityMatch = path.match(/^\/assessment\/([0-9a-f-]+)\/integrity-event$/)
    if (request.method === 'POST' && integrityMatch) return await integrity(request, user, integrityMatch[1])
    const resultMatch = path.match(/^\/assessment\/([0-9a-f-]+)\/result$/)
    if (request.method === 'GET' && resultMatch) return await result(user, resultMatch[1])
    return json({ error: 'Route not found.' }, 404)
  } catch (error) {
    if (error instanceof Response) return error
    console.error(error)
    return json({ error: 'The assessment service encountered an unexpected error.' }, 500)
  }
})
