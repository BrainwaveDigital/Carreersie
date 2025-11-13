#!/usr/bin/env node
// Backfill top-level llm column from parsed_json.llm for parsed_documents
require('./load-env')
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

async function main() {
  console.log('Querying parsed_documents with parsed_json.llm present and llm IS NULL...')
  const { data, error } = await supabase.rpc('pg_catalog.pg_sleep', { seconds: 0 })
  // Use a direct SQL query via RPC to get rows (PostgREST doesn't allow json path in filters easily)
  const sql = `SELECT id, parsed_json->'llm' AS llm FROM parsed_documents WHERE (parsed_json IS NOT NULL AND parsed_json ? 'llm') AND llm IS NULL LIMIT 1000`;
  try {
    const res = await supabase.rpc('sql', { q: sql })
    // Some Supabase setups won't have the sql rpc; fall back to select * and filter client-side
  } catch (e) {
    // fallback path: select rows and filter
    const { data: rows, error: selErr } = await supabase.from('parsed_documents').select('id, parsed_json').limit(1000)
    if (selErr) {
      console.error('Failed to query parsed_documents', selErr)
      process.exit(1)
    }
    const candidates = rows.filter(r => r.parsed_json && r.parsed_json.llm && !r.llm)
    console.log('Found', candidates.length, 'candidates to backfill (showing up to 20)')
    for (const r of candidates.slice(0, 20)) {
      const payload = { llm: r.parsed_json.llm }
      const { error: upErr } = await supabase.from('parsed_documents').update(payload).eq('id', r.id)
      if (upErr) console.error('Failed updating', r.id, upErr); else console.log('Backfilled', r.id)
    }
    console.log('Backfill complete (batch)')
    return
  }
}

main().then(()=>process.exit(0)).catch(e=>{ console.error(e); process.exit(1) })
