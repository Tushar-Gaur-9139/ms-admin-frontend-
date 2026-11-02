function DashboardHeader({ activePage, menuOpen, onOpenMenu, user }) {
  return (
    <header className="topbar">
      <button aria-expanded={menuOpen} aria-label="Open navigation" className="mobile-menu-button" onClick={onOpenMenu} type="button">☰</button>
      <div className="breadcrumbs"><span>Admin</span><span aria-hidden="true">/</span><strong>{activePage}</strong></div>
      <div className="topbar-right">
        {/* <span className="connection-status"><span /> Shared backend</span> */}
        <div className="topbar-avatar" title={user.role_name ?? user.role}>{user.name?.slice(0, 1).toUpperCase()}</div>
      </div>
    </header>
  )
}

export default DashboardHeader
