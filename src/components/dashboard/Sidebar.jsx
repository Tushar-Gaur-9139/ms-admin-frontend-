import Brand from '../Brand'
import { BarChart3, Boxes, Home, LogOut, Package, Settings, ShieldCheck, ShoppingCart, UsersRound } from 'lucide-react'
import { navigation, pagePermissions } from '../../lib/adminConfig'

const navigationIcons = {
  Overview: Home,
  Orders: ShoppingCart,
  Products: Package,
  Inventory: Boxes,
  Customers: UsersRound,
  Roles: ShieldCheck,
  Users: UsersRound,
  Reports: BarChart3,
  Settings,
}

function Sidebar({ activePage, onNavigate, user, onLogout, menuOpen, closeMenu }) {
  const canManageRoles = ['admin', 'super_admin'].includes(user.role)
  const sections = navigation
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => item === 'Roles' || item === 'Users'
        ? canManageRoles
        : user.permissions?.includes(pagePermissions[item])),
    }))
    .filter((section) => section.items.length > 0)

  return (
    <>
      {menuOpen && <button aria-label="Close navigation" className="mobile-nav-backdrop" onClick={closeMenu} type="button" />}
      <aside className={`sidebar${menuOpen ? ' sidebar-open' : ''}`}>
        <Brand />
        <div className="workspace-label">ADMIN WORKSPACE</div>
        <nav aria-label="Admin navigation">
          {sections.map(({ section, items }) => (
            <div className="nav-section" key={section}>
              <p className="nav-section-title">{section}</p>
              {items.map((item) => {
                const Icon = navigationIcons[item]
                return (
                  <button
                    aria-current={activePage === item ? 'page' : undefined}
                    className={`nav-item${activePage === item ? ' active' : ''}`}
                    key={item}
                    onClick={() => { onNavigate(item); closeMenu() }}
                    type="button"
                  >
                    <Icon size={16} strokeWidth={1.8} aria-hidden="true" />
                    {item}
                  </button>
                )
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="user-avatar">{user.name?.slice(0, 1).toUpperCase()}</div>
          <div className="user-details">
            <strong>{user.name}</strong>
            <span>{user.role_name ?? user.role}</span>
          </div>
          <button aria-label="Sign out" className="logout-button" onClick={onLogout} title="Sign out" type="button"><LogOut size={15} aria-hidden="true" /></button>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
