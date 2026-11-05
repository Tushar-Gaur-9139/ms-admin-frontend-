import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import SessionLoading from './SessionLoading'

function GuestOnly() {
  const { user, loading, authError } = useAuth()

  if (loading) return <SessionLoading />
  if (user) return <Navigate replace to="/" />

  return (
    <>
      <Outlet />
      {authError && <p className="connection-error" role="alert">{authError}</p>}
    </>
  )
}

export default GuestOnly
