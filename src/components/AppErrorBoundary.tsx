import { Component, type ErrorInfo, type ReactNode } from 'react'
import { WarningCircle } from '@phosphor-icons/react'
import { recoverFromStaleBuild } from '../lib/appRecovery'

interface Props {
  children: ReactNode
}

interface State {
  failed: boolean
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Interview Lab render failure', error, info)
  }

  render() {
    if (!this.state.failed) return this.props.children

    return (
      <main className="page centered-state" role="alert">
        <WarningCircle size={38} />
        <h1>The page needs a fresh application version</h1>
        <p>Your saved assessment remains on the server. Recovering the page will not reset its deadline or erase its answers.</p>
        <button className="button primary" onClick={() => void recoverFromStaleBuild(true)}>Recover page</button>
      </main>
    )
  }
}
