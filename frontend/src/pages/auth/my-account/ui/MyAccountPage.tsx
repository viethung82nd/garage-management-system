import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { getPostLoginPath, getRoleLabel, isSupportedFrontendRole, useAuth } from '../../../../shared/auth'
import { AuthApiError } from '../../../../shared/auth/api'
import { usePageMeta } from '../../../../shared/lib/kapa-template'
import { KapaFooter, KapaNavbar, KapaPageBanner, KapaTopbar, PasswordField } from '../../../../shared/ui/kapa-chrome'

type AuthTab = 'login' | 'register'

const initialLoginForm = {
  email: '',
  password: '',
  remember: true,
}

const initialRegisterForm = {
  fullName: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  remember: true,
}

export default function MyAccountPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, isHydrating, login, logout, register, user } = useAuth()
  const requestedPath = (location.state as { from?: string } | null)?.from
  const [activeTab, setActiveTab] = useState<AuthTab>('login')
  const [loginForm, setLoginForm] = useState(initialLoginForm)
  const [registerForm, setRegisterForm] = useState(initialRegisterForm)
  const [loginError, setLoginError] = useState('')
  const [registerError, setRegisterError] = useState('')
  const [notice, setNotice] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [registerLoading, setRegisterLoading] = useState(false)

  usePageMeta('My account – Kapa')

  const supportedRedirect = user ? getPostLoginPath(user.role) : null
  const unsupportedRole = user && !isSupportedFrontendRole(user.role)
  const roleNotice = useMemo(() => {
    if (!unsupportedRole || !user) return ''
    return `${getRoleLabel(user.role)} login đã xác thực thành công, nhưng workspace frontend cho role này chưa được triển khai.`
  }, [unsupportedRole, user])

  useEffect(() => {
    if (!isAuthenticated || isHydrating || !user) return
    if (supportedRedirect) {
      navigate(supportedRedirect, { replace: true })
      return
    }

    setNotice(roleNotice)
  }, [isAuthenticated, isHydrating, navigate, roleNotice, supportedRedirect, user])

  async function handleLoginSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoginError('')
    setNotice('')
    setLoginLoading(true)

    try {
      const session = await login(
        {
          email: loginForm.email.trim(),
          password: loginForm.password,
        },
        loginForm.remember,
      )

      const redirectPath = getPostLoginPath(session.user.role)
      if (redirectPath) {
        navigate(requestedPath && requestedPath.startsWith('/customer') && session.user.role === 'onlineCustomer' ? requestedPath : redirectPath, { replace: true })
        return
      }

      setNotice(`${getRoleLabel(session.user.role)} login thành công. Workspace frontend cho role này chưa được triển khai.`)
    } catch (error) {
      setLoginError(error instanceof AuthApiError ? error.message : 'Login failed. Please try again.')
    } finally {
      setLoginLoading(false)
    }
  }

  async function handleRegisterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setRegisterError('')
    setNotice('')

    if (registerForm.password.length < 8) {
      setRegisterError('Password must be at least 8 characters')
      return
    }

    if (registerForm.password !== registerForm.confirmPassword) {
      setRegisterError('Password confirmation does not match')
      return
    }

    setRegisterLoading(true)

    try {
      const session = await register(
        {
          fullName: registerForm.fullName.trim(),
          email: registerForm.email.trim(),
          phone: registerForm.phone.trim(),
          password: registerForm.password,
        },
        registerForm.remember,
      )

      const redirectPath = getPostLoginPath(session.user.role)
      navigate(redirectPath ?? '/my-account', { replace: true })
    } catch (error) {
      setRegisterError(error instanceof AuthApiError ? error.message : 'Register failed. Please try again.')
    } finally {
      setRegisterLoading(false)
    }
  }

  return (
    <>
      <KapaTopbar />
      <KapaNavbar current="account" />
      <KapaPageBanner title="My account" breadcrumb="My account" />

      <div className="page-main-content">
        <div className="page-area">
          <div className="container">
            <div id="post-808" className="post-808 page type-page status-publish has-post-thumbnail hentry">
              <div className="entry-content">
                <div className="woocommerce">
                  <div className="woocommerce-notices-wrapper" />
                  {isHydrating ? <div className="auth-form-message auth-form-message--info">Checking your session...</div> : null}

                  {notice ? <div className="auth-form-message auth-form-message--success">{notice}</div> : null}

                  {unsupportedRole && user ? (
                    <div className="auth-unsupported-panel">
                      <span className="customer-booking-card__eyebrow">Authenticated</span>
                      <h3>{user.fullName}</h3>
                      <p>{roleNotice}</p>
                      <div className="auth-unsupported-panel__meta">
                        <span>{user.email || 'No email'}</span>
                        <span>{getRoleLabel(user.role)}</span>
                      </div>
                      <button type="button" className="default-btn" onClick={logout}>
                        Logout
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="auth-tabs">
                        <button
                          type="button"
                          className={`auth-tab-button${activeTab === 'login' ? ' auth-tab-button--active' : ''}`}
                          onClick={() => setActiveTab('login')}
                        >
                          Login
                        </button>
                        <button
                          type="button"
                          className={`auth-tab-button${activeTab === 'register' ? ' auth-tab-button--active' : ''}`}
                          onClick={() => setActiveTab('register')}
                        >
                          Register
                        </button>
                      </div>

                      {activeTab === 'login' ? (
                        <>
                          <h3 className="login-form-title">Login</h3>
                          {loginError ? <div className="auth-form-message auth-form-message--error">{loginError}</div> : null}
                          <form className="woocommerce-form woocommerce-form-login login" method="post" onSubmit={handleLoginSubmit}>
                            <p className="woocommerce-form-row woocommerce-form-row--wide form-row form-row-wide">
                              <label htmlFor="login-email">
                                Username or email address&nbsp;<span className="required">*</span>
                              </label>
                              <input
                                type="email"
                                className="woocommerce-Input woocommerce-Input--text input-text form-control"
                                name="username"
                                id="login-email"
                                autoComplete="username"
                                value={loginForm.email}
                                onChange={(event) => setLoginForm((current) => ({ ...current, email: event.target.value }))}
                              />
                            </p>

                            <p className="woocommerce-form-row woocommerce-form-row--wide form-row form-row-wide">
                              <label htmlFor="login-password">
                                Password&nbsp;<span className="required">*</span>
                              </label>
                              <PasswordField
                                id="login-password"
                                name="password"
                                autoComplete="current-password"
                                value={loginForm.password}
                                onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
                              />
                            </p>

                            <p className="form-row">
                              <label className="woocommerce-form__label woocommerce-form__label-for-checkbox woocommerce-form-login__rememberme">
                                <input
                                  className="woocommerce-form__input woocommerce-form__input-checkbox"
                                  name="rememberme"
                                  type="checkbox"
                                  id="rememberme"
                                  checked={loginForm.remember}
                                  onChange={(event) => setLoginForm((current) => ({ ...current, remember: event.target.checked }))}
                                />{' '}
                                <span>Remember me</span>
                              </label>
                              <button
                                type="submit"
                                className="woocommerce-button button woocommerce-form-login__submit btn btn-primary order-btn"
                                name="login"
                                value="Log in"
                                disabled={loginLoading}
                              >
                                {loginLoading ? 'Logging in...' : 'Log in'}
                              </button>
                            </p>

                            <p className="woocommerce-LostPassword lost_password">
                              <Link to="/my-account/lost-password">Lost your password?</Link>
                            </p>
                          </form>
                        </>
                      ) : (
                        <>
                          <h3 className="login-form-title">Register</h3>
                          {registerError ? <div className="auth-form-message auth-form-message--error">{registerError}</div> : null}
                          <form className="woocommerce-form woocommerce-form-register register" method="post" onSubmit={handleRegisterSubmit}>
                            <p className="woocommerce-form-row woocommerce-form-row--wide form-row form-row-wide">
                              <label htmlFor="register-fullName">
                                Full name&nbsp;<span className="required">*</span>
                              </label>
                              <input
                                type="text"
                                className="woocommerce-Input woocommerce-Input--text input-text form-control"
                                name="fullName"
                                id="register-fullName"
                                autoComplete="name"
                                value={registerForm.fullName}
                                onChange={(event) => setRegisterForm((current) => ({ ...current, fullName: event.target.value }))}
                              />
                            </p>

                            <p className="woocommerce-form-row woocommerce-form-row--wide form-row form-row-wide">
                              <label htmlFor="register-email">
                                Email address&nbsp;<span className="required">*</span>
                              </label>
                              <input
                                type="email"
                                className="woocommerce-Input woocommerce-Input--text input-text form-control"
                                name="email"
                                id="register-email"
                                autoComplete="email"
                                value={registerForm.email}
                                onChange={(event) => setRegisterForm((current) => ({ ...current, email: event.target.value }))}
                              />
                            </p>

                            <p className="woocommerce-form-row woocommerce-form-row--wide form-row form-row-wide">
                              <label htmlFor="register-phone">Phone</label>
                              <input
                                type="tel"
                                className="woocommerce-Input woocommerce-Input--text input-text form-control"
                                name="phone"
                                id="register-phone"
                                autoComplete="tel"
                                value={registerForm.phone}
                                onChange={(event) => setRegisterForm((current) => ({ ...current, phone: event.target.value }))}
                              />
                            </p>

                            <p className="woocommerce-form-row woocommerce-form-row--wide form-row form-row-wide">
                              <label htmlFor="register-password">
                                Password&nbsp;<span className="required">*</span>
                              </label>
                              <PasswordField
                                id="register-password"
                                name="password"
                                autoComplete="new-password"
                                value={registerForm.password}
                                onChange={(event) => setRegisterForm((current) => ({ ...current, password: event.target.value }))}
                              />
                            </p>

                            <p className="woocommerce-form-row woocommerce-form-row--wide form-row form-row-wide">
                              <label htmlFor="register-confirm-password">
                                Confirm password&nbsp;<span className="required">*</span>
                              </label>
                              <PasswordField
                                id="register-confirm-password"
                                name="confirmPassword"
                                autoComplete="new-password"
                                value={registerForm.confirmPassword}
                                onChange={(event) => setRegisterForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                              />
                            </p>

                            <p className="form-row">
                              <label className="woocommerce-form__label woocommerce-form__label-for-checkbox woocommerce-form-login__rememberme">
                                <input
                                  className="woocommerce-form__input woocommerce-form__input-checkbox"
                                  name="registerRememberme"
                                  type="checkbox"
                                  id="registerRememberme"
                                  checked={registerForm.remember}
                                  onChange={(event) => setRegisterForm((current) => ({ ...current, remember: event.target.checked }))}
                                />{' '}
                                <span>Remember me</span>
                              </label>
                              <button type="submit" className="woocommerce-button button btn btn-primary order-btn" disabled={registerLoading}>
                                {registerLoading ? 'Creating account...' : 'Register'}
                              </button>
                            </p>
                          </form>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <KapaFooter />
    </>
  )
}
