import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AuthApiError, resetPasswordRequest } from '../../../../shared/auth/api'
import { usePageMeta } from '../../../../shared/lib/kapa-template'
import { KapaFooter, KapaNavbar, KapaPageBanner, KapaTopbar, PasswordField } from '../../../../shared/ui/kapa-chrome'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState(searchParams.get('email') ?? '')
  const [otp, setOtp] = useState('')
  const [form, setForm] = useState({ newPassword: '', confirmPassword: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [succeeded, setSucceeded] = useState(false)
  const [otpInvalid, setOtpInvalid] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setOtpInvalid(false)

    if (!email.trim()) {
      setError('Email is required')
      return
    }
    if (!otp.trim()) {
      setError('Enter the OTP code sent to your email')
      return
    }
    if (form.newPassword.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (form.newPassword !== form.confirmPassword) {
      setError('Password confirmation does not match')
      return
    }

    setLoading(true)
    try {
      await resetPasswordRequest({ email: email.trim(), otp: otp.trim(), newPassword: form.newPassword })
      setSucceeded(true)
    } catch (requestError) {
      if (requestError instanceof AuthApiError && (requestError.status === 400 || requestError.status === 401)) {
        setOtpInvalid(true)
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
                  {otpInvalid ? (
                    <div className="auth-form-message auth-form-message--error">
                      <p>
                        This OTP code is invalid or has expired. Please{' '}
                        <Link to="/my-account/lost-password">request a new one</Link>.
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
                      <p>Enter the OTP code sent to your email and choose a new password.</p>
                      <p className="woocommerce-form-row woocommerce-form-row--wide form-row form-row-wide">
                        <label htmlFor="reset-email">
                          Email&nbsp;<span className="required">*</span>
                        </label>
                        <input
                          className="woocommerce-Input woocommerce-Input--text input-text form-control"
                          type="email"
                          id="reset-email"
                          name="email"
                          autoComplete="email"
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                        />
                      </p>

                      <p className="woocommerce-form-row woocommerce-form-row--wide form-row form-row-wide">
                        <label htmlFor="reset-otp">
                          OTP code&nbsp;<span className="required">*</span>
                        </label>
                        <input
                          className="woocommerce-Input woocommerce-Input--text input-text form-control"
                          type="text"
                          id="reset-otp"
                          name="otp"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          value={otp}
                          onChange={(event) => setOtp(event.target.value)}
                        />
                      </p>

                      <p className="woocommerce-form-row woocommerce-form-row--first form-row form-row-first">
                        <label htmlFor="reset-password">
                          New password&nbsp;<span className="required">*</span>
                        </label>
                        <PasswordField
                          id="reset-password"
                          name="newPassword"
                          autoComplete="new-password"
                          value={form.newPassword}
                          onChange={(event) => setForm((current) => ({ ...current, newPassword: event.target.value }))}
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
                          disabled={loading}
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
