import type { ReactNode } from 'react'
import { Icon, type IconName } from '../../../shared/ui/base'

export function ReceptionPanel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section className={`relative border border-[#e4e2e2] bg-white p-8 shadow-sm ${className}`}>
      <div className="absolute bottom-0 left-0 top-0 w-1 bg-[#ba0013]" />
      {children}
    </section>
  )
}

export function PanelTitle({ icon, title, dark = false }: { icon: IconName; title: string; dark?: boolean }) {
  return (
    <div className="mb-8 flex items-center gap-3">
      <Icon className="text-[#ba0013]" name={icon} />
      <h2 className={dark ? 'text-2xl font-black text-white' : 'text-2xl font-black text-[#1b1c1c]'}>{title}</h2>
    </div>
  )
}
