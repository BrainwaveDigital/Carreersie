#!/usr/bin/env node
// Insert a parsing_jobs row for a parsed_document and run it immediately with
// the local worker runJob helper. Usage:
// SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/run-parse-doc.js <PARSED_DOCUMENT_ID>

require('./load-env')
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

async function main() {
  const docId = process.argv[2] || process.env.DOC_ID
  if (!docId) {
    console.error('Usage: node scripts/run-parse-doc.js <PARSED_DOCUMENT_ID>')
    process.exit(1)
  }

  // Print masked key info so user can confirm the script is using a service role key
  if (SERVICE_KEY) {
    const masked = SERVICE_KEY.length > 8 ? `${SERVICE_KEY.slice(0,6)}...${SERVICE_KEY.slice(-4)}` : SERVICE_KEY
    const looksLikePublishable = /publishable|anon|pk_|public/i.test(SERVICE_KEY)
    console.log('SUPABASE_SERVICE_ROLE_KEY present:', !!SERVICE_KEY, 'masked:', masked, looksLikePublishable ? '(looks like a publishable/anon key)' : '')
    if (looksLikePublishable) console.warn('Warning: the key appears to be a publishable/anon key. Use the SERVICE_ROLE key from Supabase Settings > API to bypass RLS for admin scripts.')
  }

  console.log('Creating parsing job for parsed_document', docId)
  const { data: inserted, error: insErr } = await supabase.from('parsing_jobs').insert([{ parsed_document_id: docId, status: 'pending', attempts: 0 }]).select().limit(1)
  if (insErr) {
    console.error('Failed creating parsing job', insErr)
    console.error('\nThis error usually means the client is authenticating with a non-service (publishable/anon) key, or the SERVICE_ROLE key is missing/wrong.\nPlease set SUPABASE_SERVICE_ROLE_KEY to the SERVICE_ROLE key from your Supabase project (Settings → API).\n')
    process.exit(1)
  }
  const job = Array.isArray(inserted) && inserted.length ? inserted[0] : inserted
  if (!job || !job.id) {
    console.error('Unexpected response inserting job', inserted)
    process.exit(1)
  }

  console.log('Inserted job', job.id, '— running it now (this will use SUPABASE_SERVICE_ROLE_KEY)')
  try {
    // run the job using the worker helper
    const worker = require('./parsing-worker')
    if (!worker || !worker.runJob) {
      console.error('parsing-worker does not export runJob; please run the poll worker instead')
      process.exit(1)
    }
    await worker.runJob({ id: job.id, parsed_document_id: docId, status: 'pending', attempts: 0 })
    console.log('runJob completed for', job.id)
  } catch (err) {
    console.error('Error running job locally', err)
    process.exit(1)
  }
}

main().then(()=>process.exit(0)).catch(e=>{ console.error(e); process.exit(1) })
