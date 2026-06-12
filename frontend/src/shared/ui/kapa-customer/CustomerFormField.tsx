import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

type SharedProps = {
  id: string
  label: string
  required?: boolean
  hint?: string
}

export function CustomerFormField({
  id,
  label,
  required = false,
  hint,
  children,
}: SharedProps & {
  children: ReactNode
}) {
  return (
    <div className="customer-form-field">
      <label htmlFor={id}>
        {label}
        {required ? <span className="required">*</span> : null}
      </label>
      {children}
      {hint ? <p className="customer-form-field__hint">{hint}</p> : null}
    </div>
  )
}

export function CustomerInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`form-control customer-form-control ${props.className ?? ''}`.trim()} />
}

export function CustomerSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`form-control customer-form-control customer-form-select ${props.className ?? ''}`.trim()} />
}

export function CustomerTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`form-control customer-form-control customer-form-textarea ${props.className ?? ''}`.trim()} />
}
