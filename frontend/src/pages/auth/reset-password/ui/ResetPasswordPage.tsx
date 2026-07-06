import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
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
  const [message, setMessage] = useState('')

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
                  {message ? <div className="auth-form-message auth-form-message--info">{message}</div> : null}
                  <form
                    method="post"
                    className="woocommerce-ResetPassword reset_password"
                    onSubmit={(event) => {
                      event.preventDefault()
                      setMessage('Reset password chưa được tích hợp backend.')
                    }}
                  >
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
                      <button type="submit" className="woocommerce-Button button btn btn-primary order-btn" value="Reset password">
                        Reset Password
                      </button>
                    </p>
                  </form>
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
