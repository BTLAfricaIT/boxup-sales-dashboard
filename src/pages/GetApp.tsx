import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function GetApp() {
  const [status, setStatus] = useState<'loading' | 'redirecting' | 'missing' | 'error'>('loading')
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data, error } = await supabase.from('app_settings').select('value').eq('key', 'mobile_download_url').single()
        if (cancelled) return
        if (error || !data?.value) {
          setStatus('missing')
          return
        }
        setUrl(data.value)
        setStatus('redirecting')
        window.location.replace(data.value)
      } catch {
        if (!cancelled) setStatus('error')
      }
    })()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-sm text-center card">
        <h1 className="text-lg font-bold text-slate-900 mb-2">BoxUp Sales App</h1>
        {status === 'loading' && <p className="text-slate-500 text-sm">Loading download link…</p>}
        {status === 'redirecting' && (
          <p className="text-slate-500 text-sm">
            Redirecting you to the download… If nothing happens,{' '}
            <a href={url!} className="text-lime-600 underline">tap here</a>.
          </p>
        )}
        {status === 'missing' && (
          <p className="text-slate-500 text-sm">
            No download link has been set up yet. Please check back shortly, or contact your administrator.
          </p>
        )}
        {status === 'error' && (
          <p className="text-slate-500 text-sm">
            Something went wrong loading the download link. Please try again in a moment.
          </p>
        )}
      </div>
    </div>
  )
}
