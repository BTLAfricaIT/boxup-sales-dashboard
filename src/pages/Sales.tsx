import { useEffect, useState } from 'react'
import { TrendingUp, Store, Zap, Target, Plus, X, Download, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import PageHeader from '../components/PageHeader'

type Tab = 'overview' | 'sales' | 'visits' | 'activations' | 'targets'

const targetTypeToProjectType: Record<string, string> = { sales: 'sales', visits: 'visit', activations: 'event' }

function withComputedQty(next: any) {
  const days = daysBetween(next.period_start, next.period_end)
  if (next.daily_target && days > 0) {
    next.target_qty = String(Math.round(parseFloat(next.daily_target) * days))
  }
  return next
}

function daysBetween(start: string, end: string) {
  if (!start || !end) return 0
  const s = new Date(start + 'T00:00:00')
  const e = new Date(end + 'T00:00:00')
  const diff = Math.round((e.getTime() - s.getTime()) / 86400000) + 1
  return diff > 0 ? diff : 0
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}><Icon size={22} className="text-white" /></div>
      <div><p className="text-2xl font-bold text-slate-800">{value}</p><p className="text-sm text-slate-500">{label}</p></div>
    </div>
  )
}

export default function SalesPage({ tab }: { tab: Tab }) {
  const { profile } = useAuth()
  const role = (profile as any)?.role ?? 'staff'
  const isManager = ['admin', 'manager'].includes(role)
  const [sales, setSales] = useState<any[]>([])
  const [visits, setVisits] = useState<any[]>([])
  const [activations, setActivations] = useState<any[]>([])
  const [targets, setTargets] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [outlets, setOutlets] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [agents, setAgents] = useState<any[]>([])
  const [showSaleForm, setShowSaleForm] = useState(false)
  const [showVisitForm, setShowVisitForm] = useState(false)
  const [showActivationForm, setShowActivationForm] = useState(false)
  const [showTargetForm, setShowTargetForm] = useState(false)
  const [editingTargetId, setEditingTargetId] = useState<string | null>(null)
  const [saleForm, setSaleForm] = useState({ agent_id: '', product_id: '', outlet_id: '', project_id: '', quantity: '1', sale_type: 'activation', notes: '' })
  const [visitForm, setVisitForm] = useState({ agent_id: '', outlet_id: '', outlet_name: '', project_id: '', purpose: '', outcome: '', notes: '' })
  const [actForm, setActForm] = useState({ agent_id: '', event_name: '', location: '', region: '', product_id: '', project_id: '', participants: '0', units_distributed: '0', notes: '' })
  const [targetForm, setTargetForm] = useState({ user_id: '', product_id: '', project_id: '', target_type: 'sales', daily_target: '', target_qty: '10', period_start: '', period_end: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const today = new Date().toISOString().slice(0, 10)

  async function loadAll() {
    const [s, v, a, t, p, o, pr] = await Promise.all([
      supabase.from('btl_sales').select('*, btl_products(name), btl_outlets(name), btl_projects(name), profiles(full_name)').order('sale_date', { ascending: false }).limit(200),
      supabase.from('btl_visits').select('*, btl_outlets(name), btl_projects(name), profiles(full_name)').order('visit_date', { ascending: false }).limit(200),
      supabase.from('btl_activations').select('*, btl_products(name), btl_projects(name), profiles(full_name)').order('activation_date', { ascending: false }).limit(200),
      supabase.from('btl_targets').select('*, btl_products(name), btl_projects(name)').order('period_end', { ascending: false }),
      supabase.from('btl_products').select('id, name, category, project_id').eq('is_active', true).order('name'),
      supabase.from('btl_outlets').select('id, name, region, project_id').eq('is_active', true).order('name'),
      supabase.from('btl_projects').select('id, name, client, type, outlet_mode, is_active').eq('is_active', true).order('name'),
    ])
    if (s.data) setSales(s.data as any)
    if (v.data) setVisits(v.data as any)
    if (a.data) setActivations(a.data as any)
    if (t.data) setTargets(t.data as any)
    if (p.data) setProducts(p.data as any)
    if (o.data) setOutlets(o.data as any)
    if (pr.data) setProjects(pr.data as any)
  }

  useEffect(() => { supabase.from('profiles').select('id, full_name, email, is_active').eq('role', 'agent').order('full_name').then(({ data }) => { if (data) setAgents(data as any) }) }, [])
  useEffect(() => { loadAll() }, [tab])

  const activeAgents = agents.filter(a => a.is_active !== false)

  const thisMonth = today.slice(0, 7)
  const salesThisMonth = sales.filter(s => s.sale_date?.startsWith(thisMonth)).reduce((sum, s) => sum + s.quantity, 0)
  const visitsThisMonth = visits.filter(v => v.visit_date?.startsWith(thisMonth)).length
  const activationsThisMonth = activations.filter(a => a.activation_date?.startsWith(thisMonth)).length
  const totalParticipants = activations.filter(a => a.activation_date?.startsWith(thisMonth)).reduce((sum, a) => sum + (a.participants || 0), 0)
  const agentSales: Record<string, number> = {}
  sales.filter(s => s.sale_date?.startsWith(thisMonth)).forEach(s => { const n = s.profiles?.full_name || s.agent_id; agentSales[n] = (agentSales[n] || 0) + s.quantity })
  const leaderboard = Object.entries(agentSales).sort((a, b) => b[1] - a[1]).slice(0, 10)

  function computeAchieved(t: any) {
    const inRange = (d: string) => !!d && d >= t.period_start && d <= t.period_end
    if (t.target_type === 'sales') {
      return sales.filter(s => s.agent_id === t.user_id && inRange(s.sale_date) && (!t.project_id || s.project_id === t.project_id) && (!t.product_id || s.product_id === t.product_id)).reduce((sum, s) => sum + (s.quantity || 0), 0)
    }
    if (t.target_type === 'visits') {
      return visits.filter(v => v.agent_id === t.user_id && inRange(v.visit_date) && (!t.project_id || v.project_id === t.project_id)).length
    }
    return activations.filter(a => a.agent_id === t.user_id && inRange(a.activation_date) && (!t.project_id || a.project_id === t.project_id) && (!t.product_id || a.product_id === t.product_id)).length
  }

  function paceStatus(t: any, achieved: number) {
    const totalDays = daysBetween(t.period_start, t.period_end)
    if (!totalDays) return null
    const clampedToday = today < t.period_start ? t.period_start : (today > t.period_end ? t.period_end : today)
    const elapsedDays = Math.min(totalDays, daysBetween(t.period_start, clampedToday))
    if (today < t.period_start) return { label: 'Not started', className: 'bg-slate-100 text-slate-500' }
    const expected = t.daily_target ? Number(t.daily_target) * elapsedDays : (t.target_qty * elapsedDays / totalDays)
    if (achieved >= expected) return { label: 'On track', className: 'bg-emerald-50 text-emerald-700' }
    return { label: 'Behind', className: 'bg-red-50 text-red-700' }
  }

  const projectRollups = Object.values(targets.reduce((acc: Record<string, any>, t: any) => {
    if (!t.project_id) return acc
    const key = t.project_id
    if (!acc[key]) acc[key] = { project_id: key, name: t.btl_projects?.name || 'Unknown project', target: 0, achieved: 0 }
    acc[key].target += t.target_qty || 0
    acc[key].achieved += computeAchieved(t)
    return acc
  }, {}))

  function projectLeaderboard(p: any) {
    const byAgent: Record<string, number> = {}
    if (p.type === 'sales') {
      sales.filter(s => s.project_id === p.id && s.sale_date?.startsWith(thisMonth)).forEach(s => {
        const n = s.profiles?.full_name || s.agent_id
        byAgent[n] = (byAgent[n] || 0) + (s.quantity || 0)
      })
    } else if (p.type === 'visit') {
      visits.filter(v => v.project_id === p.id && v.visit_date?.startsWith(thisMonth)).forEach(v => {
        const n = v.profiles?.full_name || v.agent_id
        byAgent[n] = (byAgent[n] || 0) + 1
      })
    } else if (p.type === 'event') {
      activations.filter(a => a.project_id === p.id && a.activation_date?.startsWith(thisMonth)).forEach(a => {
        const n = a.profiles?.full_name || a.agent_id
        byAgent[n] = (byAgent[n] || 0) + 1
      })
    }
    return Object.entries(byAgent).sort((a, b) => b[1] - a[1]).slice(0, 5)
  }

  const projectMonthly = projects.filter((p: any) => p.is_active).map((p: any) => {
    let value = 0, label = ''
    if (p.type === 'sales') { value = sales.filter(s => s.project_id === p.id && s.sale_date?.startsWith(thisMonth)).reduce((sum, s) => sum + s.quantity, 0); label = 'units sold this month' }
    else if (p.type === 'visit') { value = visits.filter(v => v.project_id === p.id && v.visit_date?.startsWith(thisMonth)).length; label = 'visits this month' }
    else if (p.type === 'event') { value = activations.filter(a => a.project_id === p.id && a.activation_date?.startsWith(thisMonth)).length; label = 'events this month' }
    else { label = 'this month' }
    const rollup: any = (projectRollups as any[]).find(pr => pr.project_id === p.id)
    const leaderboard = projectLeaderboard(p)
    return { ...p, value, label, rollup, leaderboard }
  })

  async function saveSale() {
    if (!saleForm.agent_id) { setError('Agent is required'); return }
    setError(null); setSaving(true)
    const { error: err } = await supabase.from('btl_sales').insert({ agent_id: saleForm.agent_id, created_by: profile!.id, product_id: saleForm.product_id || null, outlet_id: saleForm.outlet_id || null, project_id: saleForm.project_id || null, quantity: parseInt(saleForm.quantity) || 1, sale_type: saleForm.sale_type, notes: saleForm.notes || null, sale_date: today })
    setSaving(false); if (err) { setError(err.message); return }
    setShowSaleForm(false); setSaleForm({ agent_id: '', product_id: '', outlet_id: '', project_id: '', quantity: '1', sale_type: 'activation', notes: '' }); loadAll()
  }

  async function saveVisit() {
    if (!visitForm.agent_id) { setError('Agent is required'); return }
    const typed = projects.find(p => p.id === visitForm.project_id)?.outlet_mode === 'agent'
    if (typed && !visitForm.outlet_name.trim()) { setError('Outlet name is required'); return }
    setError(null); setSaving(true)
    const { error: err } = await supabase.from('btl_visits').insert({ agent_id: visitForm.agent_id, created_by: profile!.id, outlet_id: typed ? null : (visitForm.outlet_id || null), outlet_name: typed ? visitForm.outlet_name.trim() : null, project_id: visitForm.project_id || null, purpose: visitForm.purpose || null, outcome: visitForm.outcome || null, notes: visitForm.notes || null, visit_date: today })
    setSaving(false); if (err) { setError(err.message); return }
    setShowVisitForm(false); setVisitForm({ agent_id: '', outlet_id: '', outlet_name: '', project_id: '', purpose: '', outcome: '', notes: '' }); loadAll()
  }

  async function saveActivation() {
    if (!actForm.event_name.trim()) { setError('Event name is required'); return }
    if (!actForm.agent_id) { setError('Agent is required'); return }
    setError(null); setSaving(true)
    const { error: err } = await supabase.from('btl_activations').insert({ agent_id: actForm.agent_id, created_by: profile!.id, event_name: actForm.event_name.trim(), location: actForm.location || null, region: actForm.region || null, product_id: actForm.product_id || null, project_id: actForm.project_id || null, participants: parseInt(actForm.participants) || 0, units_distributed: parseInt(actForm.units_distributed) || 0, notes: actForm.notes || null, activation_date: today })
    setSaving(false); if (err) { setError(err.message); return }
    setShowActivationForm(false); setActForm({ agent_id: '', event_name: '', location: '', region: '', product_id: '', project_id: '', participants: '0', units_distributed: '0', notes: '' }); loadAll()
  }

  async function saveTarget() {
    if (!targetForm.user_id || !targetForm.period_start || !targetForm.period_end) { setError('Agent, start and end date are required'); return }
    setError(null); setSaving(true)
    const payload = { user_id: targetForm.user_id, product_id: targetForm.product_id || null, project_id: targetForm.project_id || null, target_type: targetForm.target_type, daily_target: targetForm.daily_target ? parseFloat(targetForm.daily_target) : null, target_qty: parseInt(targetForm.target_qty) || 0, period_start: targetForm.period_start, period_end: targetForm.period_end, notes: targetForm.notes || null }
    const { error: err } = editingTargetId
      ? await supabase.from('btl_targets').update(payload).eq('id', editingTargetId)
      : await supabase.from('btl_targets').insert({ ...payload, created_by: profile!.id })
    setSaving(false); if (err) { setError(err.message); return }
    setShowTargetForm(false); setEditingTargetId(null); setTargetForm({ user_id: '', product_id: '', project_id: '', target_type: 'sales', daily_target: '', target_qty: '10', period_start: '', period_end: '', notes: '' }); loadAll()
  }

  function openEditTarget(t: any) {
    setError(null); setEditingTargetId(t.id)
    setTargetForm({
      user_id: t.user_id || '',
      product_id: t.product_id || '',
      project_id: t.project_id || '',
      target_type: t.target_type || 'sales',
      daily_target: t.daily_target != null ? String(t.daily_target) : '',
      target_qty: String(t.target_qty ?? '10'),
      period_start: t.period_start || '',
      period_end: t.period_end || '',
      notes: t.notes || '',
    })
    setShowTargetForm(true)
  }

  async function deleteTarget(t: any) {
    const label = `${agents.find(a => a.id === t.user_id)?.full_name || 'this agent'}'s ${t.target_type} target`
    if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return
    const { error: err } = await supabase.from('btl_targets').delete().eq('id', t.id)
    if (err) { setError(err.message); return }
    loadAll()
  }

  function exportCSV(rows: any[], filename: string) {
    if (!rows.length) return
    const keys = Object.keys(rows[0])
    const csv = [keys.join(','), ...rows.map(r => keys.map(k => JSON.stringify(r[k] ?? '')).join(','))].join('\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = filename; a.click()
  }

  const titles: Record<Tab, [string, string]> = {
    overview: ['Overview', 'Monthly performance at a glance'],
    sales: ['Sales / Activations', 'Log and review sales and activation records'],
    visits: ['Retail Visits', 'Log and review outlet visits'],
    activations: ['Promo Events', 'Log and review promo/activation events'],
    targets: ['Targets', 'Agent targets and progress'],
  }

  return (
    <div>
      <PageHeader title={titles[tab][0]} subtitle={titles[tab][1]} />

      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Sales this month" value={salesThisMonth} icon={TrendingUp} color="bg-lime-500" />
            <StatCard label="Visits this month" value={visitsThisMonth} icon={Store} color="bg-emerald-500" />
            <StatCard label="Promo events" value={activationsThisMonth} icon={Zap} color="bg-purple-500" />
            <StatCard label="Participants reached" value={totalParticipants} icon={Users} color="bg-orange-500" />
          </div>
          {projectMonthly.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-100 p-5">
              <h3 className="font-semibold text-slate-800 mb-4">Project Performance</h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {projectMonthly.map((p: any) => {
                  const pct = p.rollup && p.rollup.target > 0 ? Math.min(100, Math.round((p.rollup.achieved / p.rollup.target) * 100)) : null
                  return (
                    <div key={p.id} className="border border-slate-100 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-semibold text-slate-800 text-sm">{p.name}</p>
                        <span className="text-xs text-slate-400 capitalize">{p.type}</span>
                      </div>
                      <p className="text-2xl font-bold text-slate-800">{p.value}</p>
                      <p className="text-xs text-slate-500 mb-2">{p.label}</p>
                      {pct !== null ? (
                        <>
                          <div className="flex justify-between text-xs text-slate-500 mb-1">
                            <span>Target: {p.rollup.achieved} / {p.rollup.target}</span>
                            <span>{pct}%</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${pct >= 100 ? 'bg-emerald-500' : 'bg-orange-500'}`} style={{ width: `${pct}%` }} />
                          </div>
                        </>
                      ) : (
                        <p className="text-xs text-slate-400">No target set for this project</p>
                      )}
                      {p.leaderboard.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
                          {p.leaderboard.map(([name, qty]: [string, number], i: number) => (
                            <div key={name} className="flex items-center justify-between text-xs">
                              <span className="text-slate-600 truncate flex items-center gap-1.5">
                                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${i===0?'bg-yellow-400 text-white':i===1?'bg-slate-300 text-slate-700':i===2?'bg-orange-300 text-white':'bg-slate-100 text-slate-500'}`}>{i+1}</span>
                                {name}
                              </span>
                              <span className="font-semibold text-slate-700 shrink-0 ml-2">{qty}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          <div className="bg-white rounded-xl border border-slate-100 p-5">
            <h3 className="font-semibold text-slate-800 mb-4">Agent Leaderboard — {thisMonth}</h3>
            {leaderboard.length === 0 ? <p className="text-slate-400 text-sm text-center py-6">No sales recorded this month yet.</p> : (
              <div className="space-y-2">{leaderboard.map(([name, qty], i) => (
                <div key={name} className="flex items-center gap-3">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${i===0?'bg-yellow-400 text-white':i===1?'bg-slate-300 text-slate-700':i===2?'bg-orange-300 text-white':'bg-slate-100 text-slate-500'}`}>{i+1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between mb-1"><span className="text-sm font-medium text-slate-700 truncate">{name}</span><span className="text-sm font-bold text-lime-600 ml-2 shrink-0">{qty} units</span></div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-lime-500 rounded-full" style={{ width: `${Math.round((qty/(leaderboard[0][1]||1))*100)}%` }} /></div>
                  </div>
                </div>
              ))}</div>
            )}
          </div>
          <div className="bg-white rounded-xl border border-slate-100 p-5">
            <h3 className="font-semibold text-slate-800 mb-4">Recent Activity</h3>
            <div className="space-y-2">{[
              ...sales.slice(0,5).map(s => ({ date: s.sale_date, type: 'Sale', detail: `${s.quantity}× ${s.btl_products?.name||'—'}`, agent: s.profiles?.full_name, color: 'bg-lime-100 text-lime-700' })),
              ...visits.slice(0,3).map(v => ({ date: v.visit_date, type: 'Visit', detail: v.btl_outlets?.name||v.outlet_name||'—', agent: v.profiles?.full_name, color: 'bg-emerald-100 text-emerald-700' })),
              ...activations.slice(0,3).map(a => ({ date: a.activation_date, type: 'Promo', detail: a.event_name, agent: a.profiles?.full_name, color: 'bg-purple-100 text-purple-700' })),
            ].sort((a,b) => b.date?.localeCompare(a.date||'')||0).slice(0,12).map((item,i) => (
              <div key={i} className="flex items-center gap-3 text-sm py-1">
                <span className={`px-2 py-0.5 rounded-md text-xs font-semibold shrink-0 ${item.color}`}>{item.type}</span>
                <span className="text-slate-400 shrink-0">{item.date}</span>
                <span className="text-slate-700 truncate">{item.detail}</span>
                {item.agent && <span className="text-slate-400 text-xs ml-auto shrink-0">{item.agent}</span>}
              </div>
            ))}
            {!sales.length && !visits.length && !activations.length && <p className="text-slate-400 text-sm text-center py-6">No activity yet.</p>}
            </div>
          </div>
        </div>
      )}

      {tab === 'sales' && (
        <div>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="font-semibold text-slate-700">Sales & Activations ({sales.length})</h3>
            <div className="flex gap-2">
              <button onClick={() => exportCSV(sales, 'btl-sales.csv')} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50"><Download size={14} /> Export</button>
              {isManager && <button onClick={() => { setError(null); setShowSaleForm(true) }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-lime-600 text-white text-sm hover:bg-lime-700"><Plus size={14} /> Log Sale</button>}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100"><tr>{['Date','Agent','Product','Outlet','Project','Qty','Type','Notes'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-50">
                {sales.map(s => <tr key={s.id} className="hover:bg-slate-50"><td className="px-4 py-3 text-slate-500">{s.sale_date}</td><td className="px-4 py-3 font-medium">{s.profiles?.full_name||'—'}</td><td className="px-4 py-3">{s.btl_products?.name||'—'}</td><td className="px-4 py-3">{s.btl_outlets?.name||'—'}</td><td className="px-4 py-3 text-slate-500">{s.btl_projects?.name||'—'}</td><td className="px-4 py-3 font-bold text-lime-600">{s.quantity}</td><td className="px-4 py-3"><span className="px-2 py-0.5 bg-lime-50 text-lime-700 rounded text-xs capitalize">{s.sale_type}</span></td><td className="px-4 py-3 text-slate-400">{s.notes||'—'}</td></tr>)}
                {!sales.length && <tr><td colSpan={8} className="text-center text-slate-400 py-10">No sales yet.</td></tr>}
              </tbody>
            </table>
          </div>
          {showSaleForm && isManager && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-semibold">Log Sale / Activation</h2><button onClick={() => setShowSaleForm(false)}><X size={20} className="text-slate-400" /></button></div>
                <div className="space-y-3">
                  <div><label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1">Agent *</label><select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={saleForm.agent_id} onChange={e => setSaleForm(f => ({ ...f, agent_id: e.target.value }))}><option value="">Select agent…</option>{activeAgents.map(a => <option key={a.id} value={a.id}>{a.full_name||a.email}</option>)}</select></div>
                  <div><label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1">Project</label><select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={saleForm.project_id} onChange={e => setSaleForm(f => ({ ...f, project_id: e.target.value, product_id: '', outlet_id: '' }))}><option value="">Select project…</option>{projects.filter(p => p.type === 'sales').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                  <div><label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1">Product</label><select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={saleForm.product_id} onChange={e => setSaleForm(f => ({ ...f, product_id: e.target.value }))}><option value="">Select product…</option>{products.filter(p => !saleForm.project_id || !p.project_id || p.project_id === saleForm.project_id).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                  <div><label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1">Outlet</label><select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={saleForm.outlet_id} onChange={e => setSaleForm(f => ({ ...f, outlet_id: e.target.value }))}><option value="">Select outlet…</option>{outlets.filter(o => !saleForm.project_id || !o.project_id || o.project_id === saleForm.project_id).map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1">Quantity</label><input type="number" min="1" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={saleForm.quantity} onChange={e => setSaleForm(f => ({ ...f, quantity: e.target.value }))} /></div>
                    <div><label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1">Type</label><select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={saleForm.sale_type} onChange={e => setSaleForm(f => ({ ...f, sale_type: e.target.value }))}><option value="activation">Activation</option><option value="volume">Volume</option></select></div>
                  </div>
                  <div><label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1">Notes</label><textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" rows={2} value={saleForm.notes} onChange={e => setSaleForm(f => ({ ...f, notes: e.target.value }))} /></div>
                </div>
                {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
                <button onClick={saveSale} disabled={saving} className="mt-4 w-full bg-lime-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-lime-700 disabled:opacity-50">{saving ? 'Saving…' : 'Submit Sale'}</button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'visits' && (
        <div>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="font-semibold text-slate-700">Retail Visits ({visits.length})</h3>
            <div className="flex gap-2">
              <button onClick={() => exportCSV(visits, 'btl-visits.csv')} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50"><Download size={14} /> Export</button>
              {isManager && <button onClick={() => { setError(null); setShowVisitForm(true) }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700"><Plus size={14} /> Log Visit</button>}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100"><tr>{['Date','Agent','Outlet','Project','Purpose','Outcome','Notes'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-50">
                {visits.map(v => <tr key={v.id} className="hover:bg-slate-50"><td className="px-4 py-3 text-slate-500">{v.visit_date}</td><td className="px-4 py-3 font-medium">{v.profiles?.full_name||'—'}</td><td className="px-4 py-3">{v.btl_outlets?.name||v.outlet_name||'—'}</td><td className="px-4 py-3 text-slate-500">{v.btl_projects?.name||'—'}</td><td className="px-4 py-3">{v.purpose||'—'}</td><td className="px-4 py-3">{v.outcome||'—'}</td><td className="px-4 py-3 text-slate-400">{v.notes||'—'}</td></tr>)}
                {!visits.length && <tr><td colSpan={7} className="text-center text-slate-400 py-10">No visits yet.</td></tr>}
              </tbody>
            </table>
          </div>
          {showVisitForm && isManager && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-semibold">Log Retail Visit</h2><button onClick={() => setShowVisitForm(false)}><X size={20} className="text-slate-400" /></button></div>
                <div className="space-y-3">
                  <div><label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1">Agent *</label><select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={visitForm.agent_id} onChange={e => setVisitForm(f => ({ ...f, agent_id: e.target.value }))}><option value="">Select agent…</option>{activeAgents.map(a => <option key={a.id} value={a.id}>{a.full_name||a.email}</option>)}</select></div>
                  <div><label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1">Project</label><select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={visitForm.project_id} onChange={e => setVisitForm(f => ({ ...f, project_id: e.target.value, outlet_id: '', outlet_name: '' }))}><option value="">Select project…</option>{projects.filter(p => p.type === 'visit').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                  {projects.find(p => p.id === visitForm.project_id)?.outlet_mode === 'agent'
                    ? <div><label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1">Outlet name *</label><input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={visitForm.outlet_name} onChange={e => setVisitForm(f => ({ ...f, outlet_name: e.target.value }))} placeholder="Type the outlet visited" /></div>
                    : <div><label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1">Outlet</label><select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={visitForm.outlet_id} onChange={e => setVisitForm(f => ({ ...f, outlet_id: e.target.value }))}><option value="">Select outlet…</option>{outlets.filter(o => !visitForm.project_id || !o.project_id || o.project_id === visitForm.project_id).map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select></div>}
                  <div><label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1">Purpose</label><input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={visitForm.purpose} onChange={e => setVisitForm(f => ({ ...f, purpose: e.target.value }))} /></div>
                  <div><label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1">Outcome</label><input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={visitForm.outcome} onChange={e => setVisitForm(f => ({ ...f, outcome: e.target.value }))} /></div>
                  <div><label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1">Notes</label><textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" rows={2} value={visitForm.notes} onChange={e => setVisitForm(f => ({ ...f, notes: e.target.value }))} /></div>
                </div>
                {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
                <button onClick={saveVisit} disabled={saving} className="mt-4 w-full bg-emerald-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50">{saving ? 'Saving…' : 'Submit Visit'}</button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'activations' && (
        <div>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="font-semibold text-slate-700">Promo Events ({activations.length})</h3>
            <div className="flex gap-2">
              <button onClick={() => exportCSV(activations, 'btl-activations.csv')} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50"><Download size={14} /> Export</button>
              {isManager && <button onClick={() => { setError(null); setShowActivationForm(true) }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-purple-600 text-white text-sm hover:bg-purple-700"><Plus size={14} /> Log Event</button>}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100"><tr>{['Date','Agent','Event','Location','Project','Participants','Units Out','Notes'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-50">
                {activations.map(a => <tr key={a.id} className="hover:bg-slate-50"><td className="px-4 py-3 text-slate-500">{a.activation_date}</td><td className="px-4 py-3 font-medium">{a.profiles?.full_name||'—'}</td><td className="px-4 py-3 font-medium">{a.event_name}</td><td className="px-4 py-3">{[a.location,a.region].filter(Boolean).join(', ')||'—'}</td><td className="px-4 py-3 text-slate-500">{a.btl_projects?.name||'—'}</td><td className="px-4 py-3 text-purple-600 font-bold">{a.participants}</td><td className="px-4 py-3">{a.units_distributed}</td><td className="px-4 py-3 text-slate-400">{a.notes||'—'}</td></tr>)}
                {!activations.length && <tr><td colSpan={8} className="text-center text-slate-400 py-10">No promo events yet.</td></tr>}
              </tbody>
            </table>
          </div>
          {showActivationForm && isManager && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-semibold">Log Promo Event</h2><button onClick={() => setShowActivationForm(false)}><X size={20} className="text-slate-400" /></button></div>
                <div className="space-y-3">
                  <div><label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1">Agent *</label><select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={actForm.agent_id} onChange={e => setActForm(f => ({ ...f, agent_id: e.target.value }))}><option value="">Select agent…</option>{activeAgents.map(a => <option key={a.id} value={a.id}>{a.full_name||a.email}</option>)}</select></div>
                  <div><label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1">Event Name *</label><input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={actForm.event_name} onChange={e => setActForm(f => ({ ...f, event_name: e.target.value }))} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1">Location</label><input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={actForm.location} onChange={e => setActForm(f => ({ ...f, location: e.target.value }))} /></div>
                    <div><label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1">Region</label><input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={actForm.region} onChange={e => setActForm(f => ({ ...f, region: e.target.value }))} /></div>
                  </div>
                  <div><label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1">Project</label><select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={actForm.project_id} onChange={e => setActForm(f => ({ ...f, project_id: e.target.value, product_id: '' }))}><option value="">Select project…</option>{projects.filter(p => p.type === 'event').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                  <div><label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1">Product</label><select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={actForm.product_id} onChange={e => setActForm(f => ({ ...f, product_id: e.target.value }))}><option value="">Select product…</option>{products.filter(p => !actForm.project_id || !p.project_id || p.project_id === actForm.project_id).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1">Participants</label><input type="number" min="0" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={actForm.participants} onChange={e => setActForm(f => ({ ...f, participants: e.target.value }))} /></div>
                    <div><label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1">Units Out</label><input type="number" min="0" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={actForm.units_distributed} onChange={e => setActForm(f => ({ ...f, units_distributed: e.target.value }))} /></div>
                  </div>
                  <div><label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1">Notes</label><textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" rows={2} value={actForm.notes} onChange={e => setActForm(f => ({ ...f, notes: e.target.value }))} /></div>
                </div>
                {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
                <button onClick={saveActivation} disabled={saving} className="mt-4 w-full bg-purple-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-purple-700 disabled:opacity-50">{saving ? 'Saving…' : 'Submit Event'}</button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'targets' && (
        <div>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="font-semibold text-slate-700">Agent Targets ({targets.length})</h3>
            {isManager && <button onClick={() => { setError(null); setShowTargetForm(true) }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-orange-500 text-white text-sm hover:bg-orange-600"><Plus size={14} /> Set Target</button>}
          </div>

          {projectRollups.length > 0 && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {projectRollups.map((pr: any) => {
                const pct = pr.target > 0 ? Math.min(100, Math.round((pr.achieved / pr.target) * 100)) : 0
                return (
                  <div key={pr.project_id} className="bg-white rounded-xl border border-slate-100 p-4">
                    <p className="font-semibold text-slate-800 text-sm mb-2">{pr.name}</p>
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>{pr.achieved} / {pr.target}</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${pct >= 100 ? 'bg-emerald-500' : 'bg-orange-500'}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className="bg-white rounded-xl border border-slate-100 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100"><tr>{['Agent','Type','Project','Product','Daily','Target','Achieved','Progress','Pace','Period','Notes',''].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-50">
                {targets.map(t => {
                  const achieved = computeAchieved(t)
                  const pct = t.target_qty > 0 ? Math.min(100, Math.round((achieved / t.target_qty) * 100)) : 0
                  const pace = paceStatus(t, achieved)
                  return (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium">{agents.find(a => a.id === t.user_id)?.full_name||'—'}</td>
                      <td className="px-4 py-3 capitalize">{t.target_type}</td>
                      <td className="px-4 py-3 text-slate-500">{t.btl_projects?.name||'—'}</td>
                      <td className="px-4 py-3">{t.btl_products?.name||'Any'}</td>
                      <td className="px-4 py-3 text-slate-500">{t.daily_target || '—'}</td>
                      <td className="px-4 py-3 font-bold text-orange-600">{t.target_qty}</td>
                      <td className="px-4 py-3 font-semibold text-slate-700">{achieved}</td>
                      <td className="px-4 py-3">
                        <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${pct >= 100 ? 'bg-emerald-500' : 'bg-orange-500'}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-slate-400">{pct}%</span>
                      </td>
                      <td className="px-4 py-3">{pace && <span className={`px-2 py-0.5 rounded text-xs font-medium ${pace.className}`}>{pace.label}</span>}</td>
                      <td className="px-4 py-3 text-slate-500">{t.period_start} → {t.period_end}</td>
                      <td className="px-4 py-3 text-slate-400">{t.notes||'—'}</td>
                      {isManager && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <button onClick={() => openEditTarget(t)} className="text-xs text-slate-500 hover:text-slate-800">Edit</button>
                            <button onClick={() => deleteTarget(t)} className="text-xs text-red-500 hover:text-red-700">Delete</button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
                {!targets.length && <tr><td colSpan={12} className="text-center text-slate-400 py-10">No targets set yet.</td></tr>}
              </tbody>
            </table>
          </div>
          {showTargetForm && isManager && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-semibold">{editingTargetId ? 'Edit Target' : 'Set Agent Target'}</h2><button onClick={() => { setShowTargetForm(false); setEditingTargetId(null) }}><X size={20} className="text-slate-400" /></button></div>
                <div className="space-y-3">
                  <div><label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1">Agent *</label><select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={targetForm.user_id} onChange={e => setTargetForm(f => ({ ...f, user_id: e.target.value }))}><option value="">Select agent…</option>{activeAgents.map(a => <option key={a.id} value={a.id}>{a.full_name||a.email}</option>)}</select></div>
                  <div><label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1">Type</label><select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={targetForm.target_type} onChange={e => setTargetForm(f => ({ ...f, target_type: e.target.value, project_id: '', product_id: '' }))}><option value="sales">Sales</option><option value="visits">Visits</option><option value="activations">Activations</option></select></div>
                  <div><label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1">Project (optional)</label><select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={targetForm.project_id} onChange={e => setTargetForm(f => ({ ...f, project_id: e.target.value, product_id: '' }))}><option value="">Any project</option>{projects.filter(p => p.type === targetTypeToProjectType[targetForm.target_type]).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                  <div><label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1">Product (optional)</label><select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={targetForm.product_id} onChange={e => setTargetForm(f => ({ ...f, product_id: e.target.value }))}><option value="">Any product</option>{products.filter(p => !targetForm.project_id || !p.project_id || p.project_id === targetForm.project_id).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1">Period Start *</label><input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={targetForm.period_start} onChange={e => setTargetForm(f => withComputedQty({ ...f, period_start: e.target.value }))} /></div>
                    <div><label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1">Period End *</label><input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={targetForm.period_end} onChange={e => setTargetForm(f => withComputedQty({ ...f, period_end: e.target.value }))} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1">Daily Target</label>
                      <input type="number" min="0" step="0.1" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={targetForm.daily_target} onChange={e => setTargetForm(f => withComputedQty({ ...f, daily_target: e.target.value }))} placeholder="e.g. 5 per day" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1">Total Target Qty {targetForm.daily_target && daysBetween(targetForm.period_start, targetForm.period_end) > 0 ? '(auto)' : ''}</label>
                      <input type="number" min="1" disabled={!!targetForm.daily_target && daysBetween(targetForm.period_start, targetForm.period_end) > 0} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-500" value={targetForm.target_qty} onChange={e => setTargetForm(f => ({ ...f, target_qty: e.target.value }))} />
                    </div>
                  </div>
                  {targetForm.daily_target && daysBetween(targetForm.period_start, targetForm.period_end) > 0 && (
                    <p className="text-xs text-slate-400 -mt-1">{targetForm.daily_target}/day × {daysBetween(targetForm.period_start, targetForm.period_end)} days = {targetForm.target_qty} total</p>
                  )}
                  <div><label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1">Notes</label><textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" rows={2} value={targetForm.notes} onChange={e => setTargetForm(f => ({ ...f, notes: e.target.value }))} /></div>
                </div>
                {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
                <button onClick={saveTarget} disabled={saving} className="mt-4 w-full bg-orange-500 text-white rounded-lg py-2 text-sm font-semibold hover:bg-orange-600 disabled:opacity-50">{saving ? 'Saving…' : editingTargetId ? 'Save Changes' : 'Set Target'}</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
