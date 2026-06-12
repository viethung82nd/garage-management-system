import { Link } from 'react-router-dom'
import { usePageMeta } from '../../../../shared/lib/kapa-template'
import { KapaFooter, KapaNavbar, KapaPageBanner, KapaTopbar, PasswordField } from '../../../../shared/ui/kapa-chrome'

export default function MyAccountPage() {
  usePageMeta('My account – Kapa')

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

                  <h3 className="login-form-title">Login</h3>

                  <form className="woocommerce-form woocommerce-form-login login" method="post">
                    <p className="woocommerce-form-row woocommerce-form-row--wide form-row form-row-wide">
                      <label htmlFor="username">
                        Username or email address&nbsp;<span className="required">*</span>
                      </label>
                      <input
                        type="text"
                        className="woocommerce-Input woocommerce-Input--text input-text form-control"
                        name="username"
                        id="username"
                        autoComplete="username"
                        defaultValue=""
                      />
                    </p>

                    <p className="woocommerce-form-row woocommerce-form-row--wide form-row form-row-wide">
                      <label htmlFor="password">
                        Password&nbsp;<span className="required">*</span>
                      </label>
                      <PasswordField />
                    </p>

                    <p className="form-row">
                      <label className="woocommerce-form__label woocommerce-form__label-for-checkbox woocommerce-form-login__rememberme">
                        <input
                          className="woocommerce-form__input woocommerce-form__input-checkbox"
                          name="rememberme"
                          type="checkbox"
                          id="rememberme"
                          value="forever"
                        />{' '}
                        <span>Remember me</span>
                      </label>
                      <input type="hidden" id="woocommerce-login-nonce" name="woocommerce-login-nonce" value="75c9b17a3b" />
                      <input type="hidden" name="_wp_http_referer" value="index.html" />
                      <button type="submit" className="woocommerce-button button woocommerce-form-login__submit btn btn-primary order-btn" name="login" value="Log in">
                        Log in
                      </button>
                    </p>

                    <p className="woocommerce-LostPassword lost_password">
                      <Link to="/my-account/lost-password/">Lost your password?</Link>
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
