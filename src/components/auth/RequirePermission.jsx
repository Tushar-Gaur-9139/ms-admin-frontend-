import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { canViewPage } from '../../lib/adminConfig'

function RequirePermission({ page }) {
  const { user } = useAuth()

  if (!canViewPage(user, page)) return <Navigate replace to="/" />

  return <Outlet />
}

export default RequirePermission
