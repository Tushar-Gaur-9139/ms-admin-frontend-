import Brand from '../Brand'

function AuthVisual() {
  return (
    <section className="auth-visual" aria-label="M.S. Enterprises">
      <div className="auth-visual-top"><Brand /></div>
      <div className="auth-visual-copy">
        <span className="visual-kicker"><span /> STAFF WORKSPACE</span>
        <h1>One workspace.<br />Your whole business.</h1>
        <p>Manage the work that keeps M.S. Enterprises moving. Store data and staff access are managed securely through the shared backend.</p>
      </div>
      <div className="visual-footer"><span className="visual-line" /> M.S. ENTERPRISES <span>·</span> ADMIN PORTAL</div>
    </section>
  )
}

export default AuthVisual
