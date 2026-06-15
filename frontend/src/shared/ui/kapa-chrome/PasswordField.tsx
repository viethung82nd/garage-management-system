import { useState, type InputHTMLAttributes } from 'react'

type PasswordFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>

export function PasswordField({ className = '', id = 'password', ...props }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)

  return (
    <span className="password-input">
      <input
        className={`woocommerce-Input woocommerce-Input--text input-text form-control ${className}`.trim()}
        type={visible ? 'text' : 'password'}
        id={id}
        {...props}
      />
      <button
        type="button"
        className="show-password-input"
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-describedby={id}
        onClick={() => setVisible((value) => !value)}
      >
        <i className={visible ? 'ri-eye-line' : 'ri-eye-off-line'} />
      </button>
    </span>
  )
}
