import { createContext, useContext, useEffect, useState } from 'react'
import { authApi } from '../lib/api'
import ApiRequestFeedback from '../components/feedback/ApiRequestFeedback'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
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
      setUser(null)
    } catch {
      setAuthError('Could not sign out because the backend is unavailable. Please try again.')
    }
  }

  function signIn(authenticatedUser) {
    setAuthError('')
    setUser(authenticatedUser)
  }

  return (
    <AuthContext.Provider value={{ user, loading, authError, signIn, signOut }}>
      {children}
      <ApiRequestFeedback suppressSpinner={loading} />
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used within AuthProvider')
  return value
}
