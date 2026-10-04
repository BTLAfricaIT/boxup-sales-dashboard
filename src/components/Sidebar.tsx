import { TrendingUp, Store, Zap, Target, LayoutDashboard, LogOut, Settings } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export type Tab = 'overview' | 'sales' | 'visits' | 'activations' | 'targets' | 'settings'

const items: { id: Tab; label: string; icon: any }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'sales', label: 'Sales / Activations', icon: TrendingUp },
  { id: 'visits', label: 'Retail Visits', icon: Store },
  { id: 'activations', label: 'Promo Events', icon: Zap },
  { id: 'targets', label: 'Targets', icon: Target },
]

export default function Sidebar({ tab, onTabChange }: { tab: Tab; onTabChange: (t: Tab) => void }) {
  const { signOut, profile } = useAuth()
  const role = (profile as any)?.role ?? 'staff'
  const isManager = ['admin', 'manager'].includes(role)
  const visibleItems = isManager ? [...items, { id: 'settings' as Tab, label: 'Settings', icon: Settings }] : items

  return (
    <aside className="w-64 shrink-0 bg-slate-900 text-white min-h-screen flex flex-col">
      <div className="px-5 py-6 border-b border-slate-800">
        <p className="font-bold text-lg leading-tight">BoxUp Sales</p>
        <p className="text-xs text-slate-400">Dashboard</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {visibleItems.map(({ id, label, icon: Icon }) => {
          const active = tab === id
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active ? 'bg-lime-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon size={18} />
              {label}
            </button>
          )
        })}
      </nav>

      <div className="px-3 py-4 border-t border-slate-800">
        <div className="px-3 mb-2">
          <p className="text-sm font-medium truncate">{profile?.full_name || profile?.email}</p>
          <p className="text-xs text-slate-500 capitalize">{profile?.role === 'client' ? 'Project viewer' : (profile?.role || 'staff')}</p>
        </div>
        <button
          onClick={() => signOut()}
          className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <LogOut size={18} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
