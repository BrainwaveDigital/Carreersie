#!/usr/bin/env node
const dotenv = require('dotenv');
dotenv.config();
/**
 * RLS smoke-test script for Careersie
 *
 * Requirements (set in environment):
 *  - SUPABASE_URL (e.g. https://<project>.supabase.co)
 *  - SUPABASE_SERVICE_ROLE_KEY (Supabase service_role key)
 *
 * This script will:
 *  1. Create two test users via the Supabase Admin API
 *  2. Sign in as each user to obtain access tokens
 *  3. Test insert/select/update/delete behavior against /rest/v1/profiles
 *  4. Clean up created users and profiles using the service role key
 */

const crypto = require('crypto');
const { URL } = require('url');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment.');
  process.exit(1);
}

const adminHeaders = {
  'Content-Type': 'application/json',
 Authorization: `Bearer ${SERVICE_KEY}`,
};

function randEmail(prefix) {
  return `${prefix}+${crypto.randomBytes(4).toString('hex')}@example.com`;
}

async function request(url, opts = {}) {
  const res = await fetch(url, opts);
  const text = await res.text();
  let body;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { status: res.status, body, headers: res.headers };
}

async function createUser(email, password) {
  const url = new URL('/auth/v1/admin/users', SUPABASE_URL).toString();
  const body = { email, password, email_confirm: true };
  return await request(url, { method: 'POST', headers: adminHeaders, body: JSON.stringify(body) });
}

async function deleteUser(userId) {
  const url = new URL(`/auth/v1/admin/users/${userId}`, SUPABASE_URL).toString();
  return await request(url, { method: 'DELETE', headers: adminHeaders });
}

async function signIn(email, password) {
  const url = new URL('/auth/v1/token?grant_type=password', SUPABASE_URL).toString();
  const params = new URLSearchParams();
  params.append('email', email);
  params.append('password', password);
  return await request(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params.toString() });
}

async function callRest(path, method = 'GET', token, body) {
  const url = new URL(`/rest/v1/${path}`, SUPABASE_URL).toString();
  const headers = {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  return await request(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
}

async function main() {
  console.log('Starting RLS smoke-test');
  const pass = (msg) => console.log('\x1b[32m%s\x1b[0m', msg);
  const fail = (msg) => console.error('\x1b[31m%s\x1b[0m', msg);

  const pw = 'Test1234!';
  const emailA = randEmail('testA');
  const emailB = randEmail('testB');

  console.log('Creating test users...');
  const resA = await createUser(emailA, pw);
  const resB = await createUser(emailB, pw);
  if (resA.status !== 200 && resA.status !== 201) { fail('Failed creating user A: ' + JSON.stringify(resA)); process.exit(1); }
  if (resB.status !== 200 && resB.status !== 201) { fail('Failed creating user B: ' + JSON.stringify(resB)); process.exit(1); }
  const userA = resA.body;
  const userB = resB.body;
  pass(`Created users: ${userA.id}, ${userB.id}`);

  console.log('Signing in as users to obtain tokens...');
  const signA = await signIn(emailA, pw);
  const signB = await signIn(emailB, pw);
  if (signA.status !== 200) { fail('Sign-in A failed: ' + JSON.stringify(signA)); }
  if (signB.status !== 200) { fail('Sign-in B failed: ' + JSON.stringify(signB)); }
  const tokenA = signA.body.access_token;
  const tokenB = signB.body.access_token;
  pass('Signed in and obtained access tokens');

  // Clean profiles for safety using service role
  console.log('Cleaning any test profiles for the created users (service role)');
  await request(new URL('/rest/v1/profiles', SUPABASE_URL).toString(), { method: 'DELETE', headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY } });

  // As user A, create profile
  console.log('User A: create profile');
  const createA = await callRest('profiles', 'POST', tokenA, [{ user_id: userA.id, full_name: 'Test A' }]);
  if (createA.status >= 200 && createA.status < 300) pass('User A created profile'); else { fail('User A failed to create profile: ' + JSON.stringify(createA)); }

  // As user B, try to read profiles (should not see user A's)
  console.log('User B: read profiles');
  const readB = await callRest('profiles?select=*', 'GET', tokenB);
  if (readB.status >= 200 && readB.status < 300) {
    const rows = readB.body;
    if (Array.isArray(rows) && rows.length === 0) pass('User B cannot see User A profiles (expected)'); else fail('User B can see profiles (unexpected): ' + JSON.stringify(rows));
  } else {
    fail('User B read failed: ' + JSON.stringify(readB));
  }

  // As user B, attempt to update user A's profile (should fail)
  console.log('User B: attempt update on profiles');
  const updateB = await callRest(`profiles?user_id=eq.${userA.id}`, 'PATCH', tokenB, { headline: 'Hacked' });
  if (updateB.status === 403 || (updateB.status >= 200 && updateB.status < 300 && Array.isArray(updateB.body) && updateB.body.length === 0)) {
    pass('User B cannot update User A profile (expected)');
  } else {
    fail('User B update result: ' + JSON.stringify(updateB));
  }

  // As service role, clean up profiles for the two users
  console.log('Cleaning up (service role)');
  await request(new URL('/rest/v1/profiles?user_id=eq.' + userA.id, SUPABASE_URL).toString(), { method: 'DELETE', headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY } });
  await request(new URL('/rest/v1/profiles?user_id=eq.' + userB.id, SUPABASE_URL).toString(), { method: 'DELETE', headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY } });

  // Delete users
  console.log('Deleting test users');
  await deleteUser(userA.id);
  await deleteUser(userB.id);

  pass('RLS smoke-test finished');
}

main().catch((err) => { console.error(err); process.exit(1); });
