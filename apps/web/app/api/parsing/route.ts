import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase'

// POST /api/parsing
export async function POST(req: Request) {
  try {
    const auth = req.headers.get('authorization')
    if (!auth || !auth.startsWith('Bearer ')) {
      return new NextResponse(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401 })
    }
    const token = auth.split(' ')[1]

    // validate token by asking Supabase auth endpoint
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl) return new NextResponse(JSON.stringify({ error: 'SUPABASE URL not configured' }), { status: 500 })

    const userRes = await fetch(new URL('/auth/v1/user', supabaseUrl).toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        // include anon key as apikey header to satisfy Supabase auth endpoint requirements
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
      }
    })
    if (!userRes.ok) return new NextResponse(JSON.stringify({ error: 'Invalid token' }), { status: 401 })
    const user = await userRes.json()
    const userId = user?.id
    if (!userId) return new NextResponse(JSON.stringify({ error: 'Unable to determine user id' }), { status: 401 })

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return new NextResponse(JSON.stringify({ error: 'No file provided (field name: file)' }), { status: 400 })

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const filename = (file as any).name || `upload-${Date.now()}`

    const sb = getSupabaseServer()

    // Upload to storage bucket 'resumes'. Ensure the bucket exists in your Supabase project.
    const storagePath = `resumes/${userId}/${Date.now()}_${filename}`
    // Attempt upload; on failure, try to create the bucket (if missing) and retry once.
    let uploadResult
    try {
      uploadResult = await sb.storage.from('resumes').upload(storagePath, buffer, {
        contentType: (file as any).type || 'application/octet-stream',
        upsert: false,
      })
    } catch (err) {
      console.error('Upload threw error:', err)
      uploadResult = { data: null, error: err }
    }

    let uploadError = uploadResult?.error
    if (uploadError) {
      console.error('Initial storage upload error:', uploadError)
      // If bucket is missing or not found, try to create it (server-only action)
      const shouldTryCreate = String(uploadError.message || '').toLowerCase().includes('not found') || uploadError?.status === 404
      if (shouldTryCreate) {
        try {
          console.log('Attempting to create missing storage bucket: resumes')
          const { data: createData, error: createErr } = await sb.storage.createBucket('resumes', { public: false })
          if (createErr) {
            console.error('Failed creating bucket resumes:', createErr)
          } else {
            console.log('Bucket created:', createData)
            // retry upload once
            const { error: retryErr } = await sb.storage.from('resumes').upload(storagePath, buffer, {
              contentType: (file as any).type || 'application/octet-stream',
              upsert: false,
            })
            if (retryErr) {
              console.error('Retry upload failed:', retryErr)
              return new NextResponse(JSON.stringify({ error: 'Storage upload failed after bucket create', details: retryErr }), { status: 500 })
            }
          }
        } catch (createBucketErr) {
          console.error('Error while attempting to create bucket and retry upload:', createBucketErr)
          return new NextResponse(JSON.stringify({ error: 'Storage upload failed', details: uploadError }), { status: 500 })
        }
      } else {
        return new NextResponse(JSON.stringify({ error: 'Storage upload failed', details: uploadError }), { status: 500 })
      }
    }

    // Insert parsed_documents row
    const { data: parsedRows, error: pdErr } = await sb
      .from('parsed_documents')
      .insert([{
        user_id: userId,
        file_name: filename,
        storage_path: storagePath,
        content_type: (file as any).type || null,
        size_bytes: buffer.length,
        status: 'uploaded'
      }])
      .select()

    if (pdErr) return new NextResponse(JSON.stringify({ error: 'Failed to create parsed_documents row', details: pdErr }), { status: 500 })
    const parsedDocument = Array.isArray(parsedRows) ? parsedRows[0] : parsedRows

    // Create parsing job
    const { data: jobRows, error: jobErr } = await sb
      .from('parsing_jobs')
      .insert([{ parsed_document_id: parsedDocument.id, status: 'pending' }])
      .select()
    if (jobErr) return new NextResponse(JSON.stringify({ error: 'Failed to create parsing_jobs row', details: jobErr }), { status: 500 })
    const parsingJob = Array.isArray(jobRows) ? jobRows[0] : jobRows

    // Optional synchronous parse stub for local testing
    if (process.env.PARSE_SYNC === '1') {
      const stubJson = { parsed: true, extracted_text: 'stubbed parse - run parser worker for real parsing' }
      await sb
        .from('parsed_documents')
        .update({ parsed_json: stubJson, status: 'parsed', parsed_at: new Date().toISOString() })
        .eq('id', parsedDocument.id)

      await sb
        .from('parsing_jobs')
        .update({ status: 'finished', finished_at: new Date().toISOString() })
        .eq('id', parsingJob.id)
    }

    return new NextResponse(JSON.stringify({ parsed_document: parsedDocument, parsing_job: parsingJob }), { status: 201 })
  } catch (err) {
    console.error(err)
    return new NextResponse(JSON.stringify({ error: 'Internal error', details: String(err) }), { status: 500 })
  }
}

export const runtime = 'nodejs'
