"use client"

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseClient } from '@/lib/supabase'

export default function UploadClient() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files && e.target.files[0]
    setFile(f || null)
    setResult(null)
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!file) {
      setError('Please choose a file to upload')
      return
    }

    setLoading(true)
    try {
      const { data: { session } } = await supabaseClient.auth.getSession()
      const token = session?.access_token
      if (!token) {
        setError('Not authenticated. Please log in.')
        setLoading(false)
        return
      }

      const form = new FormData()
      form.append('file', file)

      const res = await fetch('/api/parsing', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      })

      const json = await res.json()
      if (!res.ok) {
        setError(json?.error || 'Upload failed')
      } else {
        setResult(json)
        // navigate to parsed CV viewer if parsed_document id is returned
        const parsedId = json?.parsed_document?.id
        if (parsedId) {
          // prefer client-side navigation to the parsed view
          router.push(`/parsed/${parsedId}`)
        }
      }
    } catch (err: any) {
      console.error(err)
      setError(err?.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gray-50">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow p-8">
        <h1 className="text-2xl font-bold mb-4">Upload your CV</h1>
        <p className="text-slate-600 mb-6">Upload a PDF/DOC/DOCX and we'll extract profile fields automatically. You can review and edit the results before saving.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="border border-dashed border-slate-200 rounded-md p-6 text-center">
            <label htmlFor="cv-file" className="block text-sm font-medium text-slate-700 mb-2">Select CV file</label>
            <input id="cv-file" name="cv-file" type="file" accept=".pdf,.doc,.docx" onChange={handleFile} className="mx-auto" />
            <p className="text-slate-500 mt-3">Choose a file to upload (max size depends on your Supabase storage limits)</p>
          </div>

          {error && <div className="text-red-600">{error}</div>}
          {result && (
            <div className="bg-green-50 border border-green-100 p-3 rounded">
              <div className="font-medium">Upload result</div>
              <div className="mt-2 flex gap-2">
                {result?.parsed_document?.id && (
                  <Link href={`/parsed/${result.parsed_document.id}`} className="bg-white border px-3 py-1 rounded text-sm">View parsed CV</Link>
                )}
                <Link href="/profile" className="bg-white border px-3 py-1 rounded text-sm">View Profile</Link>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md disabled:opacity-60" disabled={loading}>
              {loading ? 'Uploading…' : 'Upload & Parse'}
            </button>
            <Link href="/profile/choose" className="text-slate-600 px-4 py-2 rounded-md hover:text-slate-800">Cancel</Link>
          </div>
        </form>
      </div>
    </div>
  )
}
