import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RotateCcw, Home } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary]', error, info.componentStack)
    }
  }

  handleReset = () => {
    this.setState({ error: null })
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-bg text-ink flex items-center justify-center p-6">
          <div className="card p-8 text-center max-w-md w-full border-line space-y-4">
            <AlertTriangle className="size-10 text-rose-400 mx-auto" />
            <h1 className="text-lg font-bold text-ink">Something went wrong</h1>
            <p className="text-xs text-muted leading-relaxed">
              An unexpected error occurred while rendering this page. You can try refreshing the view or returning to the dashboard.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="btn-primary flex items-center gap-2 text-xs py-2 px-3.5"
              >
                <RotateCcw className="size-3.5" />
                <span>Try again</span>
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="btn-secondary flex items-center gap-2 text-xs py-2 px-3.5"
              >
                <Home className="size-3.5" />
                <span>Go to Dashboard</span>
              </button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
