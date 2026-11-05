import { useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { authApi } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import AuthForm from './AuthForm'
import AuthVisual from './AuthVisual'
import Brand from '../Brand'

function AuthScreen({ initialMode = 'login' }) {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [mode, setMode] = useState(initialMode)
  const [values, setValues] = useState({
    name: '',
    email: searchParams.get('email') ?? '',
    password: '',
    password_confirmation: '',
  })
  const [message, setMessage] = useState(location.state?.message ?? '')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [remember, setRemember] = useState(false)

  function changeMode(nextMode) {
    setMode(nextMode)
    setMessage('')
    setError('')
    setFieldErrors({})
  }

  function updateField(event) {
    const { name, value } = event.target
    setValues((current) => ({ ...current, [name]: value }))
    setFieldErrors((current) => ({ ...current, [name]: undefined }))
    setError('')
  }

  function validateForm() {
    const isRegister = mode === 'register'
    const isReset = mode === 'reset'
    const passwordFields = mode !== 'forgot'
    const errors = {}
    const email = values.email.trim()

    if (!email) errors.email = ['Enter your email address.']
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = ['Enter a valid email address.']

    if (isRegister && !values.name.trim()) errors.name = ['Enter your full name.']

    if (passwordFields && !values.password) errors.password = ['Enter your password.']
    else if ((isRegister || isReset) && values.password.length < 8) errors.password = ['Use at least 8 characters for your password.']

    if ((isRegister || isReset) && values.password !== values.password_confirmation) {
      errors.password_confirmation = ['The passwords do not match.']
    }

    if (isReset && !searchParams.get('token')) {
      errors.token = ['This password reset link is incomplete. Request a new reset link.']
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function submit(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    if (!validateForm()) return
    setSubmitting(true)

    try {
      if (mode === 'login') {
        const result = await authApi.login({ email: values.email.trim(), password: values.password, remember })
        signIn(result.user)
        navigate('/', { replace: true })
        return
      }

      if (mode === 'register') {
        await authApi.register({
          name: values.name.trim(),
          email: values.email.trim(),
          password: values.password,
          password_confirmation: values.password_confirmation,
        })
        setMessage('Your account has been created. An administrator must assign you a staff role before you can access this workspace.')
        setValues((current) => ({ ...current, password: '', password_confirmation: '' }))
        setMode('login')
        return
      }

      if (mode === 'forgot') {
        await authApi.forgotPassword({ email: values.email.trim() })
        setMessage('If an account exists for that email, a password reset link has been sent.')
        return
      }

      await authApi.resetPassword({
        token: searchParams.get('token'),
        email: values.email.trim(),
        password: values.password,
        password_confirmation: values.password_confirmation,
      })
      navigate('/login', {
        replace: true,
        state: { message: 'Your password has been reset. Sign in with your new password.' },
      })
    } catch (requestError) {
      setError(requestError.message)
      setFieldErrors(requestError.errors ?? {})
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <AuthVisual />
      <section className="auth-main">
        <div className="auth-top-mobile"><Brand /></div>
        <AuthForm
          changeMode={changeMode}
          error={error}
          fieldErrors={fieldErrors}
          message={message}
          mode={mode}
          remember={remember}
          setRemember={setRemember}
          submit={submit}
          submitting={submitting}
          updateField={updateField}
          values={values}
        />
        <p className="auth-copyright">M.S. Enterprises · Staff administration</p>
      </section>
    </main>
  )
}

export default AuthScreen
