export const receptionInputClass =
  'w-full border-0 bg-[#f5f3f3] px-4 py-3 text-[#1b1c1c] placeholder:text-[#6f6b6b] outline-none transition focus:ring-2 focus:ring-[#ba0013]/20'

export function Field({
  className = '',
  defaultValue,
  label,
  onChange,
  placeholder,
  type = 'text',
  value,
}: {
  className?: string
  defaultValue?: string
  label: string
  onChange?: (value: string) => void
  placeholder?: string
  type?: string
  value?: string
}) {
  return (
    <label className={`space-y-2 ${className}`}>
      <span className="block font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[#5f5e5e]">{label}</span>
      <input
        className={receptionInputClass}
        defaultValue={defaultValue}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        type={type}
        value={value}
      />
    </label>
  )
}

export function TextAreaField({
  dark = false,
  defaultValue,
  label,
  onChange,
  placeholder,
  rows = 3,
  value,
}: {
  dark?: boolean
  defaultValue?: string
  label: string
  onChange?: (value: string) => void
  placeholder: string
  rows?: number
  value?: string
}) {
  return (
    <label className="space-y-2">
      <span className={dark ? 'block font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[#e7bdb8]' : 'block font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[#5f5e5e]'}>
        {label}
      </span>
      <textarea
        className={
          dark
            ? 'w-full border-0 bg-white/10 px-4 py-4 text-white placeholder:text-white/35 outline-none transition focus:ring-2 focus:ring-[#ba0013]'
            : `${receptionInputClass} min-h-28 resize-none`
        }
        defaultValue={defaultValue}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        value={value}
      />
    </label>
  )
}

export function SelectField({
  label,
  onChange,
  value,
}: {
  label: string
  onChange?: (value: string) => void
  value?: string
}) {
  return (
    <label className="space-y-2">
      <span className="block font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[#5f5e5e]">{label}</span>
      <select className={`${receptionInputClass} appearance-none`} onChange={(event) => onChange?.(event.target.value)} value={value}>
        <option>2026</option>
        <option>2025</option>
        <option>2024</option>
        <option>2023</option>
        <option>2022</option>
        <option>2021</option>
      </select>
    </label>
  )
}
