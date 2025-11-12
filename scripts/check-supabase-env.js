#!/usr/bin/env node
// Small diagnostic helper for Supabase env & basic connectivity
// Run: node scripts/check-supabase-env.js

// Prefer loading env from common locations (repo root, apps/web) so scripts pick up apps/web/.env.local
const loadEnv = require('./load-env')
// loadEnv will print where it loaded from and populate process.env

function mask(val) {
  if (!val) return '(missing)'
  if (val.length < 8) return val
  return val.slice(0, 4) + '…' + val.slice(-4)
}

const supabaseUrlRaw = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseUrl = supabaseUrlRaw ? String(supabaseUrlRaw).trim() : null
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('Supabase environment check')
console.log('--------------------------')
console.log('SUPABASE_URL (raw):', supabaseUrlRaw ? `'${supabaseUrlRaw}'` : '(not set)')
console.log('SUPABASE_URL (trimmed):', supabaseUrl ? `'${supabaseUrl}'` : '(missing)')
if (supabaseUrlRaw && supabaseUrlRaw !== (supabaseUrl || '')) {
  console.warn('Warning: SUPABASE_URL contains leading/trailing whitespace; trimmed for checks. Fix your .env or shell.')
}
console.log('SUPABASE_SERVICE_ROLE_KEY:', mask(serviceKey))
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', mask(anonKey))

if (!supabaseUrl) {
  console.error('\nMissing SUPABASE_URL. Please set SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL in your environment or .env.local')
  process.exitCode = 2
  process.exit()
}

// Validate URL format
try {
  new URL(supabaseUrl)
} catch (e) {
  console.error('\nSUPABASE_URL is malformed:', String(e))
  process.exitCode = 3
  process.exit()
}

// Try a basic fetch to the Supabase host root to detect connectivity issues
;(async () => {
  try {
    const healthUrl = new URL(supabaseUrl)
    // attempt a simple GET on the base URL (Supabase doesn't require a path here)
    console.log('\nTesting network connectivity to Supabase host...')
    const resp = await fetch(healthUrl.toString(), { method: 'GET' })
    console.log('Fetch to', healthUrl.toString(), '-> status', resp.status)
    if (!resp.ok) {
      console.warn('Host returned non-OK status. This may be normal for the root path; try a specific REST endpoint if needed.')
    }
  } catch (fetchErr) {
    console.error('Network fetch to SUPABASE_URL failed:', String(fetchErr))
    console.error('This can be caused by DNS, proxy, firewall, or TLS issues from your machine to the Supabase host.')
    console.error('Try:');
    console.error("  - verify the SUPABASE_URL is correct and reachable from your machine")
    console.error("  - open the URL in your browser to inspect TLS/redirects")
    console.error("  - check company VPN/proxy or Windows firewall settings")
    process.exitCode = 4
    process.exit()
  }

  console.log('\nBasic checks passed. Next try running:')
  console.log('  pnpm run check:supabase')
  console.log('Then run the one-shot job:')
  console.log('  pnpm run run:job -- <job-id>')
})()
