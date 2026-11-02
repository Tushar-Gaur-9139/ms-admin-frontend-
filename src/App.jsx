import { useEffect, useState } from 'react'
import { authApi } from './lib/api'
import AuthScreen from './components/auth/AuthScreen'
import Dashboard from './components/dashboard/Dashboard'
import ApiRequestFeedback from './components/feedback/ApiRequestFeedback'
import './App.css'

function App() {
  const searchParams = new URLSearchParams(window.location.search)
  const resetToken = searchParams.get('token')
  const initialEmail = searchParams.get('email') ?? ''
  const [authMode, setAuthMode] = useState(resetToken ? 'reset' : 'login')
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    let active = true
    authApi.currentUser()
      .then((result) => {
        if (active) setUser(result.user)
      })
      .catch((error) => {
        if (!active) return
        if (error.status === 404) {
          setAuthError('The account API route was not found. Restart the Laravel backend and refresh this page.')
        } else if (error.status !== 401 && error.status !== 403) {
          setAuthError('Could not reach the shared backend. Check the API URL and server, then try again.')
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  async function signOut() {
    setAuthError('')
    try {
      await authApi.logout()
      setAuthMode('login')
      setUser(null)
    } catch {
      setAuthError('Could not sign out because the backend is unavailable. Please try again.')
    }
  }

  function handleAuthenticated(authenticatedUser) {
    setAuthError('')
    setAuthMode('login')
    setUser(authenticatedUser)
  }

  let content

  if (loading) {
    content = (
      <main className="app-loading" role="status" aria-label="Loading">
        <div className="app-loading-content">
          <img className="app-loading-logo" src="/favicon.svg" alt="M.S. Enterprises" />
          <span className="loading-spinner" aria-hidden="true" />
        </div>
      </main>
    )
  } else if (!user) {
    content = (
      <>
        <AuthScreen
          initialEmail={initialEmail}
          initialMode={authMode}
          onAuthenticated={handleAuthenticated}
          onPasswordReset={() => setAuthMode('login')}
        />
        {authError && <p className="connection-error" role="alert">{authError}</p>}
      </>
    )
  } else {
    content = <Dashboard authError={authError} onLogout={signOut} user={user} />
  }

  return (
    <>
      {content}
      <ApiRequestFeedback suppressSpinner={loading} />
    </>
  )
}

export default App
