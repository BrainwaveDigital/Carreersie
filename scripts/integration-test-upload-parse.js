#!/usr/bin/env node
/*
  Integration test (lightweight):
  - Uses SUPABASE_SERVICE_ROLE_KEY to insert a parsed_document row and parsing_job
  - Uploads a small text file into storage
  - Calls the worker's runJob(docJob) function directly to process the job

  Requires env vars:
    SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

  Run: pnpm run test:integration
*/

const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

// load environment from repo root or apps/web/.env.local if present
require('./load-env')

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

async function main() {
  // create a tiny sample resume file
  const userId = 'integration-test-user'
  const filename = `integration-sample-${Date.now()}.txt`
  const content = `Jane Developer\nEmail: jane@example.com\nSkills: JavaScript, Node.js\nExperience:\n - Software Engineer at Acme (2019-2022)`
  const buffer = Buffer.from(content, 'utf8')
  const storagePath = `resumes/${userId}/${Date.now()}_${filename}`

  // upload to storage (create bucket if needed)
  let uploadErr = null
  try {
    const { error } = await supabase.storage.from('resumes').upload(storagePath, buffer, { contentType: 'text/plain' })
    if (error) uploadErr = error
  } catch (e) {
    uploadErr = e
  }
  if (uploadErr) {
    console.log('Upload error, trying to create bucket and retry', uploadErr)
    try {
      await supabase.storage.createBucket('resumes', { public: false })
      const { error: retryErr } = await supabase.storage.from('resumes').upload(storagePath, buffer, { contentType: 'text/plain' })
      if (retryErr) {
        console.error('Retry upload failed', retryErr)
        process.exit(1)
      }
    } catch (ce) {
      console.error('Bucket create/upload failed', ce)
      process.exit(1)
    }
  }

  // insert parsed_documents row
  const { data: parsedRows, error: pdErr } = await supabase.from('parsed_documents').insert([{
    user_id: userId,
    file_name: filename,
    storage_path: storagePath,
    content_type: 'text/plain',
    size_bytes: buffer.length,
    status: 'uploaded'
  }]).select()
  if (pdErr) {
    console.error('Failed to insert parsed_documents', pdErr)
    process.exit(1)
  }
  const parsedDocument = Array.isArray(parsedRows) ? parsedRows[0] : parsedRows

  // create parsing job
  const { data: jobRows, error: jobErr } = await supabase.from('parsing_jobs').insert([{ parsed_document_id: parsedDocument.id, status: 'pending' }]).select()
  if (jobErr) {
    console.error('Failed to create parsing job', jobErr)
    process.exit(1)
  }
  const job = Array.isArray(jobRows) ? jobRows[0] : jobRows

  console.log('Inserted parsedDocument', parsedDocument.id, 'job', job.id)

  // require the worker and run job directly
  const worker = require('./parsing-worker')
  if (!worker || !worker.runJob) {
    console.error('Worker runJob not available')
    process.exit(1)
  }

  console.log('Running worker.runJob for job id', job.id)
  try {
    await worker.runJob(job)
    console.log('Worker runJob completed')
  } catch (e) {
    console.error('Worker runJob failed', e)
    process.exit(1)
  }

  // fetch updated parsed_document
  const { data: updatedDocs, error: udErr } = await supabase.from('parsed_documents').select('*').eq('id', parsedDocument.id).limit(1)
  if (udErr) {
    console.error('Failed fetching updated parsed_document', udErr)
    process.exit(1)
  }
  console.log('Updated parsed document:', JSON.stringify(updatedDocs[0], null, 2))
}

main()
