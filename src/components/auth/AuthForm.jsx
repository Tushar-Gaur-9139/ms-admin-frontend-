function AuthForm({
  changeMode,
  error,
  fieldErrors,
  message,
  mode,
  remember,
  setRemember,
  submit,
  submitting,
  updateField,
  values,
}) {
  const isRegister = mode === 'register'
  const isForgot = mode === 'forgot'
  const isReset = mode === 'reset'
  const heading = isRegister ? 'Create your account' : isForgot ? 'Reset your password' : isReset ? 'Choose a new password' : 'Welcome back'
  const description = isRegister
    ? 'Create an account to get started. Staff access is assigned by an administrator.'
    : isForgot
      ? 'Enter your email and we’ll send a reset link if an account exists.'
      : isReset
        ? 'Enter and confirm a new password for your account.'
        : 'Sign in to your M.S. Enterprises workspace.'
  const passwordFields = !isForgot

  return (
    <div className="auth-card">
      <div className="auth-heading">
        <p className="auth-eyebrow">{isForgot || isReset ? 'ACCOUNT RECOVERY' : 'ADMIN WORKSPACE'}</p>
        <h2>{heading}</h2>
        <p>{description}</p>
      </div>

      {message && <div className="form-message success-message" role="status">{message}</div>}
      {error && <div className="form-message error-message" role="alert">{error}</div>}

      <form noValidate onSubmit={submit} className="auth-form">
        {isRegister && (
          <label className="form-field">
            <span>Full name</span>
            <input autoComplete="name" name="name" onChange={updateField} required value={values.name} />
            {fieldErrors.name && <small>{fieldErrors.name[0]}</small>}
          </label>
        )}

        <label className="form-field">
          <span>Email address</span>
          <input autoComplete="email" name="email" onChange={updateField} required type="email" value={values.email} />
          {fieldErrors.email && <small>{fieldErrors.email[0]}</small>}
        </label>

        {passwordFields && (
          <label className="form-field">
            <span>Password</span>
            <input
              autoComplete={isRegister || isReset ? 'new-password' : 'current-password'}
              minLength={8}
              name="password"
              onChange={updateField}
              required
              type="password"
              value={values.password}
            />
            {fieldErrors.password && <small>{fieldErrors.password[0]}</small>}
          </label>
        )}

        {(isRegister || isReset) && (
          <label className="form-field">
            <span>Confirm password</span>
            <input autoComplete="new-password" minLength={8} name="password_confirmation" onChange={updateField} required type="password" value={values.password_confirmation} />
            {fieldErrors.password_confirmation && <small>{fieldErrors.password_confirmation[0]}</small>}
          </label>
        )}
        {fieldErrors.token && <small className="token-error">{fieldErrors.token[0]}</small>}

        {mode === 'login' && (
          <div className="auth-options">
            <label className="remember-option"><input checked={remember} name="remember" onChange={(event) => setRemember(event.target.checked)} type="checkbox" /> <span>Remember me</span></label>
            <button className="text-button" onClick={() => changeMode('forgot')} type="button">Forgot password?</button>
          </div>
        )}

        <button className="submit-button" disabled={submitting} type="submit">
          {submitting ? 'Please wait…' : isRegister ? 'Create account' : isForgot ? 'Send reset link' : isReset ? 'Reset password' : 'Sign in'}
          {!submitting && <span aria-hidden="true">→</span>}
        </button>
      </form>

      <div className="auth-switch">
        {isRegister ? (
          <>Already have an account? <button className="text-button" onClick={() => changeMode('login')} type="button">Sign in</button></>
        ) : isForgot || isReset ? (
          <button className="text-button back-to-login" onClick={() => changeMode('login')} type="button">← Back to sign in</button>
        ) : (
          <>Need an account? <button className="text-button" onClick={() => changeMode('register')} type="button">Register</button></>
        )}
      </div>

      <p className="auth-security"><span aria-hidden="true">◈</span> Staff permissions are assigned by an administrator.</p>
    </div>
  )
}

export default AuthForm
