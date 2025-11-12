#!/usr/bin/env node
// Helper: inspect parsed_documents and normalized rows for a parsing job
// Usage: node scripts/inspect-parsed.js <job-id>

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
  const jobId = process.argv[2]
  if (!jobId) {
    console.error('Usage: node scripts/inspect-parsed.js <job-id>')
    process.exit(1)
  }

  // fetch job
  const { data: jobs, error: jErr } = await supabase.from('parsing_jobs').select('*').eq('id', jobId).limit(1)
  if (jErr) {
    console.error('Error fetching parsing_jobs', jErr)
    process.exit(1)
  }
  if (!jobs || jobs.length === 0) {
    console.error('No parsing job found with id', jobId)
    process.exit(1)
  }
  const job = jobs[0]
  console.log('Job:', job)

  // fetch parsed_document
  const { data: docs, error: dErr } = await supabase.from('parsed_documents').select('*').eq('id', job.parsed_document_id).limit(1)
  if (dErr) {
    console.error('Error fetching parsed_documents', dErr)
    process.exit(1)
  }
  if (!docs || docs.length === 0) {
    console.error('No parsed_document found for job', job.id)
    process.exit(1)
  }
  const doc = docs[0]
  console.log('\nParsed document:')
  console.log(JSON.stringify(doc, null, 2))

  // if profile_id present, fetch normalized rows
  if (doc.profile_id) {
    const pid = doc.profile_id
    console.log('\nFetching normalized rows for profile_id', pid)
    const [{ data: experiences }, { data: education }, { data: skills }] = await Promise.all([
      supabase.from('experiences').select('*').eq('profile_id', pid).order('order_index', { ascending: true }),
      supabase.from('education').select('*').eq('profile_id', pid).order('start_year', { ascending: false }),
      supabase.from('skills').select('*').eq('profile_id', pid),
    ])

    console.log('\nExperiences:')
    console.log(JSON.stringify(experiences || [], null, 2))
    console.log('\nEducation:')
    console.log(JSON.stringify(education || [], null, 2))
    console.log('\nSkills:')
    console.log(JSON.stringify(skills || [], null, 2))
  } else {
    console.log('\nNo profile_id linked to parsed document; normalized rows likely not inserted.')
  }
}

main().catch((err) => {
  console.error('Error in inspect-parsed:', err)
  process.exit(1)
})
