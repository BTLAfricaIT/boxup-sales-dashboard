import { useEffect, useState } from 'react'
import { Plus, X, Check, Ban, Pencil, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import PageHeader from '../components/PageHeader'

type Tab = 'products' | 'outlets' | 'projects' | 'staff' | 'agents'

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('products')
  const [products, setProducts] = useState<any[]>([])
  const [outlets, setOutlets] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [staff, setStaff] = useState<any[]>([])
  const [agents, setAgents] = useState<any[]>([])
  const [showProductForm, setShowProductForm] = useState(false)
  const [showOutletForm, setShowOutletForm] = useState(false)
  const [showProjectForm, setShowProjectForm] = useState(false)
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const [editingOutletId, setEditingOutletId] = useState<string | null>(null)
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)
  const [productForm, setProductForm] = useState({ name: '', category: '', project_id: '' })
  const [outletForm, setOutletForm] = useState({ name: '', region: '', project_id: '' })
  const [projectForm, setProjectForm] = useState({ name: '', client: '', description: '', start_date: '', end_date: '', type: '', outlet_mode: 'admin' })
  const [showStaffForm, setShowStaffForm] = useState(false)
  const [showAgentForm, setShowAgentForm] = useState(false)
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null)
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null)
  const [staffForm, setStaffForm] = useState({ full_name: '' })
  const [agentForm, setAgentForm] = useState({ full_name: '', phone: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [downloadUrl, setDownloadUrl] = useState('')
  const [downloadUrlSaved, setDownloadUrlSaved] = useState(false)
  const [savingDownloadUrl, setSavingDownloadUrl] = useState(false)

  async function loadAll() {
    const [p, o, pr, s, a, ds] = await Promise.all([
      supabase.from('btl_products').select('*').order('name'),
      supabase.from('btl_outlets').select('*').order('name'),
      supabase.from('btl_projects').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, full_name, email, role, is_active').neq('role', 'agent').order('full_name'),
      supabase.from('profiles').select('id, full_name, email, phone, created_at, project_id, is_active').eq('role', 'agent').order('created_at', { ascending: false }),
      supabase.from('app_settings').select('value').eq('key', 'mobile_download_url').single(),
    ])
    if (p.data) setProducts(p.data as any)
    if (o.data) setOutlets(o.data as any)
    if (pr.data) setProjects(pr.data as any)
    if (s.data) setStaff(s.data as any)
    if (a.data) setAgents(a.data as any)
    if (ds.data) setDownloadUrl(ds.data.value || '')
  }

  async function saveDownloadUrl() {
    setError(null); setSavingDownloadUrl(true)
    const { error: err } = await supabase.from('app_settings').update({ value: downloadUrl.trim(), updated_at: new Date().toISOString() }).eq('key', 'mobile_download_url')
    setSavingDownloadUrl(false)
    if (err) { setError(err.message); return }
    setDownloadUrlSaved(true)
    setTimeout(() => setDownloadUrlSaved(false), 3000)
  }

  function confirmDelete(label: string) {
    return window.confirm(`Delete "${label}"? This cannot be undone.`)
  }

  useEffect(() => { loadAll() }, [])

  async function saveProduct() {
    if (!productForm.name.trim()) { setError('Product name is required'); return }
    setError(null); setSaving(true)
    const payload = { name: productForm.name.trim(), category: productForm.category || null, project_id: productForm.project_id || null }
    const { error: err } = editingProductId
      ? await supabase.from('btl_products').update(payload).eq('id', editingProductId)
      : await supabase.from('btl_products').insert({ ...payload, is_active: true })
    setSaving(false); if (err) { setError(err.message); return }
    setShowProductForm(false); setEditingProductId(null); setProductForm({ name: '', category: '', project_id: '' }); loadAll()
  }

  function openEditProduct(p: any) {
    setError(null); setEditingProductId(p.id)
    setProductForm({ name: p.name || '', category: p.category || '', project_id: p.project_id || '' })
    setShowProductForm(true)
  }

  async function deleteProduct(p: any) {
    if (!confirmDelete(p.name)) return
    const { error: err } = await supabase.from('btl_products').delete().eq('id', p.id)
    if (err) { setError(err.message); return }
    loadAll()
  }

  async function toggleProduct(id: string, is_active: boolean) {
    await supabase.from('btl_products').update({ is_active: !is_active }).eq('id', id)
    loadAll()
  }

  async function changeProductProject(id: string, projectId: string) {
    await supabase.from('btl_products').update({ project_id: projectId || null }).eq('id', id)
    loadAll()
  }

  async function saveOutlet() {
    if (!outletForm.name.trim()) { setError('Outlet name is required'); return }
    setError(null); setSaving(true)
    const payload = { name: outletForm.name.trim(), region: outletForm.region || null, project_id: outletForm.project_id || null }
    const { error: err } = editingOutletId
      ? await supabase.from('btl_outlets').update(payload).eq('id', editingOutletId)
      : await supabase.from('btl_outlets').insert({ ...payload, is_active: true })
    setSaving(false); if (err) { setError(err.message); return }
    setShowOutletForm(false); setEditingOutletId(null); setOutletForm({ name: '', region: '', project_id: '' }); loadAll()
  }

  function openEditOutlet(o: any) {
    setError(null); setEditingOutletId(o.id)
    setOutletForm({ name: o.name || '', region: o.region || '', project_id: o.project_id || '' })
    setShowOutletForm(true)
  }

  async function deleteOutlet(o: any) {
    if (!confirmDelete(o.name)) return
    const { error: err } = await supabase.from('btl_outlets').delete().eq('id', o.id)
    if (err) { setError(err.message); return }
    loadAll()
  }

  async function toggleOutlet(id: string, is_active: boolean) {
    await supabase.from('btl_outlets').update({ is_active: !is_active }).eq('id', id)
    loadAll()
  }

  async function changeOutletProject(id: string, projectId: string) {
    await supabase.from('btl_outlets').update({ project_id: projectId || null }).eq('id', id)
    loadAll()
  }

  async function saveProject() {
    if (!projectForm.name.trim()) { setError('Project name is required'); return }
    if (!projectForm.type) { setError('Select what this project is for'); return }
    setError(null); setSaving(true)
    const payload = {
      name: projectForm.name.trim(),
      client: projectForm.client || null,
      description: projectForm.description || null,
      start_date: projectForm.start_date || null,
      end_date: projectForm.end_date || null,
      type: projectForm.type,
      outlet_mode: projectForm.type === 'visit' ? projectForm.outlet_mode : 'admin',
    }
    const { error: err } = editingProjectId
      ? await supabase.from('btl_projects').update(payload).eq('id', editingProjectId)
      : await supabase.from('btl_projects').insert({ ...payload, is_active: true })
    setSaving(false); if (err) { setError(err.message); return }
    setShowProjectForm(false); setEditingProjectId(null); setProjectForm({ name: '', client: '', description: '', start_date: '', end_date: '', type: '', outlet_mode: 'admin' }); loadAll()
  }

  function openEditProject(p: any) {
    setError(null); setEditingProjectId(p.id)
    setProjectForm({ name: p.name || '', client: p.client || '', description: p.description || '', start_date: p.start_date || '', end_date: p.end_date || '', type: p.type || '', outlet_mode: p.outlet_mode || 'admin' })
    setShowProjectForm(true)
  }

  async function deleteProject(p: any) {
    if (!confirmDelete(p.name)) return
    const { error: err } = await supabase.from('btl_projects').delete().eq('id', p.id)
    if (err) { setError(err.message); return }
    loadAll()
  }

  async function toggleProject(id: string, is_active: boolean) {
    await supabase.from('btl_projects').update({ is_active: !is_active }).eq('id', id)
    loadAll()
  }

  async function changeProjectType(id: string, type: string) {
    await supabase.from('btl_projects').update({ type }).eq('id', id)
    loadAll()
  }

  async function changeRole(id: string, role: string) {
    await supabase.from('profiles').update({ role }).eq('id', id)
    loadAll()
  }

  async function changeAgentProject(id: string, projectId: string) {
    await supabase.from('profiles').update({ project_id: projectId || null }).eq('id', id)
    loadAll()
  }

  function openEditStaff(a: any) {
    setError(null); setEditingStaffId(a.id)
    setStaffForm({ full_name: a.full_name || '' })
    setShowStaffForm(true)
  }

  async function saveStaff() {
    if (!editingStaffId) return
    setError(null); setSaving(true)
    const { error: err } = await supabase.from('profiles').update({ full_name: staffForm.full_name.trim() || null }).eq('id', editingStaffId)
    setSaving(false); if (err) { setError(err.message); return }
    setShowStaffForm(false); setEditingStaffId(null); loadAll()
  }

  async function toggleStaffActive(id: string, is_active: boolean) {
    await supabase.from('profiles').update({ is_active: !is_active }).eq('id', id)
    loadAll()
  }

  function openEditAgent(a: any) {
    setError(null); setEditingAgentId(a.id)
    setAgentForm({ full_name: a.full_name || '', phone: a.phone || '' })
    setShowAgentForm(true)
  }

  async function saveAgent() {
    if (!editingAgentId) return
    setError(null); setSaving(true)
    const { error: err } = await supabase.from('profiles').update({ full_name: agentForm.full_name.trim() || null, phone: agentForm.phone.trim() || null }).eq('id', editingAgentId)
    setSaving(false); if (err) { setError(err.message); return }
    setShowAgentForm(false); setEditingAgentId(null); loadAll()
  }

  async function toggleAgentActive(id: string, is_active: boolean) {
    await supabase.from('profiles').update({ is_active: !is_active }).eq('id', id)
    loadAll()
  }

  const [resetSentFor, setResetSentFor] = useState<string | null>(null)

  async function sendPasswordReset(email: string) {
    setError(null)
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
    if (err) { setError(err.message); return }
    setResetSentFor(email)
    setTimeout(() => setResetSentFor(null), 4000)
  }

  const tabClass = (t: Tab) => `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-white shadow text-lime-700' : 'text-slate-500 hover:text-slate-700'}`

  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage products, outlets, projects, and staff roles" />
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-6 w-fit flex-wrap">
        {([['products','Products'],['outlets','Outlets'],['projects','Projects'],['staff','Staff & Roles'],['agents','Agents']] as [Tab,string][]).map(([id,label]) => (
          <button key={id} className={tabClass(id)} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-100 p-5 mb-6">
        <h3 className="font-semibold text-slate-700 mb-1">Mobile App Download Link</h3>
        <p className="text-xs text-slate-400 mb-3">
          Share <span className="font-mono text-slate-600">{window.location.origin}/get-app</span> with agents — it's a permanent link that always redirects to whichever build URL you set below. Update the field each time you cut a new EAS build; no code changes needed.
        </p>
        <div className="flex gap-2 flex-wrap">
          <input
            className="flex-1 min-w-[260px] border border-slate-200 rounded-lg px-3 py-2 text-sm"
            placeholder="https://expo.dev/accounts/.../builds/..."
            value={downloadUrl}
            onChange={e => setDownloadUrl(e.target.value)}
          />
          <button onClick={saveDownloadUrl} disabled={savingDownloadUrl} className="px-4 py-2 rounded-lg bg-lime-600 text-white text-sm font-semibold hover:bg-lime-700 disabled:opacity-50">
            {savingDownloadUrl ? 'Saving…' : downloadUrlSaved ? 'Saved ✓' : 'Save Link'}
          </button>
        </div>
      </div>

      {tab === 'products' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-700">Products ({products.length})</h3>
            <button onClick={() => { setError(null); setShowProductForm(true) }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-lime-600 text-white text-sm hover:bg-lime-700"><Plus size={14} /> Add Product</button>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100"><tr>{['Name','Category','Project','Status',''].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-50">
                {products.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">{p.name}</td>
                    <td className="px-4 py-3 text-slate-500">{p.category || '—'}</td>
                    <td className="px-4 py-3">
                      <select className="border border-slate-200 rounded-lg px-2 py-1 text-sm" value={p.project_id || ''} onChange={e => changeProductProject(p.id, e.target.value)}>
                        <option value="">General (all projects)</option>
                        {projects.map((pr: any) => <option key={pr.id} value={pr.id}>{pr.name}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${p.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{p.is_active ? 'Active' : 'Inactive'}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button onClick={() => openEditProduct(p)} className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"><Pencil size={13} /> Edit</button>
                        <button onClick={() => toggleProduct(p.id, p.is_active)} className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1">
                          {p.is_active ? <><Ban size={13} /> Deactivate</> : <><Check size={13} /> Activate</>}
                        </button>
                        <button onClick={() => deleteProduct(p)} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"><Trash2 size={13} /> Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!products.length && <tr><td colSpan={5} className="text-center text-slate-400 py-10">No products yet.</td></tr>}
              </tbody>
            </table>
          </div>
          {showProductForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-semibold">{editingProductId ? 'Edit Product' : 'Add Product'}</h2><button onClick={() => { setShowProductForm(false); setEditingProductId(null) }}><X size={20} className="text-slate-400" /></button></div>
                <div className="space-y-3">
                  <div><label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1">Name *</label><input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={productForm.name} onChange={e => setProductForm(f => ({ ...f, name: e.target.value }))} /></div>
                  <div><label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1">Category</label><input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={productForm.category} onChange={e => setProductForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g. Beverages" /></div>
                  <div><label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1">Project</label><select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={productForm.project_id} onChange={e => setProductForm(f => ({ ...f, project_id: e.target.value }))}><option value="">General (all projects)</option>{projects.map((pr: any) => <option key={pr.id} value={pr.id}>{pr.name}</option>)}</select></div>
                </div>
                {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
                <button onClick={saveProduct} disabled={saving} className="mt-4 w-full bg-lime-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-lime-700 disabled:opacity-50">{saving ? 'Saving…' : editingProductId ? 'Save Changes' : 'Add Product'}</button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'outlets' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-700">Outlets ({outlets.length})</h3>
            <button onClick={() => { setError(null); setShowOutletForm(true) }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700"><Plus size={14} /> Add Outlet</button>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100"><tr>{['Name','Region','Project','Status',''].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-50">
                {outlets.map(o => (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">{o.name}</td>
                    <td className="px-4 py-3 text-slate-500">{o.region || '—'}</td>
                    <td className="px-4 py-3">
                      <select className="border border-slate-200 rounded-lg px-2 py-1 text-sm" value={o.project_id || ''} onChange={e => changeOutletProject(o.id, e.target.value)}>
                        <option value="">General (all projects)</option>
                        {projects.map((pr: any) => <option key={pr.id} value={pr.id}>{pr.name}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${o.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{o.is_active ? 'Active' : 'Inactive'}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button onClick={() => openEditOutlet(o)} className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"><Pencil size={13} /> Edit</button>
                        <button onClick={() => toggleOutlet(o.id, o.is_active)} className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1">
                          {o.is_active ? <><Ban size={13} /> Deactivate</> : <><Check size={13} /> Activate</>}
                        </button>
                        <button onClick={() => deleteOutlet(o)} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"><Trash2 size={13} /> Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!outlets.length && <tr><td colSpan={5} className="text-center text-slate-400 py-10">No outlets yet.</td></tr>}
              </tbody>
            </table>
          </div>
          {showOutletForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-semibold">{editingOutletId ? 'Edit Outlet' : 'Add Outlet'}</h2><button onClick={() => { setShowOutletForm(false); setEditingOutletId(null) }}><X size={20} className="text-slate-400" /></button></div>
                <div className="space-y-3">
                  <div><label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1">Name *</label><input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={outletForm.name} onChange={e => setOutletForm(f => ({ ...f, name: e.target.value }))} /></div>
                  <div><label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1">Region</label><input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={outletForm.region} onChange={e => setOutletForm(f => ({ ...f, region: e.target.value }))} placeholder="e.g. Accra" /></div>
                  <div><label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1">Project</label><select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={outletForm.project_id} onChange={e => setOutletForm(f => ({ ...f, project_id: e.target.value }))}><option value="">General (all projects)</option>{projects.map((pr: any) => <option key={pr.id} value={pr.id}>{pr.name}</option>)}</select></div>
                </div>
                {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
                <button onClick={saveOutlet} disabled={saving} className="mt-4 w-full bg-emerald-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50">{saving ? 'Saving…' : editingOutletId ? 'Save Changes' : 'Add Outlet'}</button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'projects' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-700">Projects ({projects.length})</h3>
            <button onClick={() => { setError(null); setShowProjectForm(true) }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-lime-600 text-white text-sm hover:bg-lime-700"><Plus size={14} /> Add Project</button>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100"><tr>{['Name','Type','Client','Dates','Status',''].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-50">
                {projects.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">{p.name}</td>
                    <td className="px-4 py-3">
                      <select className="border border-slate-200 rounded-lg px-2 py-1 text-sm" value={p.type || ''} onChange={e => changeProjectType(p.id, e.target.value)}>
                        <option value="" disabled>Select type…</option>
                        <option value="sales">Sales Activation</option>
                        <option value="visit">Outlet Visit</option>
                        <option value="event">Event</option>
                      </select>
                      {p.type === 'visit' && <div className="text-xs text-slate-400 mt-1">{p.outlet_mode === 'agent' ? 'Agents type outlet name' : 'Admin-defined outlets'}</div>}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{p.client || '—'}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {p.start_date ? new Date(p.start_date).toLocaleDateString() : '—'}
                      {p.end_date ? ` – ${new Date(p.end_date).toLocaleDateString()}` : ''}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${p.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{p.is_active ? 'Active' : 'Inactive'}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button onClick={() => openEditProject(p)} className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"><Pencil size={13} /> Edit</button>
                        <button onClick={() => toggleProject(p.id, p.is_active)} className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1">
                          {p.is_active ? <><Ban size={13} /> Deactivate</> : <><Check size={13} /> Activate</>}
                        </button>
                        <button onClick={() => deleteProject(p)} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"><Trash2 size={13} /> Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!projects.length && <tr><td colSpan={6} className="text-center text-slate-400 py-10">No projects yet.</td></tr>}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400 mt-3">Active projects appear as a selectable option when logging sales, visits, and promo events — both here and on the mobile app. Each project's type controls which kind of entry it can be used for.</p>
          {showProjectForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-semibold">{editingProjectId ? 'Edit Project' : 'Add Project'}</h2><button onClick={() => { setShowProjectForm(false); setEditingProjectId(null) }}><X size={20} className="text-slate-400" /></button></div>
                <div className="space-y-3">
                  <div><label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1">Name *</label><input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={projectForm.name} onChange={e => setProjectForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Guinness Activation Q4" /></div>
                  <div><label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1">Type *</label><select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={projectForm.type} onChange={e => setProjectForm(f => ({ ...f, type: e.target.value }))}><option value="">Select type…</option><option value="sales">Sales Activation</option><option value="visit">Outlet Visit</option><option value="event">Event</option></select></div>
                  {projectForm.type === 'visit' && <div><label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1">Outlets</label><select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={projectForm.outlet_mode} onChange={e => setProjectForm(f => ({ ...f, outlet_mode: e.target.value }))}><option value="admin">Defined by admin (agents pick from a list)</option><option value="agent">Agents type the outlet name</option></select></div>}
                  <div><label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1">Client</label><input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={projectForm.client} onChange={e => setProjectForm(f => ({ ...f, client: e.target.value }))} placeholder="e.g. Guinness Ghana" /></div>
                  <div><label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1">Description</label><textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" rows={2} value={projectForm.description} onChange={e => setProjectForm(f => ({ ...f, description: e.target.value }))} /></div>
                  <div className="flex gap-3">
                    <div className="flex-1"><label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1">Start date</label><input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={projectForm.start_date} onChange={e => setProjectForm(f => ({ ...f, start_date: e.target.value }))} /></div>
                    <div className="flex-1"><label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1">End date</label><input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={projectForm.end_date} onChange={e => setProjectForm(f => ({ ...f, end_date: e.target.value }))} /></div>
                  </div>
                </div>
                {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
                <button onClick={saveProject} disabled={saving} className="mt-4 w-full bg-lime-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-lime-700 disabled:opacity-50">{saving ? 'Saving…' : editingProjectId ? 'Save Changes' : 'Add Project'}</button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'staff' && (
        <div>
          <h3 className="font-semibold text-slate-700 mb-4">Staff & Roles ({staff.length})</h3>
          <div className="bg-white rounded-xl border border-slate-100 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100"><tr>{['Name','Email','Role','Status',''].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-50">
                {staff.map(a => (
                  <tr key={a.id} className={`hover:bg-slate-50 ${a.is_active === false ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3 font-medium">{a.full_name || '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{a.email}</td>
                    <td className="px-4 py-3">
                      <select className="border border-slate-200 rounded-lg px-2 py-1 text-sm capitalize" value={a.role || 'staff'} onChange={e => changeRole(a.id, e.target.value)}>
                        <option value="staff">Staff (view only)</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${a.is_active !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{a.is_active !== false ? 'Active' : 'Deactivated'}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button onClick={() => openEditStaff(a)} className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"><Pencil size={13} /> Edit</button>
                        <button onClick={() => sendPasswordReset(a.email)} className="text-xs text-lime-600 hover:text-lime-800 font-medium">
                          {resetSentFor === a.email ? 'Sent ✓' : 'Reset Password'}
                        </button>
                        <button onClick={() => toggleStaffActive(a.id, a.is_active !== false)} className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1">
                          {a.is_active !== false ? <><Ban size={13} /> Deactivate</> : <><Check size={13} /> Activate</>}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!staff.length && <tr><td colSpan={5} className="text-center text-slate-400 py-10">No staff found.</td></tr>}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400 mt-3">This lists people who sign in to the web dashboard (staff, managers, admins) to monitor and log results. Staff can view all data but can't log entries or make changes — only managers and admins can. Sales agents aren't listed here; they sign up and log their own sales from the mobile app. "Reset Password" emails the person a secure link to set a new password themselves. Deactivating blocks their sign-in but keeps their historical records.</p>
          {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
          {showStaffForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-semibold">Edit Staff</h2><button onClick={() => { setShowStaffForm(false); setEditingStaffId(null) }}><X size={20} className="text-slate-400" /></button></div>
                <div className="space-y-3">
                  <div><label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1">Full name</label><input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={staffForm.full_name} onChange={e => setStaffForm(f => ({ ...f, full_name: e.target.value }))} /></div>
                </div>
                {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
                <button onClick={saveStaff} disabled={saving} className="mt-4 w-full bg-lime-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-lime-700 disabled:opacity-50">{saving ? 'Saving…' : 'Save Changes'}</button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'agents' && (
        <div>
          <h3 className="font-semibold text-slate-700 mb-4">Agents ({agents.length})</h3>
          <div className="bg-white rounded-xl border border-slate-100 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100"><tr>{['Name','Email','Phone','Project','Joined','Status',''].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-50">
                {agents.map(a => (
                  <tr key={a.id} className={`hover:bg-slate-50 ${a.is_active === false ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3 font-medium">{a.full_name || '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{a.email}</td>
                    <td className="px-4 py-3 text-slate-500">{a.phone || '—'}</td>
                    <td className="px-4 py-3">
                      <select className="border border-slate-200 rounded-lg px-2 py-1 text-sm" value={a.project_id || ''} onChange={e => changeAgentProject(a.id, e.target.value)}>
                        <option value="">Unassigned</option>
                        {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}{!p.is_active ? ' (inactive)' : ''}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{a.created_at ? new Date(a.created_at).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${a.is_active !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{a.is_active !== false ? 'Active' : 'Deactivated'}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button onClick={() => openEditAgent(a)} className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"><Pencil size={13} /> Edit</button>
                        <button onClick={() => sendPasswordReset(a.email)} className="text-xs text-lime-600 hover:text-lime-800 font-medium">
                          {resetSentFor === a.email ? 'Sent ✓' : 'Reset Password'}
                        </button>
                        <button onClick={() => toggleAgentActive(a.id, a.is_active !== false)} className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1">
                          {a.is_active !== false ? <><Ban size={13} /> Deactivate</> : <><Check size={13} /> Activate</>}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!agents.length && <tr><td colSpan={7} className="text-center text-slate-400 py-10">No agents have signed up yet.</td></tr>}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400 mt-3">Sales agents sign up and log their own sales, visits, and promo events from the mobile app. Each agent works on one project at a time — they choose it when they sign up, can switch it from their Profile tab, or you can reassign it here. "Reset Password" emails the agent a secure link to set a new password themselves. Deactivating blocks their sign-in and removes them from agent pickers, but keeps their historical records.</p>
          {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
          {showAgentForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-semibold">Edit Agent</h2><button onClick={() => { setShowAgentForm(false); setEditingAgentId(null) }}><X size={20} className="text-slate-400" /></button></div>
                <div className="space-y-3">
                  <div><label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1">Full name</label><input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={agentForm.full_name} onChange={e => setAgentForm(f => ({ ...f, full_name: e.target.value }))} /></div>
                  <div><label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1">Phone</label><input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={agentForm.phone} onChange={e => setAgentForm(f => ({ ...f, phone: e.target.value }))} /></div>
                </div>
                {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
                <button onClick={saveAgent} disabled={saving} className="mt-4 w-full bg-lime-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-lime-700 disabled:opacity-50">{saving ? 'Saving…' : 'Save Changes'}</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
