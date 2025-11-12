import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    const sb = getSupabaseServer()
    const { data: docs, error: dErr } = await sb.from('parsed_documents').select('id, storage_path').eq('id', id).limit(1)
    if (dErr) return new NextResponse(JSON.stringify({ error: 'Failed to fetch parsed document', details: dErr }), { status: 500 })
    if (!docs || docs.length === 0) return new NextResponse(JSON.stringify({ error: 'Parsed document not found' }), { status: 404 })
  const doc = docs && docs.length ? docs[0] : null
  if (!doc) return new NextResponse(JSON.stringify({ error: 'Parsed document not found' }), { status: 404 })

  // storage_path format is 'resumes/...' (bucket/path)
  const parts = (doc.storage_path || '').split('/')
    const bucket = parts.shift()
    const path = parts.join('/')
    if (!bucket || !path) return new NextResponse(JSON.stringify({ error: 'Invalid storage_path' }), { status: 500 })

    const urlObj = new URL(req.url)
    const wantJson = urlObj.searchParams.get('json') === '1'

    if (wantJson) {
      // return parsed JSON for the document (server-side protected)
      const { data: fullDocs, error: fErr } = await sb.from('parsed_documents').select('*').eq('id', id).limit(1)
      if (fErr) return new NextResponse(JSON.stringify({ error: 'Failed to fetch parsed document', details: fErr }), { status: 500 })
      const fullDoc = fullDocs && fullDocs.length ? fullDocs[0] : null
      if (!fullDoc) return new NextResponse(JSON.stringify({ error: 'Parsed document not found' }), { status: 404 })
      return NextResponse.json({ parsed_document: fullDoc })
    }

    // create signed URL valid for 5 minutes
    const { data: urlData, error: urlErr } = await sb.storage.from(bucket).createSignedUrl(path, 60 * 5)
    if (urlErr) return new NextResponse(JSON.stringify({ error: 'Failed to create signed url', details: urlErr }), { status: 500 })

    // redirect to signed url
    return NextResponse.redirect(urlData.signedUrl)
  } catch (err) {
    return new NextResponse(JSON.stringify({ error: String(err) }), { status: 500 })
  }
}

export const runtime = 'nodejs'
