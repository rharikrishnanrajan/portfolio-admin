import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

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
    // Log to console for debugging; replace with a monitoring service if needed
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  handleReset = () => {
    this.setState({ error: null })
  }

  render() {
    if (this.state.error) {
      return (
        <div className="p-8 text-center max-w-lg mx-auto">
          <AlertTriangle className="size-10 text-rose-400 mx-auto mb-4" />
          <p className="eyebrow text-rose-400 mb-2">Something went wrong</p>
          <p className="text-sm text-muted mb-4 font-mono break-all">
            {this.state.error.message}
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="btn-primary"
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
