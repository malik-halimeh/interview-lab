import { ArrowRight, Clock, EyeSlash, Lightning, ShieldCheck } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { useAuth } from '../lib/auth'
import { acceptAssessmentConsent } from '../lib/assessmentApi'
import { useCallback, useState } from 'react'
import { TurnstileWidget } from '../components/TurnstileWidget'

export function AssessPage() {
  const auth = useAuth()
  const [accepting, setAccepting] = useState(false)
  const [consentError, setConsentError] = useState('')
  const [turnstileToken, setTurnstileToken] = useState('')
  const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined
  const needsConfiguration = !auth.configured
  const needsSignIn = auth.configured && !auth.user
  const needsConsent = Boolean(auth.user && !auth.profile.consentedAt)
  const unavailable = needsConfiguration || needsSignIn || needsConsent || Boolean(turnstileSiteKey && !turnstileToken)

  const verifyHuman = useCallback((token: string) => {
    setTurnstileToken(token)
    if (token) sessionStorage.setItem('interview-lab-turnstile', token)
    else sessionStorage.removeItem('interview-lab-turnstile')
  }, [])

  const acceptNotice = async () => {
    setAccepting(true)
    setConsentError('')
    try {
      await acceptAssessmentConsent()
      await auth.refreshProfile()
    } catch (reason) {
      setConsentError(reason instanceof Error ? reason.message : 'The notice could not be saved.')
    } finally {
      setAccepting(false)
    }
  }
  return (
    <div className="page">
      <PageHeader eyebrow="Adaptive evaluation" title="Choose your pressure" description="Both modes contain 20 questions and adapt difficulty after every objective answer." />

      {needsSignIn && (
        <section className="signin-callout">
          <ShieldCheck size={34} weight="duotone" />
          <div><h2>Sign in before assessment</h2><p>Google sign-in keeps your attempts private and connects your anonymous leaderboard nickname.</p></div>
          <button className="button primary" onClick={() => void auth.signIn()}>Continue with Google</button>
        </section>
      )}

      {needsConfiguration && (
        <section className="signin-callout">
          <ShieldCheck size={34} weight="duotone" />
          <div><h2>Secure backend setup required</h2><p>Study mode is ready offline. Add the Supabase environment values from .env.example to enable server-scored assessments.</p></div>
        </section>
      )}

      {needsConsent && (
        <section className="consent-panel" aria-labelledby="publishing-notice-title">
          <span className="eyebrow">Required before your first assessment</span>
          <h2 id="publishing-notice-title">How your score is shared</h2>
          <ul>
            <li>Eligible scores publish automatically under <strong>{auth.profile.nickname}</strong>.</li>
            <li>The nickname-to-identity mapping stays private.</li>
            <li>Your real name appears only after a separate explicit confirmation.</li>
            <li>You can hide your entry or revoke real-name publication at any time.</li>
          </ul>
          <button className="button primary" onClick={() => void acceptNotice()} disabled={accepting}>{accepting ? 'Saving...' : 'I understand and continue'}</button>
          {consentError && <p className="form-error" role="alert">{consentError}</p>}
        </section>
      )}

      {turnstileSiteKey && auth.user && !needsConsent && (
        <section className="verification-panel"><div><span className="eyebrow">Before starting</span><h2>Verify this assessment start</h2><p>This lightweight check limits automated starts and protects the free event quota.</p></div><TurnstileWidget siteKey={turnstileSiteKey} onToken={verifyHuman} /></section>
      )}

      <div className="mode-grid">
        <article className="mode-panel flexible">
          <div className="mode-icon"><Clock size={31} weight="duotone" /></div>
          <span className="mode-kicker">Flexible assessment</span>
          <h2>Think it through.</h2>
          <p>Ninety seconds per question gives you time to reason, inspect the choices, and commit to an answer.</p>
          <ul><li>90 seconds per question</li><li>Focus changes allowed</li><li>Separate public ranking</li><li>No backtracking after submission</li></ul>
          <Link className={`button primary${unavailable ? ' disabled' : ''}`} aria-disabled={unavailable} to={unavailable ? '/assess' : '/exam/flexible'}>Start Flexible <ArrowRight /></Link>
        </article>
        <article className="mode-panel strict">
          <div className="mode-icon"><Lightning size={31} weight="duotone" /></div>
          <span className="mode-kicker">Strict assessment</span>
          <h2>Answer on instinct.</h2>
          <p>Forty-five seconds, no pauses. The first window, tab, or app change ends the Strict attempt and removes it from the ranking.</p>
          <ul><li>45-second auto-submit</li><li>No window or tab changes</li><li>First focus loss ends the attempt</li><li>Private results still remain available</li></ul>
          <Link className={`button strict-button${unavailable ? ' disabled' : ''}`} aria-disabled={unavailable} to={unavailable ? '/assess' : '/exam/strict'}>Start Strict <ArrowRight /></Link>
        </article>
      </div>

      <section className="privacy-explainer">
        <EyeSlash size={26} />
        <div><h2>Your identity stays private</h2><p>Eligible scores publish under <strong>{auth.profile.nickname}</strong>. Your Google name never appears unless you explicitly publish it from Profile. You can hide your score later.</p></div>
      </section>

      <p className="assessment-disclaimer">Strict mode discourages outside help but is not supervised proctoring. Results are provisional readiness estimates, not hiring decisions.</p>
    </div>
  )
}
