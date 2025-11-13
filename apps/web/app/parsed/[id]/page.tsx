// This page intentionally runs on the client so it can access the browser's
// Supabase session (auth stored in cookies/localStorage). Server-side rendering
// attempted to read a session on the server and produced "Missing session token" errors
// because the server doesn't have access to the user's client session.
"use client"

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabaseClient } from '@/lib/supabase'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import ProcessParsedClient from './ProcessParsedClient'

export default function ParsedPage() {
  const params = useParams()
  const id = params?.id as string | undefined
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [doc, setDoc] = useState<any | null>(null)
  const [experiences, setExperiences] = useState<any[] | null>(null)
  const [education, setEducation] = useState<any[] | null>(null)
  const [skills, setSkills] = useState<any[] | null>(null)
  const [user, setUser] = useState<any | null>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      if (!id) {
        setError('Missing document id')
        setLoading(false)
        return
      }
      try {
        const { data: authData, error: authErr } = await supabaseClient.auth.getUser()
        if (authErr || !authData || !authData.user) {
          setError('Unauthorized. Please sign in.')
          setLoading(false)
          return
        }
        const usr = authData.user
        setUser(usr)
        // expose the supabase client to the browser console for debugging
        try {
          ;(window as any).__supabase = supabaseClient
          console.log('Supabase client exposed to window.__supabase for debugging')
        } catch (e) {
          // ignore in non-browser contexts
        }

        // fetch parsed document (defensive: catch thrown errors and log env presence)
        let docs: any = null
        let dErr: any = null
        try {
          const res = await supabaseClient.from('parsed_documents').select('*').eq('id', id).limit(1)
          docs = (res as any).data
          dErr = (res as any).error
        } catch (fetchErr) {
          console.error('Supabase client threw when fetching parsed document', fetchErr, { id, supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL })
          setError('Error loading parsed document.')
          setLoading(false)
          return
        }
        if (dErr) {
          // Log richer context to help diagnose empty/opaque error objects
          try {
            console.error('Error fetching parsed document', dErr, { docs, id, supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL })
          } catch (logErr) {
            console.error('Error fetching parsed document (failed to stringify context)', dErr, logErr)
          }
          setError('Error loading parsed document.')
          setLoading(false)
          return
        }
        if (!docs || docs.length === 0) {
          setError('Parsed document not found.')
          setLoading(false)
          return
        }
        const docRow = docs[0]

        // check owner or admin
        let isAllowed = false
        if (docRow.user_id === usr.id) isAllowed = true
        else {
          const { data: profiles, error: pErr } = await supabaseClient.from('profiles').select('is_admin').eq('user_id', usr.id).limit(1)
          if (!pErr && profiles && profiles.length && profiles[0] && profiles[0].is_admin) isAllowed = true
        }
        if (!isAllowed) {
          setError('Forbidden. You do not have access to this document.')
          setLoading(false)
          return
        }

        setDoc(docRow)

        // load normalized rows if profile_id set
        if (docRow.profile_id) {
          const [expRes, edRes, skRes] = await Promise.all([
            supabaseClient.from('experiences').select('*').eq('profile_id', docRow.profile_id).order('order_index', { ascending: true }),
            supabaseClient.from('education').select('*').eq('profile_id', docRow.profile_id).order('start_year', { ascending: false }),
            supabaseClient.from('skills').select('*').eq('profile_id', docRow.profile_id),
          ])
          setExperiences(expRes.data || [])
          setEducation(edRes.data || [])
          setSkills(skRes.data || [])
        }

        setLoading(false)
      } catch (e) {
        console.error('ParsedPage load error', e)
        if (mounted) {
          setError('Unexpected error loading page')
          setLoading(false)
        }
      }
    }
    load()
    return () => { mounted = false }
  }, [id])

  if (loading) return <div className="p-6">Loading...</div>
  if (error) return <div className="p-6">{error}</div>
  if (!doc) return <div className="p-6">Parsed document not found.</div>

  const parsed = doc.parsed_json || {}
  const llm = parsed.llm || null
  const extracted = parsed.extracted || null

  const skillList = (llm && Array.isArray(llm.skills)) ? llm.skills : (Array.isArray(skills) ? skills : [])
  const experiencesList = (llm && Array.isArray(llm.experiences)) ? llm.experiences : (Array.isArray(experiences) ? experiences : [])
  const educationList = (llm && Array.isArray(llm.education)) ? llm.education : (Array.isArray(education) ? education : [])

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

  const jsonString = JSON.stringify(parsed || { parsed_at: doc.parsed_at }, null, 2)
  const jsonDataHref = `data:application/json;charset=utf-8,${encodeURIComponent(jsonString)}`

  // client will link to admin download endpoint which validates server-side
  const resumeHref = `/api/admin/download-parsed/${doc.id}`

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
            {skillList.length ? skillList.map((s: any, i: number) => (
              <span key={i} className="px-2 py-1 rounded bg-slate-100 text-sm text-slate-800">{typeof s === 'string' ? s : s.skill || JSON.stringify(s)}</span>
            )) : <div className="text-sm text-muted-foreground">No skills parsed.</div>}
          </div>

          <h3 className="text-lg font-semibold">Experience</h3>
          <div className="space-y-4 mb-4">
            {experiencesList.length ? experiencesList.map((e: any, idx: number) => (
              <div key={idx} className="p-3 border rounded">
                <div className="font-semibold">{e.title || e.job_title || '—'} — <span className="font-medium">{e.company || e.employer || '—'}</span></div>
                <div className="text-sm text-muted-foreground">{fmtDate(e.start_date || e.start_year)} — {e.is_current ? 'Present' : fmtDate(e.end_date || e.end_year)}</div>
                {e.description && <p className="mt-2 text-sm">{e.description}</p>}
              </div>
            )) : <div className="text-sm text-muted-foreground">No experiences parsed.</div>}
          </div>

          <h3 className="text-lg font-semibold">Education</h3>
          <div className="space-y-3 mb-4">
            {educationList.length ? educationList.map((ed: any, i: number) => (
              <div key={i} className="p-3 border rounded">
                <div className="font-semibold">{ed.school || ed.institution || '—'}</div>
                <div className="text-sm text-muted-foreground">{ed.degree || ed.qualification || ''} • {ed.start_year || ''} - {ed.end_year || ''}</div>
                {ed.description && <p className="mt-2 text-sm">{ed.description}</p>}
              </div>
            )) : <div className="text-sm text-muted-foreground">No education parsed.</div>}
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
              <a href={resumeHref} target="_blank" rel="noopener noreferrer">Download Resume</a>
            </Button>
            <Button variant="ghost" asChild>
              <a href={jsonDataHref} download={`parsed-${doc.id}.json`}>Download JSON</a>
            </Button>
          </div>
        </CardContent>
      </Card>
      {/* Client-side control to save parsed data into normalized rows */}
      <ProcessParsedClient parsed={parsed} docId={doc.id} />
    </div>
  )
}
