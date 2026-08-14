import { Eye, EyeSlash, GoogleLogo, SignOut, Trash } from '@phosphor-icons/react'
import { useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { useAuth } from '../lib/auth'
import { updateLeaderboardVisibility, updateNamePublication } from '../lib/assessmentApi'

export function ProfilePage() {
  const auth = useAuth()
  const [realName, setRealName] = useState(auth.profile.realName ?? '')
  const [message, setMessage] = useState('')

  const setVisibility = async (visible: boolean) => {
    if (!auth.configured || !auth.user) { setMessage('Available after Supabase is configured.'); return }
    try { await updateLeaderboardVisibility(visible); await auth.refreshProfile(); setMessage('Leaderboard visibility updated.') }
    catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Update failed.') }
  }

  const setNamePublication = async (publish: boolean) => {
    if (!auth.configured || !auth.user) { setMessage('Available after Supabase is configured.'); return }
    try { await updateNamePublication(realName.trim() || null, publish); await auth.refreshProfile(); setMessage('Public name preference updated.') }
    catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Update failed.') }
  }

  return (
    <div className="page profile-page">
      <PageHeader eyebrow="Candidate privacy" title="Your public identity" description="Your account and your leaderboard label are separate by design." />
      <section className="identity-panel">
        <div className="identity-avatar">{auth.profile.nickname.slice(0, 2).toUpperCase()}</div>
        <div><span>Generated nickname</span><h2>{auth.profile.nickname}</h2><p>Everyone can see this label on eligible scores. Only you can see that it belongs to your account.</p></div>
      </section>
      <section className="profile-settings">
        <div className="setting-row"><div><h3>Leaderboard visibility</h3><p>Hide or republish your pseudonymous score at any time.</p></div><button className="button secondary" onClick={() => void setVisibility(!auth.profile.leaderboardVisible)}>{auth.profile.leaderboardVisible ? <><EyeSlash /> Hide score</> : <><Eye /> Publish score</>}</button></div>
        <div className="setting-row real-name-setting"><div><h3>Optional real name</h3><p>Your Google name is never published automatically. Enter and confirm a name here only if you want it on the board.</p></div><div className="name-controls"><input value={realName} onChange={(event) => setRealName(event.target.value)} placeholder="Your public name" /><button className="button secondary" onClick={() => void setNamePublication(true)}>Publish real name</button>{auth.profile.publishRealName && <button className="text-button" onClick={() => void setNamePublication(false)}>Return to nickname</button>}</div></div>
        <div className="setting-row"><div><h3>Account session</h3><p>{auth.configured ? 'Authenticated through Google. Local study data is cleared when you sign out.' : 'Supabase is not configured. You are using the local preview identity.'}</p></div>{auth.configured ? auth.user ? <button className="button secondary" onClick={() => void auth.signOut()}><SignOut /> Sign out</button> : <button className="button primary" onClick={() => void auth.signIn()}><GoogleLogo /> Continue with Google</button> : <span className="demo-label">Local preview</span>}</div>
        <div className="setting-row danger"><div><h3>Remove shared score</h3><p>Hide your entry immediately. An administrator can also remove a shared entry after a support request.</p></div><button className="button danger-button" onClick={() => void setVisibility(false)}><Trash /> Remove score</button></div>
      </section>
      {message && <div className="toast" role="status">{message}</div>}
    </div>
  )
}
