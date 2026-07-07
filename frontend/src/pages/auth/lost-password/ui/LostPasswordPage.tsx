import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AuthApiError, forgotPasswordRequest } from '../../../../shared/auth/api'
import { usePageMeta } from '../../../../shared/lib/kapa-template'
import { KapaFooter, KapaNavbar, KapaPageBanner, KapaTopbar } from '../../../../shared/ui/kapa-chrome'

export default function LostPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [submittedEmail, setSubmittedEmail] = useState('')
  const [devCode, setDevCode] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (!email.trim()) {
      setError('Please enter your username or email address')
      return
    }

    setLoading(true)
    try {
      const response = await forgotPasswordRequest({ email: email.trim() })
      setSubmittedEmail(email.trim())
      setDevCode(response.devCode ?? '')
    } catch (requestError) {
      setError(requestError instanceof AuthApiError ? requestError.message : 'Unable to request a password reset. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  usePageMeta(
    'Lost password – Kapa',
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
                  {error ? <div className="auth-form-message auth-form-message--error">{error}</div> : null}
                  {submittedEmail ? (
                    <div className="auth-form-message auth-form-message--success">
                      <p>
                        Check your email — if an account exists for <strong>{submittedEmail}</strong>, an OTP code has been sent.
                      </p>
                      {devCode ? (
                        <p>
                          Dev mode: your OTP code is <strong>{devCode}</strong>.
                        </p>
                      ) : null}
                      <p>
                        <Link to={`/my-account/reset-password?email=${encodeURIComponent(submittedEmail)}`}>
                          Enter your OTP code and choose a new password
                        </Link>
                      </p>
                    </div>
                  ) : (
                    <form method="post" className="woocommerce-ResetPassword lost_reset_password" onSubmit={handleSubmit}>
                      <p>
                        Lost your password? Please enter your email address. You will receive an OTP code to reset it.
                      </p>
                      <p className="woocommerce-form-row woocommerce-form-row--first form-row form-row-first">
                        <label htmlFor="user_login">Username or email</label>
                        <input
                          className="woocommerce-Input woocommerce-Input--text input-text form-control"
                          type="text"
                          name="user_login"
                          id="user_login"
                          autoComplete="username"
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                        />
                      </p>

                      <div className="clear" />

                      <p className="woocommerce-form-row form-row">
                        <input type="hidden" name="wc_reset_password" value="true" />
                        <button
                          type="submit"
                          className="woocommerce-Button button btn btn-primary order-btn"
                          value="Reset password"
                          disabled={loading}
                        >
                          {loading ? 'Sending...' : 'Reset Password'}
                        </button>
                      </p>

                      <input type="hidden" id="woocommerce-lost-password-nonce" name="woocommerce-lost-password-nonce" value="55a5dc894e" />
                      <input type="hidden" name="_wp_http_referer" value="index.html" />
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
