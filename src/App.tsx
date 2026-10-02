import { useState } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Login from './pages/Login'
import SalesPage from './pages/Sales'
import SettingsPage from './pages/Settings'
import UpdatePassword from './pages/UpdatePassword'
import GetApp from './pages/GetApp'
import Sidebar, { Tab } from './components/Sidebar'

function Shell() {
  const { session, loading, profile, recovery, signOut } = useAuth()
  const [tab, setTab] = useState<Tab>('overview')

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (recovery) return <UpdatePassword />

  if (!session) return <Login />

  const role = (profile as any)?.role ?? 'staff'
  const isManager = ['admin', 'manager'].includes(role)
  const isAgent = role === 'agent'

  if (isAgent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-sm text-center card">
          <h1 className="text-lg font-bold text-slate-900 mb-2">Mobile app only</h1>
          <p className="text-slate-500 text-sm mb-4">
            This dashboard is for managers and admins. As a sales agent, please log your sales, visits, and promo events from the BoxUp Sales mobile app.
          </p>
          <button onClick={() => signOut()} className="btn-secondary w-full">Sign out</button>
        </div>
      </div>
    )
  }

  const effectiveTab = tab === 'settings' && !isManager ? 'overview' : tab

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar tab={effectiveTab} onTabChange={setTab} />
      <main className="flex-1 px-8 py-8 max-w-6xl">
        {effectiveTab === 'settings' ? <SettingsPage /> : <SalesPage tab={effectiveTab} />}
      </main>
    </div>
  )
}

export default function App() {
  if (window.location.pathname === '/get-app') return <GetApp />

  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  )
}
