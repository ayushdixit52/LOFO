import { REPORT_TYPES, REPORT_STATUSES } from '../../shared/report.js';

// ==========================================
// Semantic Synonyms & Normalization Maps
// ==========================================

const COLOR_SYNONYMS = {
  navy: 'blue',
  'navy blue': 'blue',
  'dark blue': 'blue',
  'light blue': 'blue',
  'sky blue': 'blue',
  cyan: 'blue',
  teal: 'blue',
  azure: 'blue',
  grey: 'gray',
  charcoal: 'gray',
  silver: 'gray',
  slate: 'gray',
  ash: 'gray',
  crimson: 'red',
  maroon: 'red',
  scarlet: 'red',
  ruby: 'red',
  emerald: 'green',
  olive: 'green',
  lime: 'green',
  mint: 'green',
  violet: 'purple',
  magenta: 'purple',
  lavender: 'purple',
  lilac: 'purple',
  beige: 'brown',
  tan: 'brown',
  khaki: 'brown',
  coffee: 'brown',
  gold: 'yellow',
  amber: 'yellow',
  mustard: 'yellow',
};

const ITEM_SYNONYMS = {
  hoodie: 'hoodie',
  sweatshirt: 'hoodie',
  sweater: 'hoodie',
  jacket: 'jacket',
  coat: 'jacket',
  bottle: 'water bottle',
  'water bottle': 'water bottle',
  flask: 'water bottle',
  thermos: 'water bottle',
  sipper: 'water bottle',
  backpack: 'bag',
  bag: 'bag',
  rucksack: 'bag',
  knapsack: 'bag',
  bookbag: 'bag',
  handbag: 'bag',
  tote: 'bag',
  'tote bag': 'bag',
  earphones: 'earphones',
  earbuds: 'earphones',
  headphones: 'earphones',
  airpods: 'earphones',
  headset: 'earphones',
  'id card': 'id card',
  'student id': 'id card',
  'identity card': 'id card',
  badge: 'id card',
  card: 'id card',
  charger: 'charger',
  adapter: 'charger',
  'power adapter': 'charger',
  'power brick': 'charger',
  'charging cable': 'charger',
  cable: 'charger',
  laptop: 'laptop',
  notebook: 'laptop',
  macbook: 'laptop',
  computer: 'laptop',
  phone: 'phone',
  smartphone: 'phone',
  mobile: 'phone',
  iphone: 'phone',
  android: 'phone',
  watch: 'watch',
  smartwatch: 'watch',
  'wrist watch': 'watch',
  spectacles: 'glasses',
  glasses: 'glasses',
  eyeglasses: 'glasses',
  sunglasses: 'glasses',
  specs: 'glasses',
  keys: 'keys',
  keychain: 'keys',
  'car keys': 'keys',
  'bike keys': 'keys',
};

// ==========================================
// Helper Utility Functions
// ==========================================

export function cleanText(str) {
  if (!str || typeof str !== 'string') return '';
  return str.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function normalizeColor(colorStr) {
  const cleaned = cleanText(colorStr);
  if (!cleaned) return '';
  if (COLOR_SYNONYMS[cleaned]) return COLOR_SYNONYMS[cleaned];

  for (const [syn, canonical] of Object.entries(COLOR_SYNONYMS)) {
    if (cleaned.includes(syn)) return canonical;
  }
  return cleaned;
}

export function normalizeItem(itemStr) {
  const cleaned = cleanText(itemStr);
  if (!cleaned) return '';
  if (ITEM_SYNONYMS[cleaned]) return ITEM_SYNONYMS[cleaned];

  for (const [syn, canonical] of Object.entries(ITEM_SYNONYMS)) {
    if (new RegExp(`\\b${syn}\\b`, 'i').test(cleaned)) {
      return canonical;
    }
  }
  return cleaned;
}

export function tokenize(str) {
  const cleaned = cleanText(str);
  if (!cleaned) return [];
  return cleaned.split(' ').filter((w) => w.length > 1);
}

/**
 * Jaccard token overlap similarity between 0 and 1.
 */
export function tokenOverlap(str1, str2) {
  const t1 = new Set(tokenize(str1));
  const t2 = new Set(tokenize(str2));
  if (t1.size === 0 || t2.size === 0) return 0;

  let intersection = 0;
  for (const word of t1) {
    if (t2.has(word)) intersection++;
  }
  const union = new Set([...t1, ...t2]).size;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Levenshtein distance based string similarity (0 to 1).
 */
export function stringSimilarity(s1, s2) {
  const a = cleanText(s1);
  const b = cleanText(s2);
  if (a === b) return 1;
  if (!a || !b) return 0;
  if (a.includes(b) || b.includes(a)) {
    const minLen = Math.min(a.length, b.length);
    const maxLen = Math.max(a.length, b.length);
    return minLen / maxLen;
  }

  const matrix = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  const distance = matrix[a.length][b.length];
  const maxLen = Math.max(a.length, b.length);
  return 1 - distance / maxLen;
}

// ==========================================
// Individual Weighted Scorers
// ==========================================

/**
 * 1. Item / Category Similarity (Weight: 30 points)
 */
export function scoreItemAndCategory(target, candidate) {
  const targetNormItem = normalizeItem(target.itemName);
  const candNormItem = normalizeItem(candidate.itemName);
  const targetNormCat = normalizeItem(target.category);
  const candNormCat = normalizeItem(candidate.category);

  // Direct normalized match between items or item & category
  const isDirectMatch =
    targetNormItem === candNormItem ||
    targetNormItem === candNormCat ||
    targetNormCat === candNormItem ||
    (targetNormCat && targetNormCat === candNormCat);

  if (isDirectMatch) {
    return {
      points: 30,
      reason: `Matching item/category: "${candidate.itemName}"`,
      mismatch: null,
    };
  }

  // Fuzzy check on item names
  const sim = Math.max(
    stringSimilarity(target.itemName, candidate.itemName),
    tokenOverlap(target.itemName, candidate.itemName)
  );

  if (sim >= 0.7) {
    const pts = Math.round(30 * sim);
    return {
      points: pts,
      reason: `Similar item name: "${candidate.itemName}" (${pts}/30)`,
      mismatch: null,
    };
  }

  return {
    points: 0,
    reason: null,
    mismatch: `Different item: "${target.itemName}" vs "${candidate.itemName}"`,
  };
}

/**
 * 2. Colour Similarity (Weight: 20 points)
 */
export function scoreColor(target, candidate) {
  const c1 = normalizeColor(target.color || target.colour);
  const c2 = normalizeColor(candidate.color || candidate.colour);

  if (!c1 || !c2) {
    return { points: 0, reason: null, mismatch: null };
  }

  if (c1 === c2) {
    const originalText = candidate.color || candidate.colour;
    return {
      points: 20,
      reason: `Matching color: ${originalText} (normalized to ${c2})`,
      mismatch: null,
    };
  }

  // Token or substring check (e.g. "black & white" vs "white")
  if (c1.includes(c2) || c2.includes(c1)) {
    return {
      points: 12,
      reason: `Partially matching color tone`,
      mismatch: null,
    };
  }

  return {
    points: 0,
    reason: null,
    mismatch: `Different color: ${target.color || target.colour} vs ${candidate.color || candidate.colour}`,
  };
}

/**
 * 3. Location Similarity (Weight: 20 points)
 */
export function scoreLocation(target, candidate) {
  const l1 = cleanText(target.location);
  const l2 = cleanText(candidate.location);

  if (!l1 || !l2) {
    return { points: 0, reason: null, mismatch: null };
  }

  if (l1 === l2) {
    return {
      points: 20,
      reason: `Same location: ${candidate.location}`,
      mismatch: null,
    };
  }

  const t1 = tokenize(l1);
  const t2 = tokenize(l2);
  const set1 = new Set(t1);
  const set2 = new Set(t2);

  let sharedTokens = 0;
  for (const token of set1) {
    if (set2.has(token)) sharedTokens++;
  }

  // Token containment or substring match (e.g. "Library" inside "Main Library 2nd Floor")
  if (l1.includes(l2) || l2.includes(l1) || sharedTokens > 0) {
    const minTokens = Math.min(set1.size, set2.size);
    const containmentRatio = minTokens > 0 ? sharedTokens / minTokens : 0;

    if (containmentRatio >= 0.5 || l1.includes(l2) || l2.includes(l1)) {
      const pts = Math.min(18, Math.max(12, Math.round(20 * (0.6 + containmentRatio * 0.3))));
      return {
        points: pts,
        reason: `Nearby/same zone: ${candidate.location} (${pts}/20)`,
        mismatch: null,
      };
    }
  }

  const overlap = tokenOverlap(l1, l2);
  const sim = stringSimilarity(l1, l2);
  const effectiveSim = Math.max(overlap, sim);

  if (effectiveSim >= 0.5) {
    const pts = Math.round(20 * effectiveSim);
    return {
      points: pts,
      reason: `Nearby/similar location: ${candidate.location} (${pts}/20)`,
      mismatch: null,
    };
  }

  return {
    points: 0,
    reason: null,
    mismatch: `Different location: ${target.location} vs ${candidate.location}`,
  };
}

/**
 * 4. Date / Time Proximity (Weight: 15 points)
 */
export function scoreDateTime(target, candidate) {
  try {
    const parseTime = (dateStr, timeStr) => {
      const d = dateStr || '2026-01-01';
      const t = timeStr || '12:00';
      return new Date(`${d}T${t}:00`).getTime();
    };

    const t1 = parseTime(target.date, target.time);
    const t2 = parseTime(candidate.date, candidate.time);

    if (isNaN(t1) || isNaN(t2)) {
      return { points: 0, reason: null, mismatch: null };
    }

    const diffHours = Math.abs(t1 - t2) / (1000 * 60 * 60);

    if (diffHours <= 24) {
      return {
        points: 15,
        reason: `Occurred within 24 hours of report (${Math.round(diffHours)}h diff)`,
        mismatch: null,
      };
    } else if (diffHours <= 72) {
      return {
        points: 11,
        reason: `Occurred within 3 days`,
        mismatch: null,
      };
    } else if (diffHours <= 168) {
      return {
        points: 7,
        reason: `Occurred within 1 week`,
        mismatch: null,
      };
    } else if (diffHours <= 336) {
      return {
        points: 3,
        reason: `Occurred within 2 weeks`,
        mismatch: null,
      };
    }

    return {
      points: 0,
      reason: null,
      mismatch: `Date gap is large (> 2 weeks)`,
    };
  } catch (err) {
    return { points: 0, reason: null, mismatch: null };
  }
}

/**
 * 5. Brand Similarity (Weight: 10 points)
 */
export function scoreBrand(target, candidate) {
  const b1 = cleanText(target.brand);
  const b2 = cleanText(candidate.brand);

  // If either brand is missing or unknown, do not penalize or reward
  if (!b1 || !b2) {
    return { points: 0, reason: null, mismatch: null };
  }

  if (b1 === b2) {
    return {
      points: 10,
      reason: `Identical brand: ${candidate.brand}`,
      mismatch: null,
    };
  }

  const sim = stringSimilarity(b1, b2);
  if (sim >= 0.7) {
    const pts = Math.round(10 * sim);
    return {
      points: pts,
      reason: `Similar brand: ${candidate.brand} (${pts}/10)`,
      mismatch: null,
    };
  }

  return {
    points: 0,
    reason: null,
    mismatch: `Different brand: ${target.brand} vs ${candidate.brand}`,
  };
}

/**
 * 6. Description Similarity (Weight: 5 points)
 */
export function scoreDescription(target, candidate) {
  const d1 = cleanText(target.description);
  const d2 = cleanText(candidate.description);

  if (!d1 || !d2) {
    return { points: 0, reason: null, mismatch: null };
  }

  // Avoid rewarding generic short descriptions like "item found"
  if (d1 === 'item found' || d2 === 'item found' || d1.length < 5 || d2.length < 5) {
    return { points: 0, reason: null, mismatch: null };
  }

  const overlap = tokenOverlap(d1, d2);
  if (overlap >= 0.25) {
    const pts = Math.min(5, Math.max(1, Math.round(5 * overlap)));
    return {
      points: pts,
      reason: `Description details overlap (${pts}/5)`,
      mismatch: null,
    };
  }

  return { points: 0, reason: null, mismatch: null };
}

// ==========================================
// Comprehensive Match Evaluator
// ==========================================

/**
 * Evaluates similarity between target report and one candidate report.
 * Returns { matchScore, score, reasons, mismatches, compatible }
 */
export function evaluateMatch(target, candidate) {
  // Invariant 1: Must be opposite types (LOST with FOUND only)
  if (target.type === candidate.type) {
    return {
      matchScore: 0,
      score: 0,
      reasons: [],
      mismatches: [`Incompatible types: cannot match ${target.type} with ${candidate.type}`],
      compatible: false,
    };
  }

  // Invariant 2: Candidate must be ACTIVE (not REUNITED)
  if (candidate.status !== REPORT_STATUSES.ACTIVE) {
    return {
      matchScore: 0,
      score: 0,
      reasons: [],
      mismatches: ['Candidate report is already REUNITED'],
      compatible: false,
    };
  }

  // Invariant 3: Target item and candidate item must have some basic category/item compatibility
  // Prevent completely unrelated matches (e.g. Laptop vs Water Bottle)
  const itemResult = scoreItemAndCategory(target, candidate);
  if (itemResult.points === 0) {
    return {
      matchScore: 0,
      score: 0,
      reasons: [],
      mismatches: [itemResult.mismatch || 'Incompatible item categories'],
      compatible: false,
    };
  }

  const colorResult = scoreColor(target, candidate);
  const locationResult = scoreLocation(target, candidate);
  const dateTimeResult = scoreDateTime(target, candidate);
  const brandResult = scoreBrand(target, candidate);
  const descResult = scoreDescription(target, candidate);

  const totalPoints = Math.min(
    100,
    Math.max(
      0,
      itemResult.points +
        colorResult.points +
        locationResult.points +
        dateTimeResult.points +
        brandResult.points +
        descResult.points
    )
  );

  const reasons = [
    itemResult.reason,
    colorResult.reason,
    locationResult.reason,
    dateTimeResult.reason,
    brandResult.reason,
    descResult.reason,
  ].filter(Boolean);

  const mismatches = [
    itemResult.mismatch,
    colorResult.mismatch,
    locationResult.mismatch,
    dateTimeResult.mismatch,
    brandResult.mismatch,
    descResult.mismatch,
  ].filter(Boolean);

  return {
    matchScore: totalPoints,
    score: parseFloat((totalPoints / 100).toFixed(2)),
    reasons,
    mismatches,
    compatible: true,
  };
}

/**
 * Matches a target report against an array of candidate reports.
 * Returns ranked candidates sorted descending by matchScore.
 */
export function rankMatches(targetReport, candidateReports, options = {}) {
  const minScore = options.minScore || 20;

  const results = [];

  for (const candidate of candidateReports) {
    const candidateObj = candidate.toObject ? candidate.toObject() : candidate;
    const targetObj = targetReport.toObject ? targetReport.toObject() : targetReport;

    // Do not compare against self
    if (String(candidateObj._id || candidateObj.id) === String(targetObj._id || targetObj.id)) {
      continue;
    }

    const evaluation = evaluateMatch(targetObj, candidateObj);

    if (evaluation.compatible && evaluation.matchScore >= minScore) {
      results.push({
        report: candidateObj,
        reportId: candidateObj._id || candidateObj.id,
        score: evaluation.score,
        matchScore: evaluation.matchScore,
        reasons: evaluation.reasons,
        mismatches: evaluation.mismatches,
      });
    }
  }

  // Sort descending by matchScore
  results.sort((a, b) => b.matchScore - a.matchScore);

  return results;
}
