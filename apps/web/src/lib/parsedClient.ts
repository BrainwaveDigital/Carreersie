import { supabaseClient } from './supabase'
import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import schema from '../../../../scripts/parsed-schema.json'

type ParsedPayload = {
  profile?: any,
  experiences?: any[],
  education?: any[],
  skills?: any[],
}

/**
 * Ingest parsed data as the currently authenticated user.
 * Uses the browser supabase client so RLS policies apply.
 */
export async function ingestParsedAsUser(parsed: ParsedPayload) {
  // validate payload client-side to catch problems early
  try {
    const ajv = new Ajv({ allErrors: true })
    addFormats(ajv)
    const validate = ajv.compile(schema as any)
    const ok = validate(parsed)
    if (!ok) {
      const msg = (validate.errors || []).map((e: any) => `${e.instancePath} ${e.message}`).join(', ')
      throw new Error('Invalid parsed payload: ' + msg)
    }
  } catch (e) {
    // if AJV is not available in the environment or validation fails, surface error
    if (e instanceof Error) throw e
  }
  // ensure user is logged in
  const { data: userData, error: userErr } = await supabaseClient.auth.getUser()
  if (userErr || !userData?.user) throw new Error('Not authenticated')
  const user = userData.user

  // upsert profile: try update by user_id then insert
  if (parsed.profile) {
    // Whitelist of columns actually present on the `profiles` table in the DB.
    // This avoids sending unknown keys (eg. `display_name`) which can cause
    // the Supabase/PostgREST client to throw against its schema cache.
    const profileFields = [
      'id',
      'user_id',
      'full_name',
      'preferred_name',
      'headline',
      'summary',
      'about',
      'location',
      'website',
      'email',
      'phone',
    ]

    const safeProfile: any = {}
    // If the parser produced `display_name` but the DB uses `preferred_name`,
    // map it across so user edits or parser output don't get silently dropped.
    if ((parsed.profile as any).display_name && !(parsed.profile as any).preferred_name) {
      parsed.profile.preferred_name = (parsed.profile as any).display_name
    }
    for (const key of profileFields) {
      if (key === 'user_id') {
        // always set user_id to the current user
        safeProfile.user_id = user.id
        continue
      }
      if (Object.prototype.hasOwnProperty.call(parsed.profile, key)) {
        safeProfile[key] = (parsed.profile as any)[key]
      }
    }

    // try update
    const { error: updErr } = await supabaseClient.from('profiles').update(safeProfile).eq('user_id', user.id)
    if (updErr) {
      // if update failed, try insert
      const { error: insErr } = await supabaseClient.from('profiles').insert(safeProfile)
      if (insErr) throw new Error(insErr.message || JSON.stringify(insErr))
    }
  }

  // ensure we have a profile id
  const { data: profilesNow, error: pErr } = await supabaseClient.from('profiles').select('id').eq('user_id', user.id).limit(1)
  if (pErr) throw new Error(pErr.message || JSON.stringify(pErr))
  if (!profilesNow || profilesNow.length === 0) throw new Error('Profile not found')
  const profileId = (profilesNow as any)[0].id

  // replace experiences/education/skills via delete+bulk-insert
  if (Array.isArray(parsed.experiences)) {
    await supabaseClient.from('experiences').delete().eq('profile_id', profileId)
    const safeExperiences = parsed.experiences.map((it: any, idx: number) => ({
      profile_id: profileId,
      order_index: idx,
      title: it.title || it.job_title || null,
      company: it.company || it.employer || null,
      start_date: it.start_date || it.start_year || null,
      end_date: it.end_date || it.end_year || null,
      is_current: !!it.is_current,
      description: it.description || null,
    }))
    if (safeExperiences.length) {
      const { error: exErr } = await supabaseClient.from('experiences').insert(safeExperiences)
      if (exErr) throw new Error(exErr.message || JSON.stringify(exErr))
    }
  }

  if (Array.isArray(parsed.education)) {
    await supabaseClient.from('education').delete().eq('profile_id', profileId)
    const safeEducation = parsed.education.map((it: any) => ({
      profile_id: profileId,
      school: it.school || it.institution || null,
      degree: it.degree || it.qualification || null,
      start_year: it.start_year || null,
      end_year: it.end_year || null,
      description: it.description || null,
    }))
    if (safeEducation.length) {
      const { error: edErr } = await supabaseClient.from('education').insert(safeEducation)
      if (edErr) throw new Error(edErr.message || JSON.stringify(edErr))
    }
  }

  if (Array.isArray(parsed.skills)) {
    await supabaseClient.from('skills').delete().eq('profile_id', profileId)
    const safeSkills = parsed.skills.map((it: any) => ({ profile_id: profileId, skill: typeof it === 'string' ? it : it.skill || JSON.stringify(it) }))
    if (safeSkills.length) {
      const { error: skErr } = await supabaseClient.from('skills').insert(safeSkills)
      if (skErr) throw new Error(skErr.message || JSON.stringify(skErr))
    }
  }

  return { ok: true, profile_id: profileId }
}
