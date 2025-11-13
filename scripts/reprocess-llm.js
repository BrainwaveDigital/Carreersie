#!/usr/bin/env node
require('./load-env')
const { createClient } = require('@supabase/supabase-js')
const OpenAI = require('openai')

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env')
  process.exit(1)
}
if (!OPENAI_API_KEY) {
  console.error('Please set OPENAI_API_KEY in env to call the LLM')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
const openai = new OpenAI({ apiKey: OPENAI_API_KEY })

async function callOpenAI(prompt) {
  // Use chat completions to request strict JSON output
  const resp = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: 'You are a JSON generator. Return ONLY valid JSON following the requested schema.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0
  })
  const txt = resp.choices && resp.choices[0] && resp.choices[0].message && resp.choices[0].message.content
  return txt
}

function extractJson(text) {
  // try to find first {...} block
  const m = text.match(/\{[\s\S]*\}/)
  if (!m) return null
  try { return JSON.parse(m[0]) } catch (e) { return null }
}

async function main() {
  const docId = process.argv[2] || process.env.DOC_ID
  const insertRows = process.argv.includes('--insert') || process.argv.includes('-i')
  if (!docId) {
    console.error('Usage: node scripts/reprocess-llm.js <PARSED_DOCUMENT_ID> [--insert]')
    process.exit(1)
  }

  console.log('Fetching parsed_document', docId)
  const { data, error } = await supabase.from('parsed_documents').select('*').eq('id', docId).limit(1).single()
  if (error || !data) {
    console.error('Failed fetching parsed_document', error)
    process.exit(1)
  }

  const extracted = (data.parsed_json && data.parsed_json.extracted) || data.extracted || data.parsed_json || null
  if (!extracted) {
    console.error('No extracted text found in parsed_document.parsed_json.extracted or parsed_json; aborting')
    process.exit(1)
  }
  const text = extracted.raw_text_snippet || extracted.raw_text_excerpt || data.raw_text_excerpt || extracted.raw_text || ''
  if (!text || text.trim().length < 20) {
    console.error('Extracted text is empty or too short; aborting')
    process.exit(1)
  }

  const prompt = `Given the following resume/text, produce a JSON object with keys: experiences (array of {title, company, start_date, end_date, is_current, description}), education (array of {school, degree, start_year, end_year, description}), skills (array of strings). Return ONLY valid JSON. Resume:\n\n${text}`

  console.log('Calling OpenAI to generate structured JSON...')
  let reply
  try {
    reply = await callOpenAI(prompt)
  } catch (e) {
    console.error('OpenAI call failed', e)
    process.exit(1)
  }

  let parsed = extractJson(reply)
  if (!parsed) {
    // try plain parse
    try { parsed = JSON.parse(reply) } catch (e) {}
  }
  if (!parsed) {
    console.error('Could not parse JSON from LLM response. Raw response:\n', reply)
    process.exit(1)
  }

  console.log('LLM returned JSON with keys:', Object.keys(parsed))

  // update parsed_documents.llm
  const updatePayload = { llm: parsed }
  let up, upErr
  try {
    const res = await supabase.from('parsed_documents').update(updatePayload).eq('id', docId).select().limit(1)
    up = res.data
    upErr = res.error
  } catch (e) {
    upErr = e
  }

  if (upErr) {
    // handle older DBs that don't have an 'llm' top-level column by merging into parsed_json
    const msg = (upErr && upErr.message) || String(upErr)
    if (/Could find the 'llm' column|Could not find the 'llm' column|column "llm" does not exist/i.test(msg) || (upErr && upErr.code === 'PGRST204')) {
      console.warn('Server does not expose a top-level llm column; falling back to writing into parsed_json.llm')
      // fetch existing parsed_json (we have `data` variable from earlier)
      const existingParsedJson = (data.parsed_json && typeof data.parsed_json === 'object') ? data.parsed_json : {}
      const merged = { ...existingParsedJson, llm: parsed }
      const { data: up2, error: up2Err } = await supabase.from('parsed_documents').update({ parsed_json: merged }).eq('id', docId).select().limit(1)
      if (up2Err) {
        console.error('Failed updating parsed_documents.parsed_json with llm fallback', up2Err)
        process.exit(1)
      }
      up = up2
      console.log('Updated parsed_documents.parsed_json with llm fallback')
    } else {
      console.error('Failed updating parsed_documents.llm', upErr)
      process.exit(1)
    }
  } else {
    console.log('Updated parsed_documents.llm')
  }

  if (insertRows) {
    // optionally insert normalized rows for experiences/education/skills
    const profileId = up && up[0] && up[0].profile_id ? up[0].profile_id : data.profile_id
    if (!profileId) {
      console.warn('No profile_id present on parsed_document; skipping normalized row inserts')
    } else {
      if (Array.isArray(parsed.experiences) && parsed.experiences.length) {
        const exRows = parsed.experiences.map(e => ({ profile_id: profileId, title: e.title || null, company: e.company || null, start_date: e.start_date || null, end_date: e.end_date || null, is_current: !!e.is_current, description: e.description || null, raw_json: e }))
        const { error: eErr } = await supabase.from('experiences').insert(exRows)
        if (eErr) console.error('Failed inserting experiences', eErr); else console.log('Inserted experiences rows')
      }
      if (Array.isArray(parsed.education) && parsed.education.length) {
        const edRows = parsed.education.map(e => ({ profile_id: profileId, school: e.school || null, degree: e.degree || null, start_year: e.start_year || null, end_year: e.end_year || null, description: e.description || null, raw_json: e }))
        const { error: edErr } = await supabase.from('education').insert(edRows)
        if (edErr) console.error('Failed inserting education', edErr); else console.log('Inserted education rows')
      }
      if (Array.isArray(parsed.skills) && parsed.skills.length) {
        const skRows = parsed.skills.map(s => (typeof s === 'string' ? { profile_id: profileId, skill: s } : { profile_id: profileId, skill: s.skill || null, confidence: s.confidence || null, raw_json: s }))
        const { error: skErr } = await supabase.from('skills').insert(skRows)
        if (skErr) console.error('Failed inserting skills', skErr); else console.log('Inserted skills rows')
      }
    }
  }

  console.log('Reprocess complete')
}

main().then(()=>process.exit(0)).catch(e=>{ console.error(e); process.exit(1) })
