import assert from 'assert';
import app from '../server.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { Report } from '../models/Report.js';

let server;
const PORT = 5055;
const BASE_URL = `http://127.0.0.1:${PORT}/api`;

async function runApiTests() {
  console.log('\n==================================================');
  console.log('  PROJECT BLUE - HTTP API INTEGRATION TESTS');
  console.log('==================================================\n');

  await connectDB();
  await Report.deleteMany({});

  // Start temporary test server
  server = app.listen(PORT);
  console.log(`[Test Server] Listening on ${PORT}`);

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] ${name}`);
      console.error(`       ${err.message}`);
      failed++;
    }
  }

  // 1. Health check
  await test('GET /api/health returns UP status and database state', async () => {
    const res = await fetch(`${BASE_URL}/health`);
    const json = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.data.status, 'UP');
    assert.strictEqual(json.data.database, 'connected');
  });

  // 2. Create FOUND report first
  let foundReportId;
  await test('POST /api/reports/found creates FOUND report and sets type correctly', async () => {
    const payload = {
      itemName: 'Blue Water Bottle',
      category: 'Water Bottle',
      color: 'Navy Blue',
      brand: 'Milton',
      location: 'Central Library 1st Floor',
      date: '2026-11-25',
      time: '14:00',
      description: 'Found insulated blue water bottle near desk 12',
    };

    const res = await fetch(`${BASE_URL}/reports/found`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    assert.strictEqual(res.status, 201);
    assert.ok(json.data._id);
    assert.strictEqual(json.data.type, 'FOUND');
    assert.strictEqual(json.data.status, 'ACTIVE');
    assert.ok(Array.isArray(json.data.matches));
    foundReportId = json.data._id;
  });

  // 3. Create LOST report and verify immediate smart matching in response!
  let lostReportId;
  await test('POST /api/reports/lost creates LOST report and immediately returns matching found items', async () => {
    const payload = {
      itemName: 'Navy Bottle',
      category: 'Bottle',
      colour: 'Navy', // Testing colour alias
      brand: 'Milton',
      location: 'Library',
      date: '2026-11-25',
      time: '13:45',
      description: 'Lost my dark navy bottle while studying',
    };

    const res = await fetch(`${BASE_URL}/reports/lost`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    assert.strictEqual(res.status, 201);
    assert.ok(json.data._id);
    assert.strictEqual(json.data.type, 'LOST');
    assert.strictEqual(json.data.color, 'Navy');
    lostReportId = json.data._id;

    // Check immediate matches returned
    assert.ok(Array.isArray(json.data.matches));
    assert.ok(json.data.matches.length >= 1, 'Should immediately return at least one match');
    const topMatch = json.data.matches[0];
    assert.strictEqual(String(topMatch.reportId), String(foundReportId));
    assert.ok(topMatch.matchScore >= 80, `Expected score >= 80, got ${topMatch.matchScore}`);
    assert.ok(topMatch.reasons.length >= 3, 'Expected reasons for match');
  });

  // 4. Fetch matches via GET /api/reports/:id/matches
  await test('GET /api/reports/:id/matches returns ranked matches', async () => {
    const res = await fetch(`${BASE_URL}/reports/${lostReportId}/matches`);
    const json = await res.json();
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(json.data));
    assert.ok(json.data.length >= 1);
    assert.strictEqual(String(json.data[0].reportId), String(foundReportId));
  });

  // 5. Listing with filters & search
  await test('GET /api/reports supports pagination, type filtering, and text search', async () => {
    const res = await fetch(`${BASE_URL}/reports?type=LOST&limit=10`);
    const json = await res.json();
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(json.data));
    assert.strictEqual(json.data.length, 1);
    assert.strictEqual(json.data[0].type, 'LOST');
    assert.ok(json.pagination);
    assert.strictEqual(json.pagination.total, 1);

    // Search query
    const searchRes = await fetch(`${BASE_URL}/reports?q=bottle`);
    const searchJson = await searchRes.json();
    assert.strictEqual(searchJson.data.length, 2);
  });

  // 6. Get single report
  await test('GET /api/reports/:id fetches single report or 404', async () => {
    const res = await fetch(`${BASE_URL}/reports/${lostReportId}`);
    const json = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.data._id, lostReportId);

    const notFound = await fetch(`${BASE_URL}/reports/60d0fe4f5311236168a109ca`);
    assert.strictEqual(notFound.status, 404);
  });

  // 7. Update status to REUNITED and verify exclusion from matches
  await test('PATCH /api/reports/:id/status marks as REUNITED and excludes from future matches', async () => {
    const res = await fetch(`${BASE_URL}/reports/${foundReportId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'REUNITED' }),
    });

    const json = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.data.status, 'REUNITED');

    // Query matches again for lostReportId -> foundReportId should now be excluded!
    const matchesRes = await fetch(`${BASE_URL}/reports/${lostReportId}/matches`);
    const matchesJson = await matchesRes.json();
    assert.strictEqual(matchesRes.status, 200);
    assert.strictEqual(matchesJson.data.length, 0, 'Reunited item must be excluded from active matches');
  });

  // 8. Analytics endpoints
  await test('GET /api/analytics endpoints (overview, hotspots, items) return correct aggregations', async () => {
    const overviewRes = await fetch(`${BASE_URL}/analytics/overview`);
    const overview = await overviewRes.json();
    assert.strictEqual(overviewRes.status, 200);
    assert.strictEqual(overview.data.totalReports, 2);
    assert.strictEqual(overview.data.lostCount, 1);
    assert.strictEqual(overview.data.foundCount, 1);
    assert.strictEqual(overview.data.reunitedCount, 1);

    const hotspotsRes = await fetch(`${BASE_URL}/analytics/hotspots`);
    const hotspots = await hotspotsRes.json();
    assert.strictEqual(hotspotsRes.status, 200);
    assert.ok(Array.isArray(hotspots.data));

    const itemsRes = await fetch(`${BASE_URL}/analytics/items`);
    const items = await itemsRes.json();
    assert.strictEqual(itemsRes.status, 200);
    assert.ok(Array.isArray(items.data.mostLostItems));
  });

  // 9. Validation error tests
  await test('Validation errors conform to contract envelope { error: { code, message, details } }', async () => {
    const res = await fetch(`${BASE_URL}/reports/lost`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        itemName: '', // Invalid empty
      }),
    });

    const json = await res.json();
    assert.strictEqual(res.status, 400);
    assert.ok(json.error);
    assert.strictEqual(json.error.code, 'VALIDATION_ERROR');
    assert.ok(Array.isArray(json.error.details));
  });

  // Clean up
  await Report.deleteMany({});
  await disconnectDB();
  server.close(() => {
    console.log('\n==================================================');
    console.log(`  API TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('==================================================\n');
    process.exit(failed > 0 ? 1 : 0);
  });
}

runApiTests();
