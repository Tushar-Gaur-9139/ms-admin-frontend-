function ComingSoon({ page }) {
  return (
    <section className="panel coming-soon">
      <span className="coming-soon-icon" aria-hidden="true">◌</span>
      <h2>{page} workspace</h2>
      <p>This workspace is available to your role. Its live data and management actions will be connected to the Laravel API.</p>
    </section>
  )
}

export default ComingSoon
