#!/usr/bin/env node
/**
 * Run a single parsing job by id (or pick the oldest pending job if no id provided).
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/run-job.js <job-id>
 * or set JOB_ID env var.
 */
// load environment from repo root or apps/web/.env.local if present
require('./load-env')
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

async function pickJobByIdOrPending(jobId) {
  if (jobId) {
    const { data, error } = await supabase.from('parsing_jobs').select('*').eq('id', jobId).limit(1)
    if (error) throw error
    return Array.isArray(data) && data.length ? data[0] : null
  }
  const { data, error } = await supabase.from('parsing_jobs').select('*').eq('status', 'pending').order('created_at', { ascending: true }).limit(1)
  if (error) throw error
  return Array.isArray(data) && data.length ? data[0] : null
}

async function main() {
  const jobIdArg = process.argv[2] || process.env.JOB_ID
  const job = await pickJobByIdOrPending(jobIdArg)
  if (!job) {
    console.error('No job found (provide job id as first argument or set JOB_ID env)')
    process.exit(1)
  }
  console.log('Found job', job.id)

  const worker = require('./parsing-worker')
  if (!worker || !worker.runJob) {
    console.error('Worker module not available or does not export runJob')
    process.exit(1)
  }

  try {
    await worker.runJob(job)
    console.log('Job processed')
  } catch (err) {
    console.error('Error running job', err)
    process.exit(1)
  }
}

main().catch((err) => {
  // Improve logging for Supabase error objects
  try {
    if (err && typeof err === 'object') {
      console.error('Unhandled error in run-job:', JSON.stringify(err, Object.getOwnPropertyNames(err), 2))
    } else {
      console.error('Unhandled error in run-job:', err)
    }
  } catch (logErr) {
    console.error('Unhandled error in run-job (and failed to stringify):', err)
  }
  process.exit(1)
})
