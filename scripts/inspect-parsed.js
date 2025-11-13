#!/usr/bin/env node
// Debug helper: inspect a parsed_documents row, its parsing_jobs, and re-run
// pdf text extraction for the stored resume file. Run locally with
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY set in your environment.
// Usage: node scripts/inspect-parsed.js <PARSED_DOCUMENT_ID>

require('./load-env')
const { createClient } = require('@supabase/supabase-js')
const pdfParse = require('pdf-parse')
const mammoth = require('mammoth')
const path = require('path')

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in environment or .env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

async function main() {
  const docId = process.argv[2] || process.env.DOC_ID
  if (!docId) {
    console.error('Usage: node scripts/inspect-parsed.js <PARSED_DOCUMENT_ID>')
    process.exit(1)
  }

  console.log('Inspecting parsed_document', docId)

  try {
    // Use maybeSingle to avoid an error when no rows are returned
    const { data: docData, error: docErr } = await supabase.from('parsed_documents').select('*').eq('id', docId).maybeSingle()
    if (docErr) {
      console.error('Error fetching parsed_documents:', docErr)
      return
    }
    if (!docData) {
      console.log('No parsed_documents row found for id', docId)
      return
    }

    console.log('parsed_documents:')
    console.log(' id:', docData.id)
    console.log(' user_id:', docData.user_id)
    console.log(' profile_id:', docData.profile_id)
    console.log(' file_name:', docData.file_name)
    console.log(' storage_path:', docData.storage_path)
    console.log(' status:', docData.status)
    console.log(' parsed_at:', docData.parsed_at)

    console.log('\nparsed_json keys:')
    if (docData.parsed_json) {
      console.log(Object.keys(docData.parsed_json))
      if (docData.parsed_json.extracted) {
        console.log('\nextracted summary:')
        console.log(' name:', docData.parsed_json.extracted.name)
        console.log(' email:', docData.parsed_json.extracted.email)
        console.log(' phone:', docData.parsed_json.extracted.phone)
        console.log(' linkedin:', docData.parsed_json.extracted.linkedin)
        console.log(' website:', docData.parsed_json.extracted.website)
      }
      if (docData.parsed_json.llm) console.log('\nLLM output keys:', Object.keys(docData.parsed_json.llm))
    } else {
      console.log(' (no parsed_json)')
    }

    // List parsing_jobs for this document
    const { data: jobs, error: jobsErr } = await supabase.from('parsing_jobs').select('*').eq('parsed_document_id', docId).order('created_at', { ascending: true })
    if (jobsErr) console.error('Error fetching parsing_jobs:', jobsErr)
    else console.log('\nparsing_jobs:', jobs && jobs.length ? jobs.map(j => ({ id: j.id, status: j.status, attempts: j.attempts, created_at: j.created_at, finished_at: j.finished_at })) : 'none')

    // Attempt to download and re-run extraction (pdf or docx) if storage_path present
    if (docData.storage_path) {
      try {
        console.log('\nAttempting to download file from storage at', docData.storage_path)
        const { data: fileStream, error: dlErr } = await supabase.storage.from('resumes').download(docData.storage_path)
        if (dlErr) {
          console.error('Download error:', dlErr)
        } else {
          const arrayBuffer = await fileStream.arrayBuffer()
          const buffer = Buffer.from(arrayBuffer)
          console.log('Downloaded bytes:', buffer.length)
          // Choose extraction based on file extension (from file_name or storage_path)
          const ext = (docData.file_name || docData.storage_path || '').toLowerCase()
          const parsedExt = path.extname(ext)
          if (parsedExt === '.docx' || parsedExt === '.doc') {
            try {
              const mammothRes = await mammoth.extractRawText({ buffer })
              const txt = mammothRes && mammothRes.value ? mammothRes.value : ''
              console.log('\nmammoth extracted text length:', txt.length)
              console.log('\nText snippet (first 2000 chars):\n', txt.slice(0, 2000))
            } catch (mErr) {
              console.warn('mammoth failed, falling back to raw text slice:', String(mErr))
              console.log('\nRaw slice:\n', buffer.toString('utf8', 0, Math.min(200000, buffer.length)).slice(0, 2000))
            }
          } else {
            // Try pdf-parse; if it fails we'll show a raw text slice
            try {
              const pdfRes = await pdfParse(buffer)
              console.log('\npdf-parse extracted text length:', (pdfRes && pdfRes.text) ? pdfRes.text.length : 0)
              if (pdfRes && pdfRes.text) console.log('\nText snippet (first 2000 chars):\n', pdfRes.text.slice(0, 2000))
            } catch (pErr) {
              console.warn('pdf-parse failed, falling back to raw text slice:', String(pErr))
              console.log('\nRaw slice:\n', buffer.toString('utf8', 0, Math.min(200000, buffer.length)).slice(0, 2000))
            }
          }
        }
      } catch (downErr) {
        console.error('Error while downloading or parsing file:', downErr)
      }
    } else {
      console.log('No storage_path present on parsed_documents row; cannot download file')
    }
  } catch (err) {
    console.error('Unexpected error in inspect script', err)
  }
}

main().then(() => process.exit(0)).catch(() => process.exit(1))
