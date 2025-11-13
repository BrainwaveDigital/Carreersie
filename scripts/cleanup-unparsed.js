#!/usr/bin/env node
// Lists parsed_documents that look "unparsed" and optionally deletes them and their storage files.
// Usage:
//  node scripts/cleanup-unparsed.js            # lists candidates (default older than 7 days)
//  node scripts/cleanup-unparsed.js --days 0   # list all unparsed regardless of age
//  node scripts/cleanup-unparsed.js --force    # delete candidates (after listing)
//  node scripts/cleanup-unparsed.js --force --days 30  # delete unparsed older than 30 days

require('./load-env')
const { createClient } = require('@supabase/supabase-js')
const argv = require('minimist')(process.argv.slice(2))

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

const days = parseInt(argv.days || argv.d || '7', 10)
const force = !!argv.force || !!argv.f

async function findCandidates() {
  // Consider unparsed documents as those with status != 'parsed' OR parsed_at IS NULL
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await supabase.from('parsed_documents').select('id,storage_path,file_name,status,parsed_at,created_at').or(`status.not.eq.parsed,parsed_at.is.null`).lt('created_at', cutoff).limit(1000)
  if (error) {
    console.error('Failed querying parsed_documents', error)
    process.exit(1)
  }
  return data || []
}

async function removeStorage(path) {
  try {
    const b = supabase.storage.from('resumes')
    const { error } = await b.remove([path.replace(/^resumes\//, '')])
    if (error) console.warn('Storage remove error for', path, error)
    else console.log('Removed storage object', path)
  } catch (e) {
    console.warn('Storage remove exception', e)
  }
}

async function main() {
  const cands = await findCandidates()
  if (!cands.length) {
    console.log('No unparsed candidates found (criteria: status != parsed OR parsed_at IS NULL older than', days, 'days)')
    return
  }
  console.log('Found', cands.length, 'unparsed candidates (showing up to 200):')
  cands.slice(0,200).forEach(c=>console.log(c.id, c.file_name, c.status, c.parsed_at, c.created_at))

  if (!force) {
    console.log('\nRun with --force to delete these documents and their storage objects')
    return
  }

  console.log('\nDeleting', cands.length, 'documents and storage objects...')
  for (const d of cands) {
    if (d.storage_path) await removeStorage(d.storage_path)
    const { error } = await supabase.from('parsed_documents').delete().eq('id', d.id)
    if (error) console.warn('Failed deleting parsed_document', d.id, error); else console.log('Deleted parsed_document', d.id)
  }
  console.log('Cleanup complete')
}

main().then(()=>process.exit(0)).catch(e=>{ console.error(e); process.exit(1) })
