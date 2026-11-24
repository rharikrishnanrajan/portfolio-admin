import { Link } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen grid place-items-center p-6 text-center">
      <div className="card p-10 max-w-sm w-full">
        <AlertTriangle className="size-10 text-muted mx-auto mb-4" />
        <p className="eyebrow mb-2">404</p>
        <h1 className="text-2xl font-bold text-ink mb-2">Page not found</h1>
        <p className="text-sm text-muted mb-6">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link to="/" className="btn-primary inline-block">
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
