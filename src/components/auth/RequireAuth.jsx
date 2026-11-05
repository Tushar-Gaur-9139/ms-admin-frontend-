import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import SessionLoading from './SessionLoading'

function RequireAuth() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <SessionLoading />
  if (!user) return <Navigate replace state={{ from: location }} to="/login" />

  return <Outlet />
}

export default RequireAuth
