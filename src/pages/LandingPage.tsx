import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

// The root route redirects based on role
export function LandingPage() {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (profile?.role === 'client') return <Navigate to="/portal" replace />
  return <Navigate to="/dashboard" replace />
}
