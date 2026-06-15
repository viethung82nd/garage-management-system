import type { ReactNode } from 'react'
import { Icon, type IconName } from '../base'

export function GlassPanel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-[3rem] border border-white/10 bg-[rgba(29,32,34,0.6)] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-2xl sm:p-8 ${className}`}
    >
      {children}
    </section>
  )
}

export function PanelTitle({ icon, title }: { icon: IconName; title: string }) {
  return (
    <div className="flex items-center gap-4 border-b border-white/10 pb-5">
      <Icon className="text-[#00ffa3]" name={icon} />
      <h3 className="text-2xl font-black leading-tight text-white">{title}</h3>
    </div>
  )
}
