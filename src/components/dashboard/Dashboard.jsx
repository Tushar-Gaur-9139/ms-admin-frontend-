import { useState } from 'react'
import Sidebar from './Sidebar'
import DashboardHeader from './DashboardHeader'
import PageHeading from './PageHeading'
import Overview from './Overview'
import ComingSoon from './ComingSoon'
import RoleManagement from '../../modules/roles/RoleManagement'
import UserManagement from '../../modules/users/UserManagement'

function Dashboard({ user, onLogout, authError }) {
  const [activePage, setActivePage] = useState('Overview')
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="admin-layout">
      <Sidebar
        activePage={activePage}
        closeMenu={() => setMenuOpen(false)}
        menuOpen={menuOpen}
        onLogout={onLogout}
        onNavigate={setActivePage}
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
          <PageHeading activePage={activePage} user={user} />
          {activePage === 'Overview'
            ? <Overview />
            : activePage === 'Roles'
              ? <RoleManagement currentUser={user} />
              : activePage === 'Users'
                ? <UserManagement currentUser={user} />
              : <ComingSoon page={activePage} />}
        </div>
      </main>
    </div>
  )
}

export default Dashboard
