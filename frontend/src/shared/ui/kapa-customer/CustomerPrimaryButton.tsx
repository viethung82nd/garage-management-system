import type { ButtonHTMLAttributes, ReactNode } from 'react'

export function CustomerPrimaryButton({
  children,
  className = '',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
}) {
  return (
    <button type={type} className={`default-btn customer-primary-btn ${className}`.trim()} {...props}>
      {children}
      <span />
    </button>
  )
}
