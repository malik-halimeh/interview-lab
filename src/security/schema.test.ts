import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migration = readFileSync('supabase/migrations/0001_interview_lab.sql', 'utf8')

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
