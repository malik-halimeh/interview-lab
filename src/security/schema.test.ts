import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migration = readFileSync('supabase/migrations/0001_interview_lab.sql', 'utf8')
const assessmentFunction = readFileSync('supabase/functions/assessment-api/index.ts', 'utf8')

describe('database authorization boundary', () => {
  it('enables RLS on every candidate or public data table', () => {
    for (const table of ['profiles', 'study_progress', 'study_attempts', 'assessment_sessions', 'assessment_responses', 'integrity_events', 'leaderboard_entries', 'admin_actions']) {
      expect(migration).toContain(`alter table public.${table} enable row level security`)
    }
  })

  it('does not grant browser access to assessment responses, ranking rows, or audit data', () => {
    expect(migration).not.toMatch(/grant\s+(select|insert|update|delete).*assessment_responses.*authenticated/i)
    expect(migration).not.toMatch(/create policy[^;]+on public\.leaderboard_entries/is)
    expect(migration).not.toMatch(/create policy[^;]+on public\.admin_actions/is)
  })

  it('projects only sanitized public leaderboard fields', () => {
    const signature = migration.match(/returns table\(([^)]+)\)/i)?.[1] ?? ''
    expect(signature).toContain('display_name text')
    expect(signature).toContain('grade integer')
    expect(signature).toContain('band text')
    expect(signature).not.toContain('user_id')
    expect(signature).not.toContain('email')
  })
})

describe('assessment resume boundary', () => {
  it('resumes an owned active session before requiring a new one-time Turnstile token', () => {
    const startFunction = assessmentFunction.slice(
      assessmentFunction.indexOf('async function start'),
      assessmentFunction.indexOf('async function answer'),
    )
    const activeSessionBranch = startFunction.indexOf('if (active)')
    const turnstileVerification = startFunction.indexOf('await verifyTurnstile(body.turnstileToken, request)')

    expect(activeSessionBranch).toBeGreaterThan(-1)
    expect(turnstileVerification).toBeGreaterThan(activeSessionBranch)
  })

  it('ends a Strict assessment on the first focus loss', () => {
    const integrityFunction = assessmentFunction.slice(
      assessmentFunction.indexOf('async function integrity'),
      assessmentFunction.indexOf('async function result'),
    )

    expect(integrityFunction).toContain('leaderboard_eligible: false')
    expect(integrityFunction).toContain('finishSession(updated')
    expect(integrityFunction).not.toContain('focusEvents < 2')
  })
})
