#!/usr/bin/env node
/**
 * BLUE QA API, Matching, Analytics & E2E Verification Suite
 * Owned by Member 5 (QA & Pitch Lead).
 *
 * Usage:
 *   node qa/verify-api.mjs                 # Run full API, matching, analytics, and E2E suite
 *   node qa/verify-api.mjs --read-only     # Run non-mutating health, dataset, and analytics checks only
 *
 * Environment:
 *   API_BASE_URL=http://localhost:5000/api
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const API_BASE = (process.env.API_BASE_URL || 'http://localhost:5000/api').replace(/\/$/, '');
const READ_ONLY = process.argv.includes('--read-only');
const RUN_TAG = `QA-${Date.now()}`;

const results = [];

function record(suite, name, status, detail = '') {
  results.push({ suite, name, status, detail });
  const icon = status === 'PASS' ? '[PASS]' : status === 'FAIL' ? '[FAIL]' : '[BLOCKED]';
  console.log(`${icon} ${suite} :: ${name}${detail ? ` — ${detail}` : ''}`);
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  let body = null;
  const text = await res.text();
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }
  return { status: res.status, ok: res.ok, body };
}

function assertErrorEnvelope(res, expectedStatus, label) {
  assert.equal(res.status, expectedStatus, `${label}: expected HTTP ${expectedStatus}, got ${res.status}`);
  assert.ok(res.body && typeof res.body === 'object', `${label}: expected JSON object`);
  assert.ok(res.body.error && typeof res.body.error === 'object', `${label}: expected { error } envelope`);
  assert.equal(typeof res.body.error.code, 'string', `${label}: expected error.code string`);
  assert.equal(typeof res.body.error.message, 'string', `${label}: expected error.message string`);
  assert.ok(!('stack' in res.body.error), `${label}: must never expose stack trace`);
}

function makeReport(overrides = {}) {
  return {
    itemName: 'Water Bottle',
    category: 'Bottle',
    color: 'Navy Blue',
    brand: 'Milton',
    location: 'Library',
    date: '2026-11-24',
    time: '16:00',
    description: `QA test report (${RUN_TAG})`,
    ...overrides,
  };
}

async function runCheck(suite, name, fn) {
  try {
    const detail = await fn();
    record(suite, name, 'PASS', detail || '');
    return true;
  } catch (err) {
    record(suite, name, 'FAIL', err.message);
    return false;
  }
}

async function checkRepoWorkspace() {
  const root = process.cwd();
  const serverFiles = fs.existsSync(path.join(root, 'server'))
    ? fs.readdirSync(path.join(root, 'server')).filter((f) => f !== '.gitkeep')
    : [];
  const clientFiles = fs.existsSync(path.join(root, 'client'))
    ? fs.readdirSync(path.join(root, 'client')).filter((f) => f !== '.gitkeep')
    : [];

  if (serverFiles.length === 0) {
    record('Preflight', 'Server implementation present', 'BLOCKED', 'server/ contains only .gitkeep (Member 2 pending)');
  } else {
    record('Preflight', 'Server implementation present', 'PASS', `${serverFiles.length} entries in server/`);
  }

  if (clientFiles.length === 0) {
    record('Preflight', 'Client implementation present', 'BLOCKED', 'client/ contains only .gitkeep (Member 4 pending)');
  } else {
    record('Preflight', 'Client implementation present', 'PASS', `${clientFiles.length} entries in client/`);
  }
}

async function checkHealth() {
  try {
    const res = await request('/health');
    assert.equal(res.status, 200, `expected 200, got ${res.status}`);
    record('Preflight', 'GET /api/health', 'PASS', JSON.stringify(res.body));
    return true;
  } catch (err) {
    record('Preflight', 'GET /api/health', 'BLOCKED', `API unreachable at ${API_BASE} (${err.message})`);
    return false;
  }
}

async function runBackendTests() {
  let lostId = null;
  let foundId = null;

  await runCheck('Backend', 'POST /api/reports/lost creates LOST report', async () => {
    const res = await request('/reports/lost', {
      method: 'POST',
      body: JSON.stringify(makeReport()),
    });
    assert.equal(res.status, 201, `expected 201, got ${res.status}`);
    assert.ok(res.body?.data?._id, 'missing _id');
    assert.equal(res.body.data.type, 'LOST');
    assert.equal(res.body.data.status, 'ACTIVE');
    lostId = res.body.data._id;
    return `_id=${lostId}`;
  });

  await runCheck('Backend', 'POST /api/reports/found creates FOUND report', async () => {
    const res = await request('/reports/found', {
      method: 'POST',
      body: JSON.stringify(makeReport({ color: 'Blue', itemName: 'Water Bottle' })),
    });
    assert.equal(res.status, 201, `expected 201, got ${res.status}`);
    assert.ok(res.body?.data?._id, 'missing _id');
    assert.equal(res.body.data.type, 'FOUND');
    assert.equal(res.body.data.status, 'ACTIVE');
    foundId = res.body.data._id;
    return `_id=${foundId}`;
  });

  await runCheck('Backend', 'Missing optional brand ("") accepted', async () => {
    const res = await request('/reports/lost', {
      method: 'POST',
      body: JSON.stringify(makeReport({ brand: '' })),
    });
    assert.equal(res.status, 201, `expected 201, got ${res.status}`);
    assert.equal(res.body?.data?.brand, '');
  });

  await runCheck('Backend', 'Invalid request (missing required fields) returns 400', async () => {
    const res = await request('/reports/lost', {
      method: 'POST',
      body: JSON.stringify({ itemName: 'Only Name' }),
    });
    assertErrorEnvelope(res, 400, 'missing required fields');
  });

  await runCheck('Backend', 'Conflicting type on /api/reports/lost rejected with 400', async () => {
    const res = await request('/reports/lost', {
      method: 'POST',
      body: JSON.stringify(makeReport({ type: 'FOUND' })),
    });
    assertErrorEnvelope(res, 400, 'conflicting type');
  });

  await runCheck('Backend', 'GET /api/reports returns paginated collection', async () => {
    const res = await request('/reports?page=1&limit=10');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body?.data), 'data must be an array');
    assert.ok(res.body?.pagination && typeof res.body.pagination.total === 'number', 'missing pagination');
    return `total=${res.body.pagination.total}`;
  });

  await runCheck('Backend', 'GET /api/reports/:id returns report details', async () => {
    assert.ok(lostId, 'prerequisite lost report missing');
    const res = await request(`/reports/${lostId}`);
    assert.equal(res.status, 200);
    assert.equal(res.body?.data?._id, lostId);
  });

  await runCheck('Backend', 'GET /api/reports/:id missing ID returns 404', async () => {
    const res = await request('/reports/000000000000000000000000');
    assertErrorEnvelope(res, 404, 'missing report');
  });

  await runCheck('Backend', 'PATCH /api/reports/:id/status updates status to REUNITED', async () => {
    assert.ok(foundId, 'prerequisite found report missing');
    const res = await request(`/reports/${foundId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'REUNITED' }),
    });
    assert.equal(res.status, 200);
    assert.equal(res.body?.data?.status, 'REUNITED');
  });

  await runCheck('Backend', 'PATCH /api/reports/:id/status rejects invalid status with 400', async () => {
    assert.ok(lostId, 'prerequisite lost report missing');
    const res = await request(`/reports/${lostId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'CLOSED' }),
    });
    assertErrorEnvelope(res, 400, 'invalid status');
  });
}

async function createPair(lostOverrides, foundOverrides) {
  const [lostRes, foundRes] = await Promise.all([
    request('/reports/lost', { method: 'POST', body: JSON.stringify(makeReport(lostOverrides)) }),
    request('/reports/found', { method: 'POST', body: JSON.stringify(makeReport(foundOverrides)) }),
  ]);
  assert.equal(lostRes.status, 201, `lost create failed: ${JSON.stringify(lostRes.body)}`);
  assert.equal(foundRes.status, 201, `found create failed: ${JSON.stringify(foundRes.body)}`);
  return { lost: lostRes.body.data, found: foundRes.body.data };
}

function findMatchEntry(matches, targetId) {
  return matches.find((m) => m.report?._id === targetId);
}

function assertMatchEnvelope(matches) {
  assert.ok(Array.isArray(matches), 'matches data must be an array');
  for (let i = 0; i < matches.length; i += 1) {
    const entry = matches[i];
    assert.ok(entry.report && entry.report._id, 'match entry missing report');
    assert.equal(entry.report.status, 'ACTIVE', 'match must only include ACTIVE reports');
    assert.equal(typeof entry.score, 'number', 'match score must be numeric');
    assert.ok(entry.score >= 0 && entry.score <= 1, `score ${entry.score} out of [0,1]`);
    if (i > 0) {
      assert.ok(matches[i - 1].score >= entry.score, 'matches must be sorted descending by score');
    }
  }
}

async function runMatchingTests() {
  // Scenario 1: Navy Bottle vs Blue Water Bottle
  await runCheck('Matching', '1. Navy Bottle vs Blue Water Bottle', async () => {
    const { lost, found } = await createPair(
      { itemName: 'Navy Bottle', category: 'Bottle', color: 'Navy', brand: 'HydroFlask', location: 'Library', date: '2026-11-20' },
      { itemName: 'Blue Water Bottle', category: 'Bottle', color: 'Blue', brand: 'HydroFlask', location: 'Library', date: '2026-11-20' },
    );
    const res = await request(`/reports/${lost._id}/matches`);
    assert.equal(res.status, 200);
    assertMatchEnvelope(res.body.data);
    const match = findMatchEntry(res.body.data, found._id);
    assert.ok(match && match.score >= 0.5, `expected match >= 0.5, got ${match?.score}`);
    return `score=${match.score}`;
  });

  // Scenario 2: Grey Hoodie vs Gray Sweatshirt
  await runCheck('Matching', '2. Grey Hoodie vs Gray Sweatshirt', async () => {
    const { lost, found } = await createPair(
      { itemName: 'Grey Hoodie', category: 'Clothing', color: 'Grey', brand: 'Nike', location: 'Student Center', date: '2026-11-21' },
      { itemName: 'Gray Sweatshirt', category: 'Clothing', color: 'Gray', brand: 'Nike', location: 'Student Center', date: '2026-11-21' },
    );
    const res = await request(`/reports/${lost._id}/matches`);
    assert.equal(res.status, 200);
    assertMatchEnvelope(res.body.data);
    const match = findMatchEntry(res.body.data, found._id);
    assert.ok(match && match.score >= 0.5, `expected match >= 0.5, got ${match?.score}`);
    return `score=${match.score}`;
  });

  // Scenario 3: Black Backpack vs Black Bag
  await runCheck('Matching', '3. Black Backpack vs Black Bag', async () => {
    const { lost, found } = await createPair(
      { itemName: 'Black Backpack', category: 'Bag', color: 'Black', brand: 'JanSport', location: 'Cafeteria', date: '2026-11-22' },
      { itemName: 'Black Bag', category: 'Bag', color: 'Black', brand: 'JanSport', location: 'Cafeteria', date: '2026-11-22' },
    );
    const res = await request(`/reports/${lost._id}/matches`);
    assert.equal(res.status, 200);
    assertMatchEnvelope(res.body.data);
    const match = findMatchEntry(res.body.data, found._id);
    assert.ok(match && match.score >= 0.5, `expected match >= 0.5, got ${match?.score}`);
    return `score=${match.score}`;
  });

  // Scenario 4: Unrelated items
  await runCheck('Matching', '4. Unrelated items score low or excluded', async () => {
    const { lost, found } = await createPair(
      { itemName: 'Silver MacBook Pro', category: 'Electronics', color: 'Silver', brand: 'Apple', location: 'Engineering Lab', date: '2026-11-22' },
      { itemName: 'Red Umbrella', category: 'Accessory', color: 'Red', brand: 'Totes', location: 'Main Gate', date: '2026-11-10' },
    );
    const res = await request(`/reports/${lost._id}/matches`);
    assert.equal(res.status, 200);
    assertMatchEnvelope(res.body.data);
    const match = findMatchEntry(res.body.data, found._id);
    const score = match ? match.score : 0;
    assert.ok(score < 0.3, `unrelated items scored too high: ${score}`);
    return `score=${score}`;
  });

  // Scenario 5: Different locations
  await runCheck('Matching', '5. Different locations score lower than same location', async () => {
    const same = await createPair(
      { itemName: 'Wireless Earbuds', category: 'Electronics', color: 'White', brand: 'Apple', location: 'Gym', date: '2026-11-22' },
      { itemName: 'Wireless Earbuds', category: 'Electronics', color: 'White', brand: 'Apple', location: 'Gym', date: '2026-11-22' },
    );
    const diff = await request('/reports/found', {
      method: 'POST',
      body: JSON.stringify(makeReport({
        itemName: 'Wireless Earbuds',
        category: 'Electronics',
        color: 'White',
        brand: 'Apple',
        location: 'Parking Lot D',
        date: '2026-11-22',
      })),
    });
    const res = await request(`/reports/${same.lost._id}/matches`);
    assert.equal(res.status, 200);
    const sameScore = findMatchEntry(res.body.data, same.found._id)?.score ?? 0;
    const diffScore = findMatchEntry(res.body.data, diff.body.data._id)?.score ?? 0;
    assert.ok(sameScore > diffScore, `expected same-location (${sameScore}) > diff-location (${diffScore})`);
    return `same=${sameScore}, diff=${diffScore}`;
  });

  // Scenario 6: Different dates
  await runCheck('Matching', '6. Different dates score lower than close dates', async () => {
    const same = await createPair(
      { itemName: 'Leather Wallet', category: 'Wallet', color: 'Brown', brand: 'Fossil', location: 'Auditorium', date: '2026-11-23' },
      { itemName: 'Leather Wallet', category: 'Wallet', color: 'Brown', brand: 'Fossil', location: 'Auditorium', date: '2026-11-23' },
    );
    const far = await request('/reports/found', {
      method: 'POST',
      body: JSON.stringify(makeReport({
        itemName: 'Leather Wallet',
        category: 'Wallet',
        color: 'Brown',
        brand: 'Fossil',
        location: 'Auditorium',
        date: '2026-09-01',
      })),
    });
    const res = await request(`/reports/${same.lost._id}/matches`);
    assert.equal(res.status, 200);
    const closeScore = findMatchEntry(res.body.data, same.found._id)?.score ?? 0;
    const farScore = findMatchEntry(res.body.data, far.body.data._id)?.score ?? 0;
    assert.ok(closeScore > farScore, `expected close-date (${closeScore}) > far-date (${farScore})`);
    return `close=${closeScore}, far=${farScore}`;
  });

  // Scenario 7: Missing brand
  await runCheck('Matching', '7. Missing brand still matches gracefully', async () => {
    const { lost, found } = await createPair(
      { itemName: 'Steel Water Bottle', category: 'Bottle', color: 'Silver', brand: '', location: 'Library', date: '2026-11-23' },
      { itemName: 'Steel Water Bottle', category: 'Bottle', color: 'Silver', brand: 'Milton', location: 'Library', date: '2026-11-23' },
    );
    const res = await request(`/reports/${lost._id}/matches`);
    assert.equal(res.status, 200);
    assertMatchEnvelope(res.body.data);
    const match = findMatchEntry(res.body.data, found._id);
    assert.ok(match && match.score >= 0.5, `expected match >= 0.5 without brand, got ${match?.score}`);
    return `score=${match.score}`;
  });

  // Scenario 8: Reunited reports excluded from active matches
  await runCheck('Matching', '8. Reunited reports excluded from matches', async () => {
    const { lost, found } = await createPair(
      { itemName: 'Calculator', category: 'Electronics', color: 'Black', brand: 'Casio', location: 'Math Block', date: '2026-11-23' },
      { itemName: 'Calculator', category: 'Electronics', color: 'Black', brand: 'Casio', location: 'Math Block', date: '2026-11-23' },
    );
    const patchRes = await request(`/reports/${found._id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'REUNITED' }),
    });
    assert.equal(patchRes.status, 200);
    const res = await request(`/reports/${lost._id}/matches`);
    assert.equal(res.status, 200);
    const match = findMatchEntry(res.body.data, found._id);
    assert.equal(match, undefined, 'REUNITED report must not appear in active matches');
  });
}

async function runDataAndAnalyticsTests() {
  await runCheck('Data', 'At least 150 persisted reports exist', async () => {
    const res = await request('/reports?page=1&limit=1');
    assert.equal(res.status, 200);
    const total = res.body?.pagination?.total ?? 0;
    assert.ok(total >= 150, `expected >= 150 reports, got ${total}`);
    return `total=${total}`;
  });

  await runCheck('Analytics', 'GET /api/analytics/overview returns valid structure', async () => {
    const res = await request('/analytics/overview');
    assert.equal(res.status, 200);
    assert.ok(res.body?.data && typeof res.body.data === 'object');
    return JSON.stringify(res.body.data);
  });

  await runCheck('Analytics', 'GET /api/analytics/hotspots returns non-empty hotspot counts', async () => {
    const res = await request('/analytics/hotspots');
    assert.equal(res.status, 200);
    assert.ok(res.body?.data);
    return JSON.stringify(res.body.data).slice(0, 120);
  });

  await runCheck('Analytics', 'GET /api/analytics/items returns item/category counts', async () => {
    const res = await request('/analytics/items');
    assert.equal(res.status, 200);
    assert.ok(res.body?.data);
    return JSON.stringify(res.body.data).slice(0, 120);
  });
}

async function runE2EGreyHoodieTest() {
  await runCheck('E2E', 'Grey Hoodie: submit -> store -> match -> reunite -> analytics', async () => {
    const beforeOverview = await request('/analytics/overview');
    assert.equal(beforeOverview.status, 200);

    const foundRes = await request('/reports/found', {
      method: 'POST',
      body: JSON.stringify(makeReport({
        itemName: 'Grey Hoodie',
        category: 'Clothing',
        color: 'Grey',
        brand: 'H&M',
        location: 'Library',
        date: '2026-11-24',
        time: '14:30',
        description: `E2E found hoodie (${RUN_TAG})`,
      })),
    });
    assert.equal(foundRes.status, 201);
    const foundId = foundRes.body.data._id;

    const lostRes = await request('/reports/lost', {
      method: 'POST',
      body: JSON.stringify(makeReport({
        itemName: 'Grey Hoodie',
        category: 'Clothing',
        color: 'Grey',
        brand: 'H&M',
        location: 'Library',
        date: '2026-11-24',
        time: '15:00',
        description: `E2E lost hoodie (${RUN_TAG})`,
      })),
    });
    assert.equal(lostRes.status, 201);
    const lostId = lostRes.body.data._id;

    const stored = await request(`/reports/${lostId}`);
    assert.equal(stored.status, 200);

    const matchesRes = await request(`/reports/${lostId}/matches`);
    assert.equal(matchesRes.status, 200);
    assertMatchEnvelope(matchesRes.body.data);
    const match = findMatchEntry(matchesRes.body.data, foundId);
    assert.ok(match && match.score >= 0.7, `expected strong match for Grey Hoodie, got ${match?.score}`);

    const reuniteLost = await request(`/reports/${lostId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'REUNITED' }),
    });
    assert.equal(reuniteLost.status, 200);
    assert.equal(reuniteLost.body.data.status, 'REUNITED');

    const afterOverview = await request('/analytics/overview');
    assert.equal(afterOverview.status, 200);
    return `lost=${lostId}, found=${foundId}, score=${match.score}`;
  });
}

async function main() {
  console.log(`BLUE QA Runner (${READ_ONLY ? 'READ-ONLY' : 'FULL'}) -> ${API_BASE}`);
  await checkRepoWorkspace();
  const healthy = await checkHealth();

  if (!healthy) {
    console.log('\nSummary: API not reachable. Remaining API, matching, analytics, and E2E checks are BLOCKED.');
    process.exitCode = 1;
    return;
  }

  if (!READ_ONLY) {
    await runBackendTests();
    await runMatchingTests();
  }
  await runDataAndAnalyticsTests();
  if (!READ_ONLY) {
    await runE2EGreyHoodieTest();
  }

  const failed = results.filter((r) => r.status === 'FAIL').length;
  const blocked = results.filter((r) => r.status === 'BLOCKED').length;
  const passed = results.filter((r) => r.status === 'PASS').length;
  console.log(`\nSummary: ${passed} passed, ${failed} failed, ${blocked} blocked.`);
  if (failed > 0 || blocked > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error('Fatal QA runner error:', err);
  process.exitCode = 1;
});
