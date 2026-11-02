function PageHeading({ activePage, user }) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">M.S. ENTERPRISES · {(user.role_name ?? user.role).toUpperCase()}</p>
        <h1>{activePage}</h1>
        <p className="page-description">
          {activePage === 'Overview'
            ? `Welcome back, ${user.name}. Here is your store operations workspace.`
            : activePage === 'Roles'
              ? 'Create and manage role access for the admin workspace.'
              : activePage === 'Users'
                ? 'Create accounts, assign roles, and manage account status.'
            : `The ${activePage.toLowerCase()} workspace is ready for shared backend data.`}
        </p>
      </div>
      <span className="date-chip">Staff workspace</span>
    </div>
  )
}

export default PageHeading
