import { ReactNode } from 'react'

export default function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="text-slate-500 text-sm mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
