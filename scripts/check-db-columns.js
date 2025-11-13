#!/usr/bin/env node
/*
  check-db-columns.js

  Compares `scripts/db-columns.json` (or `scripts/db-columns.ts`) with the live database columns.

  Usage:
    - Set PG_CONNECTION_STRING env var to a Postgres connection string with permissions to read information_schema (example: postgres://user:pass@host:5432/dbname)
    - Install dependencies with: pnpm add -D pg
    - Run: node scripts/check-db-columns.js

  Notes:
    - If PG_CONNECTION_STRING is not provided the script will print instructions and exit.
*/

const path = require('path')
const fs = require('fs')

const PGPATH = process.env.PG_CONNECTION_STRING || process.env.SUPABASE_DB_URL
if (!PGPATH) {
  console.error('\nERROR: No Postgres connection string found.')
  console.error('Set PG_CONNECTION_STRING (or SUPABASE_DB_URL) environment variable to a valid Postgres connection string.')
  console.error('Example: PG_CONNECTION_STRING="postgres://postgres:password@db.host:5432/postgres"')
  console.error('\nThis script requires the `pg` package. Install with: pnpm add -D pg')
  process.exit(2)
}

// load expected columns from JSON (fallback to TS module if needed)
let expected = null
const jsonPath = path.resolve(__dirname, 'db-columns.json')
const tsPath = path.resolve(__dirname, 'db-columns.ts')
if (fs.existsSync(jsonPath)) {
  expected = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
} else if (fs.existsSync(tsPath)) {
  // try to require the compiled TS (if using ts-node or compiled JS)
  try {
    // dynamic import of ts file may not work without ts-node; attempt to load JS sibling
    const jsPath = path.resolve(__dirname, 'db-columns.js')
    if (fs.existsSync(jsPath)) {
      expected = require(jsPath).dbColumns || require(jsPath).default
    } else {
      console.error('Found db-columns.ts but no compiled db-columns.js. Please compile or add db-columns.json.')
      process.exit(3)
    }
  } catch (e) {
    console.error('Failed to load db-columns module:', e.message)
    process.exit(3)
  }
} else {
  console.error('No scripts/db-columns.json or scripts/db-columns.ts found. Create one first.')
  process.exit(3)
}

// connect to Postgres
async function run() {
  let pg
  try {
    pg = require('pg')
  } catch (err) {
    console.error('Missing dependency `pg`. Install with: pnpm add -D pg')
    process.exit(4)
  }

  const { Client } = pg
  const client = new Client({ connectionString: PGPATH })
  await client.connect()

  try {
    const res = await client.query(`
      SELECT table_name, column_name, data_type, is_nullable, ordinal_position
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    `)

    const live = res.rows

    // normalize keys to compare
    const keyOf = (r) => `${r.table_name}::${r.column_name}`

    const expectedMap = new Map()
    for (const r of expected) {
      expectedMap.set(keyOf(r), r)
    }

    const liveMap = new Map()
    for (const r of live) {
      liveMap.set(keyOf(r), r)
    }

    const missing = []
    const extra = []
    const mismatched = []

    for (const [k, exp] of expectedMap.entries()) {
      if (!liveMap.has(k)) missing.push(exp)
      else {
        const liveRow = liveMap.get(k)
        // compare data_type and is_nullable loosely
        const a = (exp.data_type || '').toLowerCase()
        const b = (liveRow.data_type || '').toLowerCase()
        const an = (exp.is_nullable || '').toLowerCase()
        const bn = (liveRow.is_nullable || '').toLowerCase()
        if (!b.includes(a) && a !== b) {
          mismatched.push({ expected: exp, actual: liveRow })
        }
      }
    }

    for (const [k, liveRow] of liveMap.entries()) {
      if (!expectedMap.has(k)) extra.push(liveRow)
    }

    console.log('\nDB columns check result:')
    console.log('  expected rows:', expected.length)
    console.log('  live rows     :', live.length)

    if (missing.length) {
      console.log('\nMissing columns (present in scripts/db-columns.json but NOT in DB):')
      for (const r of missing) console.log(`  - ${r.table_name}.${r.column_name} (${r.data_type})`)
    } else {
      console.log('\nNo missing columns detected.')
    }

    if (extra.length) {
      console.log('\nExtra columns (present in DB but NOT in scripts/db-columns.json):')
      for (const r of extra) console.log(`  - ${r.table_name}.${r.column_name} (${r.data_type})`)
    } else {
      console.log('\nNo extra columns detected.')
    }

    if (mismatched.length) {
      console.log('\nColumns with mismatched data_type/is_nullable:')
      for (const mm of mismatched) {
        console.log(`  - ${mm.expected.table_name}.${mm.expected.column_name}: expected ${mm.expected.data_type} nullable=${mm.expected.is_nullable}  |  actual ${mm.actual.data_type} nullable=${mm.actual.is_nullable}`)
      }
    } else {
      console.log('\nNo mismatched column types detected.')
    }

    const problems = missing.length + extra.length + mismatched.length
    if (problems > 0) process.exit(5)
    else process.exit(0)

  } finally {
    await client.end()
  }
}

run().catch((err) => {
  console.error('Error running check:', err.message || err)
  process.exit(99)
})
