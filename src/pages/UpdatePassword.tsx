import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function UpdatePassword() {
  const { clearRecovery } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }
    setError(null); setSaving(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    setSaving(false)
    if (err) { setError(err.message); return }
    clearRecovery()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-sm w-full card">
        <h1 className="text-lg font-bold text-slate-900 mb-1">Set a new password</h1>
        <p className="text-slate-500 text-sm mb-4">Choose a new password for your account.</p>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1">New password</label>
            <input type="password" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1">Confirm password</label>
            <input type="password" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={confirm} onChange={e => setConfirm(e.target.value)} />
          </div>
        </div>
        {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
        <button onClick={submit} disabled={saving} className="mt-4 w-full bg-lime-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-lime-700 disabled:opacity-50">{saving ? 'Saving…' : 'Set Password'}</button>
      </div>
    </div>
  )
}
