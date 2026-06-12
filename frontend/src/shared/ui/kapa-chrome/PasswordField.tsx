import { useState } from 'react'

export function PasswordField() {
  const [visible, setVisible] = useState(false)

  return (
    <span className="password-input">
      <input
        className="woocommerce-Input woocommerce-Input--text input-text form-control"
        type={visible ? 'text' : 'password'}
        name="password"
        id="password"
        autoComplete="current-password"
      />
      <button
        type="button"
        className="show-password-input"
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-describedby="password"
        onClick={() => setVisible((value) => !value)}
      >
        <i className={visible ? 'ri-eye-line' : 'ri-eye-off-line'} />
      </button>
    </span>
  )
}
