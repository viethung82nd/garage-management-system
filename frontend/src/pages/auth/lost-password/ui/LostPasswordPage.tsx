import { useState } from 'react'
import { usePageMeta } from '../../../../shared/lib/kapa-template'
import { KapaFooter, KapaNavbar, KapaPageBanner, KapaTopbar } from '../../../../shared/ui/kapa-chrome'

export default function LostPasswordPage() {
  const [message, setMessage] = useState('')

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
                  {message ? <div className="auth-form-message auth-form-message--info">{message}</div> : null}
                  <form
                    method="post"
                    className="woocommerce-ResetPassword lost_reset_password"
                    onSubmit={(event) => {
                      event.preventDefault()
                      setMessage('Password reset chưa được tích hợp backend.')
                    }}
                  >
                    <p>
                      Lost your password? Please enter your username or email address. You will receive a link to create a new password via email.
                    </p>
                    <p className="woocommerce-form-row woocommerce-form-row--first form-row form-row-first">
                      <label htmlFor="user_login">Username or email</label>
                      <input
                        className="woocommerce-Input woocommerce-Input--text input-text form-control"
                        type="text"
                        name="user_login"
                        id="user_login"
                        autoComplete="username"
                      />
                    </p>

                    <div className="clear" />

                    <p className="woocommerce-form-row form-row">
                      <input type="hidden" name="wc_reset_password" value="true" />
                      <button type="submit" className="woocommerce-Button button btn btn-primary order-btn" value="Reset password">
                        Reset Password
                      </button>
                    </p>

                    <input type="hidden" id="woocommerce-lost-password-nonce" name="woocommerce-lost-password-nonce" value="55a5dc894e" />
                    <input type="hidden" name="_wp_http_referer" value="index.html" />
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
