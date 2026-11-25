import assert from 'assert';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';
import { Report } from '../models/Report.js';
import {
  evaluateMatch,
  rankMatches,
  normalizeColor,
  normalizeItem,
} from '../services/matchingService.js';
import { REPORT_TYPES, REPORT_STATUSES } from '../../shared/report.js';

async function runTests() {
  console.log('\n==================================================');
  console.log('  PROJECT BLUE - BACKEND TEST SUITE (MEMBER 2)');
  console.log('==================================================\n');

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] ${name}`);
      console.error(`       Error: ${err.message}`);
      failed++;
    }
  }

  async function testAsync(name, fn) {
    try {
      await fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] ${name}`);
      console.error(`       Error: ${err.message}`);
      failed++;
    }
  }

  // --- UNIT TESTS: Matching Logic & Invariants ---

  test('Semantic Normalization: Color aliases map to canonical colors', () => {
    assert.strictEqual(normalizeColor('Navy'), 'blue');
    assert.strictEqual(normalizeColor('Navy Blue'), 'blue');
    assert.strictEqual(normalizeColor('Dark Blue'), 'blue');
    assert.strictEqual(normalizeColor('Grey'), 'gray');
    assert.strictEqual(normalizeColor('Charcoal'), 'gray');
  });

  test('Semantic Normalization: Item aliases map to canonical categories', () => {
    assert.strictEqual(normalizeItem('Hoodie'), 'hoodie');
    assert.strictEqual(normalizeItem('Sweatshirt'), 'hoodie');
    assert.strictEqual(normalizeItem('Bottle'), 'water bottle');
    assert.strictEqual(normalizeItem('Water Bottle'), 'water bottle');
    assert.strictEqual(normalizeItem('Backpack'), 'bag');
  });

  test('TEST 1: Lost Navy Bottle vs Found Blue Water Bottle yields a strong match (>= 75)', () => {
    const lost = {
      type: REPORT_TYPES.LOST,
      status: REPORT_STATUSES.ACTIVE,
      itemName: 'Navy Bottle',
      category: 'Bottle',
      color: 'Navy',
      location: 'Central Library',
      date: '2026-11-25',
      time: '14:00',
      description: 'Lost my insulated bottle near study desk',
      brand: 'Milton',
    };

    const found = {
      type: REPORT_TYPES.FOUND,
      status: REPORT_STATUSES.ACTIVE,
      itemName: 'Blue Water Bottle',
      category: 'Water Bottle',
      color: 'Blue',
      location: 'Central Library',
      date: '2026-11-25',
      time: '15:30',
      description: 'Found insulated blue bottle on 2nd floor desk',
      brand: 'Milton',
    };

    const res = evaluateMatch(lost, found);
    assert.strictEqual(res.compatible, true);
    assert.ok(res.matchScore >= 75, `Expected score >= 75, got ${res.matchScore}`);
    assert.ok(res.score >= 0.75, `Expected normalized score >= 0.75, got ${res.score}`);
    assert.ok(res.reasons.length >= 3, 'Expected at least 3 matching reasons');
    console.log(`       Test 1 Score: ${res.matchScore}/100, Reasons: ${JSON.stringify(res.reasons)}`);
  });

  test('TEST 2: Lost Grey Hoodie vs Found Gray Sweatshirt yields a strong match (>= 75)', () => {
    const lost = {
      type: REPORT_TYPES.LOST,
      status: REPORT_STATUSES.ACTIVE,
      itemName: 'Grey Hoodie',
      category: 'Clothing',
      color: 'Grey',
      location: 'Student Cafeteria',
      date: '2026-11-24',
      time: '12:00',
      description: 'Warm fleece pullover sweatshirt',
      brand: 'Nike',
    };

    const found = {
      type: REPORT_TYPES.FOUND,
      status: REPORT_STATUSES.ACTIVE,
      itemName: 'Gray Sweatshirt',
      category: 'Hoodie',
      color: 'Gray',
      location: 'Student Cafeteria',
      date: '2026-11-24',
      time: '13:00',
      description: 'Found warm fleece hoodie under cafeteria chair',
      brand: 'Nike',
    };

    const res = evaluateMatch(lost, found);
    assert.strictEqual(res.compatible, true);
    assert.ok(res.matchScore >= 75, `Expected score >= 75, got ${res.matchScore}`);
    console.log(`       Test 2 Score: ${res.matchScore}/100, Reasons: ${JSON.stringify(res.reasons)}`);
  });

  test('TEST 3: Lost Laptop vs Found Water Bottle yields zero match (completely incompatible)', () => {
    const lost = {
      type: REPORT_TYPES.LOST,
      status: REPORT_STATUSES.ACTIVE,
      itemName: 'MacBook Pro Laptop',
      category: 'Electronics',
      color: 'Space Gray',
      location: 'Library',
      date: '2026-11-25',
      time: '10:00',
      description: 'Silver apple laptop',
      brand: 'Apple',
    };

    const found = {
      type: REPORT_TYPES.FOUND,
      status: REPORT_STATUSES.ACTIVE,
      itemName: 'Water Bottle',
      category: 'Bottle',
      color: 'Space Gray',
      location: 'Library',
      date: '2026-11-25',
      time: '10:30',
      description: 'Insulated bottle',
      brand: 'Apple',
    };

    const res = evaluateMatch(lost, found);
    assert.strictEqual(res.compatible, false);
    assert.strictEqual(res.matchScore, 0);
  });

  test('TEST 4: LOST report vs LOST report must NEVER match', () => {
    const lost1 = {
      type: REPORT_TYPES.LOST,
      status: REPORT_STATUSES.ACTIVE,
      itemName: 'Blue Bottle',
      category: 'Bottle',
    };
    const lost2 = {
      type: REPORT_TYPES.LOST,
      status: REPORT_STATUSES.ACTIVE,
      itemName: 'Blue Bottle',
      category: 'Bottle',
    };
    const res = evaluateMatch(lost1, lost2);
    assert.strictEqual(res.compatible, false);
    assert.strictEqual(res.matchScore, 0);
  });

  test('TEST 5: FOUND report vs FOUND report must NEVER match', () => {
    const found1 = {
      type: REPORT_TYPES.FOUND,
      status: REPORT_STATUSES.ACTIVE,
      itemName: 'Blue Bottle',
      category: 'Bottle',
    };
    const found2 = {
      type: REPORT_TYPES.FOUND,
      status: REPORT_STATUSES.ACTIVE,
      itemName: 'Blue Bottle',
      category: 'Bottle',
    };
    const res = evaluateMatch(found1, found2);
    assert.strictEqual(res.compatible, false);
    assert.strictEqual(res.matchScore, 0);
  });

  test('TEST 6: REUNITED candidate is excluded from matching', () => {
    const lost = {
      type: REPORT_TYPES.LOST,
      status: REPORT_STATUSES.ACTIVE,
      itemName: 'Blue Bottle',
      category: 'Bottle',
      color: 'Blue',
      location: 'Library',
      date: '2026-11-25',
      time: '10:00',
      description: 'test',
    };
    const reunitedFound = {
      type: REPORT_TYPES.FOUND,
      status: REPORT_STATUSES.REUNITED,
      itemName: 'Blue Bottle',
      category: 'Bottle',
      color: 'Blue',
      location: 'Library',
      date: '2026-11-25',
      time: '10:00',
      description: 'test',
    };
    const res = evaluateMatch(lost, reunitedFound);
    assert.strictEqual(res.compatible, false);
    assert.strictEqual(res.matchScore, 0);
  });

  test('TEST 7: Missing brand does not reject match or cause crash', () => {
    const lost = {
      type: REPORT_TYPES.LOST,
      status: REPORT_STATUSES.ACTIVE,
      itemName: 'Blue Bottle',
      category: 'Bottle',
      color: 'Blue',
      location: 'Library',
      date: '2026-11-25',
      time: '10:00',
      description: 'bottle',
      brand: '',
    };
    const found = {
      type: REPORT_TYPES.FOUND,
      status: REPORT_STATUSES.ACTIVE,
      itemName: 'Blue Bottle',
      category: 'Bottle',
      color: 'Blue',
      location: 'Library',
      date: '2026-11-25',
      time: '10:00',
      description: 'bottle',
      brand: '',
    };
    const res = evaluateMatch(lost, found);
    assert.strictEqual(res.compatible, true);
    assert.ok(res.matchScore >= 70, `Expected score >= 70, got ${res.matchScore}`);
  });

  test('TEST 8: Missing description continues matching normally', () => {
    const lost = {
      type: REPORT_TYPES.LOST,
      status: REPORT_STATUSES.ACTIVE,
      itemName: 'Blue Bottle',
      category: 'Bottle',
      color: 'Blue',
      location: 'Library',
      date: '2026-11-25',
      time: '10:00',
      description: '',
      brand: 'Milton',
    };
    const found = {
      type: REPORT_TYPES.FOUND,
      status: REPORT_STATUSES.ACTIVE,
      itemName: 'Blue Bottle',
      category: 'Bottle',
      color: 'Blue',
      location: 'Library',
      date: '2026-11-25',
      time: '10:00',
      description: '',
      brand: 'Milton',
    };
    const res = evaluateMatch(lost, found);
    assert.strictEqual(res.compatible, true);
    assert.ok(res.matchScore >= 80, `Expected score >= 80, got ${res.matchScore}`);
  });

  test('TEST 10: Score calculation is always between 0 and 100', () => {
    const lost = {
      type: REPORT_TYPES.LOST,
      status: REPORT_STATUSES.ACTIVE,
      itemName: 'Earphones',
      category: 'Audio',
      color: 'White',
      location: 'Auditorium',
      date: '2026-11-20',
      time: '17:00',
      description: 'AirPods Pro white case',
      brand: 'Apple',
    };
    const found = {
      type: REPORT_TYPES.FOUND,
      status: REPORT_STATUSES.ACTIVE,
      itemName: 'Earbuds',
      category: 'Electronics',
      color: 'White',
      location: 'Auditorium',
      date: '2026-11-20',
      time: '18:00',
      description: 'Found white earbuds case in auditorium row F',
      brand: 'Apple',
    };
    const res = evaluateMatch(lost, found);
    assert.ok(res.matchScore >= 0 && res.matchScore <= 100);
    assert.ok(res.score >= 0 && res.score <= 1);
  });

  test('TEST 11: Ranking sorts candidates in descending score order', () => {
    const target = {
      _id: 'target-1',
      type: REPORT_TYPES.LOST,
      status: REPORT_STATUSES.ACTIVE,
      itemName: 'Black Backpack',
      category: 'Bag',
      color: 'Black',
      location: 'Engineering Block',
      date: '2026-11-25',
      time: '09:00',
      brand: 'Wildcraft',
      description: 'Lost laptop backpack',
    };

    const candidates = [
      {
        _id: 'cand-low',
        type: REPORT_TYPES.FOUND,
        status: REPORT_STATUSES.ACTIVE,
        itemName: 'Black Backpack',
        category: 'Bag',
        color: 'Black',
        location: 'Cafeteria', // Different location
        date: '2026-11-10', // 15 days ago
        time: '14:00',
        brand: 'Nike',
        description: 'Random bag',
      },
      {
        _id: 'cand-high',
        type: REPORT_TYPES.FOUND,
        status: REPORT_STATUSES.ACTIVE,
        itemName: 'Black Backpack',
        category: 'Bag',
        color: 'Black',
        location: 'Engineering Block', // Same location
        date: '2026-11-25', // Same day
        time: '10:00',
        brand: 'Wildcraft', // Same brand
        description: 'Wildcraft laptop bag found in engineering block',
      },
    ];

    const ranked = rankMatches(target, candidates);
    assert.strictEqual(ranked.length, 2);
    assert.strictEqual(ranked[0].reportId, 'cand-high');
    assert.strictEqual(ranked[1].reportId, 'cand-low');
    assert.ok(ranked[0].matchScore > ranked[1].matchScore);
  });

  // --- DATABASE & INTEGRATION TESTS ---

  await testAsync('MongoDB Connection & Schema Validation (TEST 9)', async () => {
    await connectDB();
    // Clear test collection
    await Report.deleteMany({ location: 'TestEnv' });

    // Missing required itemName must fail validation
    let validationFailed = false;
    try {
      const invalidReport = new Report({
        type: REPORT_TYPES.LOST,
        category: 'Test',
        color: 'Red',
        location: 'TestEnv',
        date: '2026-11-25',
        time: '10:00',
        description: 'Test without itemName',
      });
      await invalidReport.save();
    } catch (err) {
      validationFailed = true;
    }
    assert.strictEqual(validationFailed, true, 'Report without itemName should fail validation');
  });

  await testAsync('TEST 12: Dynamic Creation & Bidirectional Immediate Matching', async () => {
    // Clear reports created during previous runs
    await Report.deleteMany({});

    // 1. Insert an existing FOUND report in DB
    const existingFound = await Report.create({
      itemName: 'Blue Water Bottle',
      category: 'Water Bottle',
      color: 'Navy Blue',
      brand: 'Milton',
      location: 'Main Library 2nd Floor',
      date: '2026-11-25',
      time: '14:30',
      description: 'Found insulated navy bottle on library table',
      type: REPORT_TYPES.FOUND,
      status: REPORT_STATUSES.ACTIVE,
    });

    // 2. Submit a new LOST report
    const newLost = await Report.create({
      itemName: 'Navy Bottle',
      category: 'Bottle',
      color: 'Navy',
      brand: 'Milton',
      location: 'Library',
      date: '2026-11-25',
      time: '14:00',
      description: 'Lost navy blue water bottle while studying',
      type: REPORT_TYPES.LOST,
      status: REPORT_STATUSES.ACTIVE,
    });

    // 3. Query candidate matches
    const candidates = await Report.find({
      type: REPORT_TYPES.FOUND,
      status: REPORT_STATUSES.ACTIVE,
    }).lean();

    const matches = rankMatches(newLost, candidates);

    assert.ok(matches.length >= 1, 'Should find at least 1 match');
    const bestMatch = matches[0];
    assert.strictEqual(String(bestMatch.reportId), String(existingFound._id));
    assert.ok(bestMatch.matchScore >= 80, `Expected score >= 80, got ${bestMatch.matchScore}`);
    assert.ok(bestMatch.reasons.length >= 3, 'Expected matching reasons');

    console.log(`       Dynamic Match Score: ${bestMatch.matchScore}, Reasons: ${bestMatch.reasons.join(', ')}`);

    // Clean up
    await Report.deleteMany({ _id: { $in: [existingFound._id, newLost._id] } });
  });

  await testAsync('Judge Gate Live Scenario: "Lost: grey hoodie, library, yesterday 4 PM"', async () => {
    // Pre-existing FOUND report in DB
    const foundHoodie = await Report.create({
      itemName: 'Gray Sweatshirt',
      category: 'Hoodie',
      color: 'Gray',
      brand: 'Puma',
      location: 'Library',
      date: '2026-11-24',
      time: '16:00',
      description: 'Found warm grey hoodie in reading lounge',
      type: REPORT_TYPES.FOUND,
      status: REPORT_STATUSES.ACTIVE,
    });

    // Judge's dynamic report entered live:
    const judgeReport = await Report.create({
      itemName: 'grey hoodie',
      category: 'Clothing',
      color: 'grey',
      brand: '',
      location: 'library',
      date: '2026-11-24',
      time: '16:00',
      description: 'Lost grey hoodie in library yesterday',
      type: REPORT_TYPES.LOST,
      status: REPORT_STATUSES.ACTIVE,
    });

    const activeFound = await Report.find({
      type: REPORT_TYPES.FOUND,
      status: REPORT_STATUSES.ACTIVE,
    }).lean();

    const matches = rankMatches(judgeReport, activeFound);
    assert.ok(matches.length >= 1, 'Judge report must find matches dynamically');
    assert.strictEqual(String(matches[0].reportId), String(foundHoodie._id));
    assert.ok(matches[0].matchScore >= 80, `Judge test score was ${matches[0].matchScore}`);

    console.log(`       Judge Gate Match Score: ${matches[0].matchScore}/100`);
    console.log(`       Reasons: ${matches[0].reasons.join(' | ')}`);

    // Clean up
    await Report.deleteMany({ _id: { $in: [foundHoodie._id, judgeReport._id] } });
  });

  await disconnectDB();

  console.log('\n==================================================');
  console.log(`  TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
