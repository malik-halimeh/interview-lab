const recoveryMarker = 'interview-lab-build-recovery'

export async function recoverFromStaleBuild(force = false) {
  if (!force && sessionStorage.getItem(recoveryMarker)) return
  sessionStorage.setItem(recoveryMarker, new Date().toISOString())

  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations().catch(() => [])
    await Promise.all(registrations.map((registration) => registration.unregister())).catch(() => undefined)
  }

  window.location.reload()
}

export function clearRecoveryMarker() {
  sessionStorage.removeItem(recoveryMarker)
}
