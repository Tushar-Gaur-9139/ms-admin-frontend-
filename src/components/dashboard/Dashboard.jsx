import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import DashboardHeader from './DashboardHeader'
import PageHeading from './PageHeading'
import { useAuth } from '../../context/AuthContext'
import { canViewPage, pageFromPath } from '../../lib/adminConfig'

function Dashboard() {
  const { user, authError, signOut } = useAuth()
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const activePage = pageFromPath(pathname) ?? 'Overview'

  return (
    <div className="admin-layout">
      <Sidebar
        closeMenu={() => setMenuOpen(false)}
        menuOpen={menuOpen}
        onLogout={signOut}
        user={user}
      />
      <main className="main-content">
        <DashboardHeader
          activePage={activePage}
          menuOpen={menuOpen}
          onOpenMenu={() => setMenuOpen(true)}
          user={user}
        />
        <div className="page-content">
          {authError && <p className="dashboard-error" role="alert">{authError}</p>}
          {canViewPage(user, activePage) && <PageHeading activePage={activePage} user={user} />}
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export default Dashboard
