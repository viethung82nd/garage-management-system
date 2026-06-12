export const receptionInputClass =
  'w-full rounded-full border border-transparent bg-[var(--color-surface-container-high)] px-4 py-3 text-base text-white placeholder:text-[#87909d] transition focus:border-[#00ffa3] focus:outline-none focus:ring-0'

export function Field({
  label,
  placeholder,
  type = 'text',
}: {
  label: string
  placeholder?: string
  type?: string
}) {
  return (
    <label className="space-y-2">
      <span className="block text-sm font-bold text-[var(--color-on-surface)]">{label}</span>
      <input className={receptionInputClass} placeholder={placeholder} type={type} />
    </label>
  )
}

export function TextAreaField({
  label,
  placeholder,
  rows = 3,
}: {
  label: string
  placeholder: string
  rows?: number
}) {
  return (
    <label className="space-y-2">
      <span className="block text-sm font-bold text-[var(--color-on-surface)]">{label}</span>
      <textarea
        className={`${receptionInputClass} min-h-20 resize-none rounded-[2rem]`}
        placeholder={placeholder}
        rows={rows}
      />
    </label>
  )
}

export function SelectField({ label }: { label: string }) {
  return (
    <label className="space-y-2">
      <span className="block text-sm font-bold text-[var(--color-on-surface)]">{label}</span>
      <select className={`${receptionInputClass} appearance-none`}>
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
