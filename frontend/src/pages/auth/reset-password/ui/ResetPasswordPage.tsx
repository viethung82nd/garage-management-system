import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AuthApiError, resetPasswordRequest } from '../../../../shared/auth/api'
import { usePageMeta } from '../../../../shared/lib/kapa-template'
import { KapaFooter, KapaNavbar, KapaPageBanner, KapaTopbar, PasswordField } from '../../../../shared/ui/kapa-chrome'

const initialForm = {
  password: '',
  confirmPassword: '',
}

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [succeeded, setSucceeded] = useState(false)
  const [tokenInvalid, setTokenInvalid] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setTokenInvalid(false)

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (form.password !== form.confirmPassword) {
      setError('Password confirmation does not match')
      return
    }

    setLoading(true)
    try {
      await resetPasswordRequest({ token, password: form.password })
      setSucceeded(true)
    } catch (requestError) {
      if (requestError instanceof AuthApiError && (requestError.status === 400 || requestError.status === 401)) {
        setTokenInvalid(true)
      } else {
        setError(requestError instanceof AuthApiError ? requestError.message : 'Unable to reset your password. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  usePageMeta(
    'Reset password – Kapa',
    'wp-singular page-template-default page page-id-808 wp-theme-kapa theme-kapa woocommerce-account woocommerce-page woocommerce-lost-password woocommerce-js elementor-default elementor-kit-5',
  )

  return (
    <>
      <KapaTopbar />
      <KapaNavbar current="lost-password" />
      <KapaPageBanner title="My account" breadcrumb="My account" />

      <div className="page-main-content">
        <div className="page-area">
          <div className="container">
            <div id="post-808" className="post-808 page type-page status-publish has-post-thumbnail hentry">
              <div className="entry-content">
                <div className="woocommerce">
                  <div className="woocommerce-notices-wrapper" />
                  {!token ? (
                    <div className="auth-form-message auth-form-message--error">
                      This reset link is missing its token. Please request a new password reset email.
                    </div>
                  ) : null}
                  {tokenInvalid ? (
                    <div className="auth-form-message auth-form-message--error">
                      <p>
                        This reset link is invalid or has expired. Please{' '}
                        <Link to="/my-account/lost-password">request a new password reset email</Link>.
                      </p>
                    </div>
                  ) : null}
                  {error ? <div className="auth-form-message auth-form-message--error">{error}</div> : null}
                  {succeeded ? (
                    <div className="auth-form-message auth-form-message--success">
                      <p>
                        Your password has been reset. You can now <Link to="/my-account">log in</Link> with your new password.
                      </p>
                    </div>
                  ) : (
                    <form method="post" className="woocommerce-ResetPassword reset_password" onSubmit={handleSubmit}>
                      <p>Enter your new password below.</p>
                      <p className="woocommerce-form-row woocommerce-form-row--first form-row form-row-first">
                        <label htmlFor="reset-password">
                          New password&nbsp;<span className="required">*</span>
                        </label>
                        <PasswordField
                          id="reset-password"
                          name="password"
                          autoComplete="new-password"
                          value={form.password}
                          onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                        />
                      </p>

                      <p className="woocommerce-form-row woocommerce-form-row--last form-row form-row-last">
                        <label htmlFor="reset-confirm-password">
                          Confirm new password&nbsp;<span className="required">*</span>
                        </label>
                        <PasswordField
                          id="reset-confirm-password"
                          name="confirmPassword"
                          autoComplete="new-password"
                          value={form.confirmPassword}
                          onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                        />
                      </p>

                      <div className="clear" />

                      <p className="woocommerce-form-row form-row">
                        <button
                          type="submit"
                          className="woocommerce-Button button btn btn-primary order-btn"
                          value="Reset password"
                          disabled={loading || !token}
                        >
                          {loading ? 'Resetting...' : 'Reset Password'}
                        </button>
                      </p>
                    </form>
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
