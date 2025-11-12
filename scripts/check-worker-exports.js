process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost'
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy'
const w = require('./parsing-worker')
console.log('exports:', Object.keys(w), 'runJobType:', typeof w.runJob)
