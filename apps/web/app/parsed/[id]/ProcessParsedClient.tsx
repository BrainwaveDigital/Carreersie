"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseClient } from '@/lib/supabase'
import { ingestParsedAsUser } from '@/lib/parsedClient'
import Ajv from 'ajv'
import addFormats from 'ajv-formats'
// Import the schema dynamically at runtime to avoid TS module resolution issues in the client bundle
const loadSchema = async () => {
  try {
    const res = await fetch('/scripts/parsed-schema.json')
    return await res.json()
  } catch (e) {
    console.warn('Failed to load parsed schema from /scripts/parsed-schema.json', e)
    return null
  }
}

type Props = {
  parsed: any
  docId?: string
}

export default function ProcessParsedClient({ parsed, docId }: Props) {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  // local editable copy of the parsed payload so user can review/adjust before saving
  const [parsedState, setParsedState] = useState<any>(parsed ?? {})
  const router = useRouter()

  useEffect(() => {
    let mounted = true

    supabaseClient.auth.getSession().then((res: any) => {
      if (!mounted) return
      setSession(res?.data?.session ?? null)
      setLoading(false)
    }).catch(() => setLoading(false))

    const { data } = supabaseClient.auth.onAuthStateChange((_event: any, session: any) => {
      if (mounted) setSession(session)
    })

    return () => {
      mounted = false
      try { data?.subscription?.unsubscribe?.() } catch (e) { /* ignore */ }
    }
  }, [])

  // client-side validation of the parsed payload
  const [validationErrors, setValidationErrors] = useState<string[] | null>(null)
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const s = await loadSchema()
        if (!mounted || !s) return setValidationErrors(null)
        const ajv = new Ajv({ allErrors: true })
        addFormats(ajv)
        const validate = ajv.compile(s as any)
        const ok = validate(parsedState)
        if (!ok) {
          const msgs = (validate.errors || []).map((e: any) => `${e.instancePath || '/'} ${e.message}`)
          setValidationErrors(msgs)
        } else {
          setValidationErrors(null)
        }
      } catch (e) {
        console.warn('Validation failed to run', e)
        setValidationErrors(null)
      }
    })()
    return () => { mounted = false }
  }, [parsedState])

  // keep local parsedState in sync if prop changes
  useEffect(() => {
    setParsedState(parsed ?? {})
  }, [parsed])

  // toast
  const [toast, setToast] = useState<string | null>(null)


  const handleProcessData = async () => {
    if (!session) {
      setMessage('Cannot process: not authenticated')
      return
    }
    setProcessing(true)
    setMessage(null)
    try {
      // Use client-side ingest helper so RLS applies
      const res = await ingestParsedAsUser(parsedState)
      setMessage('Ingest succeeded')
      // Optionally navigate to profile CV page if created
      if (res?.profile_id) {
        router.push(`/profile/${res.profile_id}/cv`)
      }
    } catch (err: any) {
      // Log a detailed representation of the error (handles plain objects from Supabase)
      try {
        console.error('Process error', err)
        // If it's an Error instance, use its message. Otherwise stringify full properties.
        if (err instanceof Error) {
          setMessage(err.message)
        } else {
          const repr = JSON.stringify(err, Object.getOwnPropertyNames(err), 2)
          setMessage(repr || 'Processing failed')
          console.error('Process error (stringified):', repr)
        }
      } catch (stringifyErr) {
        // Fallback for circular structures
        console.error('Process error - failed to stringify', stringifyErr, err)
        setMessage('Processing failed')
      }
    } finally {
      setProcessing(false)
    }
  }

  if (loading) return <div>Checking authentication...</div>

  if (!session) return (
    <div className="p-4 bg-yellow-50 rounded">
      <div className="font-semibold">Access required</div>
      <div className="text-sm">You must be signed in to save parsed data.</div>
      <button className="mt-2 underline text-sm" onClick={() => router.push('/login')}>Sign in</button>
    </div>
  )

  // simple editors to let user review/update parsed payload before saving
  const updateProfileField = (field: string, value: any) => {
    setParsedState((p: any) => ({ ...p, profile: { ...(p?.profile ?? {}), [field]: value } }))
  }

  const updateExperience = (index: number, key: string, value: any) => {
    setParsedState((p: any) => {
      const ex = Array.isArray(p?.experiences) ? [...p.experiences] : []
      ex[index] = { ...(ex[index] || {}), [key]: value }
      return { ...p, experiences: ex }
    })
  }

  const addExperience = () => {
    setParsedState((p: any) => ({ ...p, experiences: [...(p.experiences || []), {}] }))
  }

  const removeExperience = (index: number) => {
    setParsedState((p: any) => ({ ...p, experiences: (p.experiences || []).filter((_: any, i: number) => i !== index) }))
  }

  const updateEducation = (index: number, key: string, value: any) => {
    setParsedState((p: any) => {
      const ed = Array.isArray(p?.education) ? [...p.education] : []
      ed[index] = { ...(ed[index] || {}), [key]: value }
      return { ...p, education: ed }
    })
  }

  const addEducation = () => setParsedState((p: any) => ({ ...p, education: [...(p.education || []), {}] }))
  const removeEducation = (index: number) => setParsedState((p: any) => ({ ...p, education: (p.education || []).filter((_: any, i: number) => i !== index) }))

  const updateSkill = (index: number, value: any) => setParsedState((p: any) => ({ ...p, skills: (p.skills || []).map((s: any, i: number) => i === index ? value : s) }))
  const addSkill = () => setParsedState((p: any) => ({ ...p, skills: [...(p.skills || []), ''] }))
  const removeSkill = (index: number) => setParsedState((p: any) => ({ ...p, skills: (p.skills || []).filter((_: any, i: number) => i !== index) }))

  return (
    <div className="p-4 space-y-4">
      <div className="mb-2">Signed in as <strong>{session.user?.email || session.user?.id}</strong></div>

      <section className="p-3 border rounded">
        <h3 className="font-semibold mb-2">Profile</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <label className="text-sm">Full name
            <input aria-label="Full name" placeholder="Full name" className="block w-full mt-1 p-2 border rounded" value={parsedState?.profile?.full_name || ''} onChange={e => updateProfileField('full_name', e.target.value)} />
          </label>
          <label className="text-sm">Display name
            <input aria-label="Display name" placeholder="Display name" className="block w-full mt-1 p-2 border rounded" value={parsedState?.profile?.display_name || ''} onChange={e => updateProfileField('display_name', e.target.value)} />
          </label>
          <label className="text-sm">Email
            <input aria-label="Email" placeholder="Email" className="block w-full mt-1 p-2 border rounded" value={parsedState?.profile?.email || ''} onChange={e => updateProfileField('email', e.target.value)} />
          </label>
          <label className="text-sm">Headline
            <input aria-label="Headline" placeholder="Headline" className="block w-full mt-1 p-2 border rounded" value={parsedState?.profile?.headline || ''} onChange={e => updateProfileField('headline', e.target.value)} />
          </label>
          <label className="text-sm col-span-1 md:col-span-2">Location
            <input aria-label="Location" placeholder="Location" className="block w-full mt-1 p-2 border rounded" value={parsedState?.profile?.location || ''} onChange={e => updateProfileField('location', e.target.value)} />
          </label>
        </div>
      </section>

      <section className="p-3 border rounded">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold">Experiences</h3>
          <button onClick={addExperience} className="text-sm underline">Add</button>
        </div>
        {(parsedState?.experiences || []).map((ex: any, idx: number) => (
          <div key={idx} className="mt-2 p-2 border rounded bg-gray-50">
            <div className="flex justify-between items-start">
              <div className="w-full">
                <input placeholder="Title" className="w-full p-2 border rounded mb-1" value={ex?.title || ''} onChange={e => updateExperience(idx, 'title', e.target.value)} />
                <input placeholder="Company" className="w-full p-2 border rounded mb-1" value={ex?.company || ''} onChange={e => updateExperience(idx, 'company', e.target.value)} />
                <div className="grid grid-cols-2 gap-2">
                  <input placeholder="Start date" className="p-2 border rounded" value={ex?.start_date || ''} onChange={e => updateExperience(idx, 'start_date', e.target.value)} />
                  <input placeholder="End date" className="p-2 border rounded" value={ex?.end_date || ''} onChange={e => updateExperience(idx, 'end_date', e.target.value)} />
                </div>
                <textarea placeholder="Description" className="w-full p-2 border rounded mt-2" value={ex?.description || ''} onChange={e => updateExperience(idx, 'description', e.target.value)} />
              </div>
              <div className="ml-2">
                <button className="text-sm text-red-600" onClick={() => removeExperience(idx)}>Remove</button>
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="p-3 border rounded">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold">Education</h3>
          <button onClick={addEducation} className="text-sm underline">Add</button>
        </div>
        {(parsedState?.education || []).map((ed: any, idx: number) => (
          <div key={idx} className="mt-2 p-2 border rounded bg-gray-50">
            <input placeholder="School" className="w-full p-2 border rounded mb-1" value={ed?.school || ''} onChange={e => updateEducation(idx, 'school', e.target.value)} />
            <input placeholder="Degree" className="w-full p-2 border rounded mb-1" value={ed?.degree || ''} onChange={e => updateEducation(idx, 'degree', e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="Start year" className="p-2 border rounded" value={ed?.start_year || ''} onChange={e => updateEducation(idx, 'start_year', e.target.value)} />
              <input placeholder="End year" className="p-2 border rounded" value={ed?.end_year || ''} onChange={e => updateEducation(idx, 'end_year', e.target.value)} />
            </div>
            <textarea placeholder="Description" className="w-full p-2 border rounded mt-2" value={ed?.description || ''} onChange={e => updateEducation(idx, 'description', e.target.value)} />
            <div className="text-right mt-1"><button className="text-sm text-red-600" onClick={() => removeEducation(idx)}>Remove</button></div>
          </div>
        ))}
      </section>

      <section className="p-3 border rounded">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold">Skills</h3>
          <button onClick={addSkill} className="text-sm underline">Add</button>
        </div>
        {(parsedState?.skills || []).map((sk: any, idx: number) => (
          <div key={idx} className="mt-2 flex gap-2">
            <input aria-label={`Skill ${idx + 1}`} placeholder="Skill" className="flex-1 p-2 border rounded" value={typeof sk === 'string' ? sk : (sk?.skill || JSON.stringify(sk))} onChange={e => updateSkill(idx, e.target.value)} />
            <button className="text-red-600" onClick={() => removeSkill(idx)}>Remove</button>
          </div>
        ))}
      </section>

      {validationErrors && (
        <div className="p-2 text-sm text-red-700">
          <div className="font-semibold">Validation errors</div>
          <ul className="list-disc pl-5">{validationErrors.map((m,i) => <li key={i}>{m}</li>)}</ul>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button disabled={processing} onClick={handleProcessData} className="px-3 py-2 bg-blue-600 text-white rounded">
          {processing ? 'Processing…' : 'Save parsed data to profile'}
        </button>
        <button onClick={() => setToast(JSON.stringify(parsedState, null, 2))} className="px-3 py-2 bg-gray-200 rounded">Show JSON</button>
        {message && <div className="mt-2 text-sm">{message}</div>}
      </div>

      {toast && (
        <pre className="mt-2 p-3 bg-black text-white overflow-auto max-h-80">{toast}</pre>
      )}
    </div>
  )
}
