#!/usr/bin/env node
/*
  Simple parsing worker stub for Careersie
  - Polls `parsing_jobs` table for pending jobs
  - Downloads the associated file from storage ('resumes' bucket)
  - Performs a stub parse (replace with real parser integration)
  - Updates `parsed_documents` and `parsing_jobs` rows

  Requires env vars (or .env):
    SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

  Run:
    pnpm run parsing:worker
*/

// Prefer loading env from common locations (repo root, apps/web) so scripts pick up apps/web/.env.local
require('./load-env')

const { createClient } = require('@supabase/supabase-js')
const pdfParse = require('pdf-parse')
const mammoth = require('mammoth')
const path = require('path')
const fs = require('fs')
const Ajv = require('ajv')
const addFormats = require('ajv-formats')
let OpenAI
let llmClient = null
const USE_LLM = String(process.env.USE_LLM || '0') === '1'
if (USE_LLM) {
  OpenAI = require('openai')
  const openaiApiKey = process.env.OPENAI_API_KEY
  if (!openaiApiKey) {
    console.warn('USE_LLM=1 but OPENAI_API_KEY is not set. LLM calls will fail.')
  } else {
    llmClient = new OpenAI({ apiKey: openaiApiKey })
  }
}

// read and normalize the Supabase URL; trim to avoid stray-space mistakes
const _rawSupabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_URL = _rawSupabaseUrl ? String(_rawSupabaseUrl).trim() : undefined
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in environment or .env')
  if (_rawSupabaseUrl && _rawSupabaseUrl !== SUPABASE_URL) console.error('Note: SUPABASE_URL contains surrounding whitespace; it was trimmed for use. Please fix the value in your shell or .env')
  process.exit(1)
}

// validate URL format early to provide a clearer error message when malformed
try {
  new URL(SUPABASE_URL)
} catch (urlErr) {
  console.error('SUPABASE_URL appears to be malformed:', SUPABASE_URL)
  console.error('Error from URL parser:', String(urlErr))
  console.error('Check for stray characters or spaces. Example valid value: https://xxxx.supabase.co')
  process.exit(1)
}

let supabase
try {
  supabase = createClient(SUPABASE_URL, SERVICE_KEY)
} catch (clErr) {
  console.error('Failed creating Supabase client. This may indicate a malformed URL or incompatible environment.')
  console.error(String(clErr))
  process.exit(1)
}

const POLL_INTERVAL = Number(process.env.PARSE_POLL_INTERVAL || 5000)

async function pickJob() {
  // pick a single pending job
  const { data, error } = await supabase
    .from('parsing_jobs')
    .select('id, parsed_document_id, status, attempts')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(1)

  if (error) {
    console.error('Error selecting job:', error)
    return null
  }
  return Array.isArray(data) && data.length ? data[0] : null
}

function extractFieldsFromText(text, fileName) {
  const out = { raw_text_snippet: text.slice(0, 30_000) }

  const emailMatch = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)
  const phoneMatch = text.match(/(\+?\d{1,3}[-.\s]?)?(\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{3,4}/)
  const linkedinMatch = text.match(/https?:\/\/(www\.)?linkedin\.com\/[A-Za-z0-9_\-\/\?&=%\.]+/i)
  const websiteMatch = text.match(/https?:\/\/[^\s)]+/i)

  out.email = emailMatch ? emailMatch[0] : null
  out.phone = phoneMatch ? phoneMatch[0] : null
  out.linkedin = linkedinMatch ? linkedinMatch[0] : null
  out.website = websiteMatch ? websiteMatch[0] : null

  // Naive name extraction: first non-empty line with 2-3 title-cased words
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  let name = null
  for (const line of lines.slice(0, 10)) {
    const words = line.split(/\s+/)
    if (words.length >= 2 && words.length <= 4 && words.every(w => /^[A-Z][a-z\-']/.test(w))) {
      name = line
      break
    }
  }
  out.name = name || null

  // Simple sections extraction (Experience / Education) by searching headings
  const expIndex = text.search(/\b(Experience|Work Experience|Employment)\b/i)
  const eduIndex = text.search(/\b(Education|Academic|Qualifications)\b/i)
  if (expIndex !== -1) {
    const end = eduIndex !== -1 && eduIndex > expIndex ? eduIndex : Math.min(text.length, expIndex + 5000)
    out.experience_snippet = text.slice(expIndex, end).trim().slice(0, 3000)
  }
  if (eduIndex !== -1) {
    const end = text.length
    out.education_snippet = text.slice(eduIndex, Math.min(text.length, eduIndex + 3000)).trim().slice(0, 2000)
  }

  // store original file name
  out.file_name = fileName

  return out
}

async function runJob(job) {
  console.log('Picked job', job.id)
  // mark running
  await supabase.from('parsing_jobs').update({ status: 'running', started_at: new Date().toISOString(), attempts: (job.attempts || 0) + 1 }).eq('id', job.id)

  // fetch parsed_document row
  const { data: docs, error: dErr } = await supabase.from('parsed_documents').select('*').eq('id', job.parsed_document_id).limit(1)
  if (dErr || !docs || docs.length === 0) {
    console.error('Parsed document not found for job', job.id, dErr)
    await supabase.from('parsing_jobs').update({ status: 'failed', finished_at: new Date().toISOString() }).eq('id', job.id)
    return
  }
  const doc = docs[0]

  try {
    // download file from storage
    console.log('Downloading', doc.storage_path)
    const { data: fileStream, error: dlErr } = await supabase.storage.from('resumes').download(doc.storage_path)
    if (dlErr) throw dlErr

    // read into buffer
    const arrayBuffer = await fileStream.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const size = buffer.length

    // determine file type
    const ext = path.extname(doc.file_name || doc.storage_path || '').toLowerCase()
    let rawText = ''

    if (ext === '.pdf') {
      try {
        const pdfData = await pdfParse(buffer)
        rawText = pdfData.text || ''
      } catch (pErr) {
        console.error('PDF parse error', pErr)
        rawText = buffer.toString('utf8', 0, Math.min(200000, buffer.length))
      }
    } else if (ext === '.docx' || ext === '.doc') {
      try {
        const mammothRes = await mammoth.extractRawText({ buffer })
        rawText = mammothRes.value || ''
      } catch (mErr) {
        console.error('DOCX parse error', mErr)
        rawText = buffer.toString('utf8', 0, Math.min(200000, buffer.length))
      }
    } else {
      rawText = buffer.toString('utf8', 0, Math.min(200000, buffer.length))
    }

    // extract fields using simple heuristics/regex
    const extracted = extractFieldsFromText(rawText, doc.file_name)


    let finalParsedJson = {
      parsed_at: new Date().toISOString(),
      file_name: doc.file_name,
      storage_path: doc.storage_path,
      size_bytes: size,
      extracted,
      raw_text_excerpt: rawText.slice(0, 200000)
    }

    // Optionally call LLM for structured extraction
    if (USE_LLM && llmClient) {
      try {
        // Check per-profile opt-in flag (use_gpt5) before calling the LLM.
        // Default to skipping the LLM if we cannot determine the flag.
        let profileAllowsLLM = false
        try {
          if (doc.user_id) {
            const { data: profileData, error: profileErr } = await supabase
              .from('profiles')
              .select('use_gpt5')
              .eq('user_id', doc.user_id)
              .limit(1)
              .single()
            if (profileErr) {
              console.warn('Could not read profile.use_gpt5 flag, defaulting to false', profileErr)
              profileAllowsLLM = false
            } else {
              profileAllowsLLM = Boolean(profileData?.use_gpt5)
            }
          } else {
            profileAllowsLLM = false
          }
        } catch (chkErr) {
          console.warn('Error checking profile.use_gpt5, skipping LLM call', chkErr)
          profileAllowsLLM = false
        }

        if (!profileAllowsLLM) {
          console.log('Profile not opted-in for LLM; skipping LLM call for doc', doc.id)
          finalParsedJson.llm_skipped = true
        } else {
          const model = process.env.LLM_MODEL || 'gpt-5'
          console.log('Calling LLM model', model, 'for structured extraction')
          const prompt = `Extract the following JSON from the resume text. Fields: name, email, phone, summary, skills (array of strings), experiences (array of {title, company, start_date, end_date, description}), education (array of {school, degree, start_year, end_year}). Provide valid JSON only. Resume text:\n\n${rawText.slice(0, 150000)}`
          const resp = await llmClient.responses.create({ model, input: prompt, max_output_tokens: 1500 })
          const text = (resp.output && resp.output[0] && resp.output[0].content && resp.output[0].content[0] && resp.output[0].content[0].text) || JSON.stringify(resp)
          // try parse JSON out of the response
          let parsedFromLLM = null
          try {
            // find first { ... } in text
            const jsonMatch = text.match(/\{[\s\S]*\}/)
            if (jsonMatch) parsedFromLLM = JSON.parse(jsonMatch[0])
          } catch (jErr) {
            console.error('Failed parsing LLM JSON output', jErr)
          }
          if (parsedFromLLM) {
            // validate parsedFromLLM against schema using ajv
            try {
              const schemaPath = path.join(__dirname, 'llm-schema.json')
              let schema = null
              try {
                schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'))
              } catch (sErr) {
                console.warn('Could not read LLM schema file, skipping validation', sErr)
              }
              if (schema) {
                const ajv = new Ajv({ allErrors: true, strict: false })
                addFormats(ajv)
                const validate = ajv.compile(schema)
                const valid = validate(parsedFromLLM)
                finalParsedJson.llm = parsedFromLLM
                    finalParsedJson.llm_valid = Boolean(valid)
                    finalParsedJson.llm_validation_errors = valid ? null : (validate.errors || [])
                    // record schema version used for this validation
                    finalParsedJson.llm_schema_version = schema.$id || schema.version || 'v1'
              } else {
                finalParsedJson.llm = parsedFromLLM
                finalParsedJson.llm_valid = null
                finalParsedJson.llm_validation_errors = null
              }
            } catch (valErr) {
              console.warn('Error validating LLM output', valErr)
              finalParsedJson.llm = parsedFromLLM
              finalParsedJson.llm_valid = null
              finalParsedJson.llm_validation_errors = String(valErr)
            }
          } else {
            finalParsedJson.llm_raw = text.slice(0, 100000)
            finalParsedJson.llm_valid = false
            finalParsedJson.llm_validation_errors = ['failed_to_parse_json']
          }
        }
      } catch (llmErr) {
        console.error('LLM call failed', llmErr)
        finalParsedJson.llm_error = String(llmErr)
      }
    }

    // update parsed_documents
    await supabase.from('parsed_documents').update({ parsed_json: finalParsedJson, status: 'parsed', parsed_at: new Date().toISOString(), text_extracted: rawText.slice(0, 1000000) }).eq('id', doc.id)

    // Try to create or link a profile for this user and insert normalized rows (experiences, education, skills)
    try {
      let profileId = doc.profile_id
      // if there's no profile_id, try to find one by user_id
      if (!profileId && doc.user_id) {
        const { data: profiles, error: pErr } = await supabase.from('profiles').select('*').eq('user_id', doc.user_id).limit(1)
        if (!pErr && profiles && profiles.length) {
          profileId = profiles[0].id
        }
      }

      // create a lightweight profile if none exists (server-only)
      if (!profileId && doc.user_id) {
        const createProfilePayload = { user_id: doc.user_id }
        if (finalParsedJson && finalParsedJson.extracted && finalParsedJson.extracted.name) createProfilePayload.full_name = finalParsedJson.extracted.name
        const { data: created, error: cErr } = await supabase.from('profiles').insert([createProfilePayload]).select().limit(1)
        if (!cErr && created && created.length) {
          profileId = created[0].id
          // update parsed_document.profile_id
          await supabase.from('parsed_documents').update({ profile_id: profileId }).eq('id', doc.id)
        } else if (cErr) {
          console.warn('Could not create profile for parsed document', cErr)
        }
      }

      // Insert experiences if present
      const experiences = (finalParsedJson && finalParsedJson.llm && Array.isArray(finalParsedJson.llm.experiences)) ? finalParsedJson.llm.experiences : null
      if (profileId && experiences && experiences.length) {
        try {
          const rows = experiences.map((exp, idx) => ({
            profile_id: profileId,
            title: exp.title || null,
            company: exp.company || null,
            location: exp.location || null,
            start_date: exp.start_date ? exp.start_date : null,
            end_date: exp.end_date ? exp.end_date : null,
            is_current: exp.is_current || false,
            description: exp.description || null,
            raw_json: exp,
            order_index: idx
          }))
          const { error: eErr } = await supabase.from('experiences').insert(rows)
          if (eErr) console.warn('Failed inserting experiences', eErr)
        } catch (inErr) {
          console.warn('Error inserting experiences', inErr)
        }
      }

      // Insert education if present
      const education = (finalParsedJson && finalParsedJson.llm && Array.isArray(finalParsedJson.llm.education)) ? finalParsedJson.llm.education : null
      if (profileId && education && education.length) {
        try {
          const edRows = education.map((ed) => ({
            profile_id: profileId,
            school: ed.school || null,
            degree: ed.degree || null,
            field_of_study: ed.field_of_study || null,
            start_year: ed.start_year ? Number(ed.start_year) : null,
            end_year: ed.end_year ? Number(ed.end_year) : null,
            description: ed.description || null,
            raw_json: ed
          }))
          const { error: edErr } = await supabase.from('education').insert(edRows)
          if (edErr) console.warn('Failed inserting education rows', edErr)
        } catch (edInErr) {
          console.warn('Error inserting education rows', edInErr)
        }
      }

      // Insert skills if present
      const skills = (finalParsedJson && finalParsedJson.llm && Array.isArray(finalParsedJson.llm.skills)) ? finalParsedJson.llm.skills : null
      if (profileId && skills && skills.length) {
        try {
          const skillRows = skills.map((s) => ({ profile_id: profileId, skill: s, confidence: null, raw_json: s }))
          const { error: skErr } = await supabase.from('skills').insert(skillRows)
          if (skErr) console.warn('Failed inserting skills', skErr)
        } catch (skInErr) {
          console.warn('Error inserting skills', skInErr)
        }
      }
    } catch (linkErr) {
      console.warn('Error linking parsed data to profile or inserting normalized rows', linkErr)
    }

    // finish job
    await supabase.from('parsing_jobs').update({ status: 'finished', finished_at: new Date().toISOString() }).eq('id', job.id)

    console.log('Job finished', job.id)
  } catch (err) {
    console.error('Job error', job.id, err)
    await supabase.from('parsing_jobs').update({ status: 'failed', finished_at: new Date().toISOString() }).eq('id', job.id)
  }
}

async function pollLoop() {
  try {
    const job = await pickJob()
    if (job) {
      await runJob(job)
    }
  } catch (err) {
    console.error('Worker error', err)
  } finally {
    setTimeout(pollLoop, POLL_INTERVAL)
  }
}

// When run directly, start the poll loop. When required as a module, expose runJob for tests.
if (require.main === module) {
  console.log('Starting parsing worker - polling every', POLL_INTERVAL, 'ms')
  pollLoop()
} else {
  // export runJob for programmatic use in integration tests
  module.exports = { runJob }
}

process.on('SIGINT', () => {
  console.log('Stopping worker')
  process.exit(0)
})
