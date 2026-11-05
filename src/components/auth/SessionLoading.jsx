function SessionLoading() {
  return (
    <main className="app-loading" role="status" aria-label="Loading">
      <div className="app-loading-content">
        <img className="app-loading-logo" src="/favicon.svg" alt="M.S. Enterprises" />
        <span className="loading-spinner" aria-hidden="true" />
      </div>
    </main>
  )
}

export default SessionLoading
