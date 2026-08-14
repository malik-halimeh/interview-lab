import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement, options: Record<string, unknown>) => string
      remove: (widgetId: string) => void
    }
  }
}

export function TurnstileWidget({ siteKey, onToken }: { siteKey: string; onToken: (token: string) => void }) {
  const container = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let widgetId = ''
    let cancelled = false
    const render = () => {
      if (cancelled || !container.current || !window.turnstile || widgetId) return
      widgetId = window.turnstile.render(container.current, {
        sitekey: siteKey,
        theme: 'auto',
        callback: onToken,
        'expired-callback': () => onToken(''),
        'error-callback': () => onToken('')
      })
    }
    const existing = document.querySelector<HTMLScriptElement>('script[data-interview-turnstile]')
    if (existing) {
      const timer = window.setInterval(render, 100)
      return () => { cancelled = true; window.clearInterval(timer); if (widgetId) window.turnstile?.remove(widgetId) }
    }
    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.defer = true
    script.dataset.interviewTurnstile = 'true'
    script.addEventListener('load', render)
    document.head.appendChild(script)
    return () => { cancelled = true; if (widgetId) window.turnstile?.remove(widgetId) }
  }, [onToken, siteKey])
  return <div ref={container} className="turnstile-widget" aria-label="Human verification" />
}
