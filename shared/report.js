/**
 * Shared report contract. Keep synchronized with docs/API_CONTRACT.md and the
 * server's Mongoose model. This module intentionally has no runtime deps.
 */
export const REPORT_TYPES = Object.freeze({ LOST: 'LOST', FOUND: 'FOUND' });
export const REPORT_STATUSES = Object.freeze({ ACTIVE: 'ACTIVE', REUNITED: 'REUNITED' });

/** Fields accepted when creating a report; type is determined by the route. */
export const REPORT_INPUT_FIELDS = Object.freeze([
  'itemName', 'category', 'color', 'brand', 'location', 'date', 'time', 'description',
]);

/** @typedef {'LOST' | 'FOUND'} ReportType */
/** @typedef {'ACTIVE' | 'REUNITED'} ReportStatus */
/**
 * @typedef {Object} Report
 * @property {string} _id
 * @property {string} itemName
 * @property {string} category
 * @property {string} color
 * @property {string} brand
 * @property {string} location
 * @property {string} date YYYY-MM-DD
 * @property {string} time HH:mm (24-hour local time)
 * @property {string} description
 * @property {ReportType} type
 * @property {ReportStatus} status
 * @property {string} createdAt ISO-8601 timestamp
 * @property {string} updatedAt ISO-8601 timestamp
 */

export const sampleReport = Object.freeze({
  itemName: 'Water Bottle',
  category: 'Bottle',
  color: 'Navy Blue',
  brand: 'Milton',
  location: 'Library',
  date: '2026-11-24',
  time: '16:00',
  description: 'Bottle left near reading table',
  type: REPORT_TYPES.LOST,
  status: REPORT_STATUSES.ACTIVE,
});
