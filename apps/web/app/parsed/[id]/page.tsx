import React from 'react'
import { getSupabaseServer } from '@/lib/supabase'
import { headers } from 'next/headers'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type Props = { params: { id: string } }

export default async function ParsedPage({ params }: Props) {
  const id = params.id

  // Enforce owner-or-admin access: expect a Bearer <access_token> in the request
  // Validate token with Supabase auth endpoint and check profiles.is_admin or ownership.
  const hdrs = await headers()
  const auth = hdrs.get('authorization')
  if (!auth || !auth.startsWith('Bearer ')) {
    return <div className="p-6">Unauthorized. Missing Authorization header.</div>
  }
  const token = auth.split(' ')[1]

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) return <div className="p-6">Server configuration error: SUPABASE URL not set.</div>

  const userRes = await fetch(new URL('/auth/v1/user', supabaseUrl).toString(), {
    headers: { Authorization: `Bearer ${token}`, apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '' }
  })
  if (!userRes.ok) return <div className="p-6">Unauthorized. Invalid token.</div>
  const user = await userRes.json()
  const userId = user?.id
  if (!userId) return <div className="p-6">Unauthorized. Unable to determine user.</div>

  const supabase = getSupabaseServer()

  const { data: docs, error: dErr } = await supabase.from('parsed_documents').select('*').eq('id', id).limit(1)
  if (dErr) {
    console.error('Error fetching parsed document', dErr)
    return <div className="p-6">Error loading parsed document.</div>
  }
  if (!docs || docs.length === 0) return <div className="p-6">Parsed document not found.</div>
  const doc = docs[0]

  // authorization: owner or admin
  let isAllowed = false
  if (doc.user_id === userId) isAllowed = true
  else {
    const { data: profiles, error: pErr } = await supabase.from('profiles').select('is_admin').eq('user_id', userId).limit(1)
    if (!pErr && profiles && profiles.length && profiles[0] && profiles[0].is_admin) isAllowed = true
  }
  if (!isAllowed) return <div className="p-6">Forbidden. You do not have access to this document.</div>

  // Try to read normalized rows if profile_id available
  let experiences = null
  let education = null
  let skills = null
  if (doc.profile_id) {
    const [expRes, edRes, skRes] = await Promise.all([
      supabase.from('experiences').select('*').eq('profile_id', doc.profile_id).order('order_index', { ascending: true }),
      supabase.from('education').select('*').eq('profile_id', doc.profile_id).order('start_year', { ascending: false }),
      supabase.from('skills').select('*').eq('profile_id', doc.profile_id),
    ])
    experiences = expRes.data || []
    education = edRes.data || []
    skills = skRes.data || []
  }

  const parsed = doc.parsed_json || {}
  const llm = parsed.llm || null
  const extracted = parsed.extracted || null

  // Prepare download links server-side so client doesn't need to provide Authorization again.
  let resumeHref: string | null = null
  try {
    const parts = (doc.storage_path || '').split('/')
    const bucket = parts.shift()
    const path = parts.join('/')
    if (bucket && path) {
      const { data: urlData, error: urlErr } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 5)
      if (!urlErr && urlData && (urlData as any).signedUrl) resumeHref = (urlData as any).signedUrl
    }
  } catch (e) {
    console.error('Failed to create signed url for resume', e)
  }

  const jsonString = JSON.stringify(parsed || { parsed_at: doc.parsed_at }, null, 2)
  const jsonDataHref = `data:application/json;charset=utf-8,${encodeURIComponent(jsonString)}`

  const fmtDate = (d: string | undefined | null) => {
    try {
      if (!d) return ''
      const dt = new Date(d)
      return new Intl.DateTimeFormat('en-GB', { year: 'numeric', month: 'short' }).format(dt)
    } catch (e) {
      return String(d)
    }
  }

  const name = (llm && llm.name) || (extracted && extracted.name) || doc.user_display_name || '—'
  const email = (llm && llm.email) || (extracted && extracted.email) || '—'
  const phone = (llm && llm.phone) || (extracted && extracted.phone) || '—'

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{name}</CardTitle>
          <CardDescription>{doc.file_name || doc.storage_path}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-center mb-4">
            <div className="text-sm text-muted-foreground">Email: <span className="font-medium">{email}</span></div>
            <div className="text-sm text-muted-foreground">Phone: <span className="font-medium">{phone}</span></div>
          </div>

          <h3 className="text-lg font-semibold">Summary</h3>
          <p className="mb-4 text-sm text-muted-foreground">{llm && llm.summary ? llm.summary : parsed.raw_text_excerpt ? parsed.raw_text_excerpt.slice(0, 1000) : 'No summary available.'}</p>

          <h3 className="text-lg font-semibold">Skills</h3>
          <div className="mb-4 flex flex-wrap gap-2">
            {Array.isArray((llm && llm.skills) || skills) && (((llm && llm.skills) || skills).length ? ((llm && llm.skills) || skills).map((s: any, i: number) => (
              <span key={i} className="px-2 py-1 rounded bg-slate-100 text-sm text-slate-800">{typeof s === 'string' ? s : s.skill || JSON.stringify(s)}</span>
            )) : <div className="text-sm text-muted-foreground">No skills parsed.</div>)}
          </div>

          <h3 className="text-lg font-semibold">Experience</h3>
          <div className="space-y-4 mb-4">
            {Array.isArray((llm && llm.experiences) || experiences) && (((llm && llm.experiences) || experiences).length ? ((llm && llm.experiences) || experiences).map((e: any, idx: number) => (
              <div key={idx} className="p-3 border rounded">
                <div className="font-semibold">{e.title || e.job_title || '—'} — <span className="font-medium">{e.company || e.employer || '—'}</span></div>
                <div className="text-sm text-muted-foreground">{fmtDate(e.start_date || e.start_year)} — {e.is_current ? 'Present' : fmtDate(e.end_date || e.end_year)}</div>
                {e.description && <p className="mt-2 text-sm">{e.description}</p>}
              </div>
            )) : <div className="text-sm text-muted-foreground">No experiences parsed.</div>)}
          </div>

          <h3 className="text-lg font-semibold">Education</h3>
          <div className="space-y-3 mb-4">
            {Array.isArray((llm && llm.education) || education) && (((llm && llm.education) || education).length ? ((llm && llm.education) || education).map((ed: any, i: number) => (
              <div key={i} className="p-3 border rounded">
                <div className="font-semibold">{ed.school || ed.institution || '—'}</div>
                <div className="text-sm text-muted-foreground">{ed.degree || ed.qualification || ''} • {ed.start_year || ''} - {ed.end_year || ''}</div>
                {ed.description && <p className="mt-2 text-sm">{ed.description}</p>}
              </div>
            )) : <div className="text-sm text-muted-foreground">No education parsed.</div>)}
          </div>

          <h3 className="text-lg font-semibold">Raw / Metadata</h3>
          <div className="text-sm text-muted-foreground mb-2">Parsed at: {doc.parsed_at || parsed.parsed_at || '—'}</div>
          <div className="mb-4">
            <details>
              <summary className="cursor-pointer">LLM validation & parsed JSON</summary>
              <pre className="mt-2 max-h-96 overflow-auto text-xs bg-surface p-3 rounded">{JSON.stringify(parsed, null, 2)}</pre>
            </details>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <a href={resumeHref || `/api/admin/download-parsed/${doc.id}`} target="_blank" rel="noopener noreferrer">Download Resume</a>
            </Button>
            <Button variant="ghost" asChild>
              <a href={jsonDataHref} download={`parsed-${doc.id}.json`}>Download JSON</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
