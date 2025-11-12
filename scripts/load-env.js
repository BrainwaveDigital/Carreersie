const fs = require('fs')
const path = require('path')
const dotenv = require('dotenv')

// Try multiple locations for .env files: repo root, apps/web, and fallback to process.cwd()
const candidates = [
  path.resolve(process.cwd(), '.env.local'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'apps', 'web', '.env.local'),
  path.resolve(process.cwd(), 'apps', 'web', '.env'),
]

let loaded = null
for (const p of candidates) {
  try {
    if (fs.existsSync(p)) {
      const res = dotenv.config({ path: p })
      if (!res.error) {
        console.log('Loaded env from', p)
        loaded = p
        break
      }
    }
  } catch (e) {
    // ignore
  }
}

if (!loaded) {
  // fallback to default dotenv behavior (cwd)
  try {
    const res = dotenv.config()
    if (!res.error) console.log('Loaded env from default path')
  } catch (e) {
    // ignore
  }
}

module.exports = { loaded }
