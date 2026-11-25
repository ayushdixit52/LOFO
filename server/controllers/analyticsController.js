import { Report } from '../models/Report.js';
import { REPORT_TYPES, REPORT_STATUSES } from '../../shared/report.js';

/**
 * GET /api/analytics/overview
 * Returns aggregate metrics across all stored reports.
 */
export async function getOverviewAnalytics(req, res, next) {
  try {
    const [totalReports, lostCount, foundCount, reunitedCount, activeCount] = await Promise.all([
      Report.countDocuments(),
      Report.countDocuments({ type: REPORT_TYPES.LOST }),
      Report.countDocuments({ type: REPORT_TYPES.FOUND }),
      Report.countDocuments({ status: REPORT_STATUSES.REUNITED }),
      Report.countDocuments({ status: REPORT_STATUSES.ACTIVE }),
    ]);

    const reunionRate = totalReports > 0 ? parseFloat(((reunitedCount / totalReports) * 100).toFixed(1)) : 0;

    res.json({
      data: {
        totalReports,
        lostCount,
        foundCount,
        reunitedCount,
        activeCount,
        reunionRatePercentage: reunionRate,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/analytics/hotspots
 * Aggregates report counts by campus location to identify top hotspots.
 */
export async function getHotspotsAnalytics(req, res, next) {
  try {
    const hotspots = await Report.aggregate([
      {
        $group: {
          _id: { $toLower: '$location' },
          locationName: { $first: '$location' },
          totalReports: { $sum: 1 },
          lostCount: {
            $sum: { $cond: [{ $eq: ['$type', REPORT_TYPES.LOST] }, 1, 0] },
          },
          foundCount: {
            $sum: { $cond: [{ $eq: ['$type', REPORT_TYPES.FOUND] }, 1, 0] },
          },
        },
      },
      { $sort: { totalReports: -1 } },
      { $limit: 10 },
      {
        $project: {
          _id: 0,
          location: '$locationName',
          totalReports: 1,
          lostCount: 1,
          foundCount: 1,
        },
      },
    ]);

    res.json({ data: hotspots });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/analytics/items
 * Aggregates report counts by category and item name to find most-lost items.
 */
export async function getItemsAnalytics(req, res, next) {
  try {
    const mostLostItems = await Report.aggregate([
      { $match: { type: REPORT_TYPES.LOST } },
      {
        $group: {
          _id: { $toLower: '$itemName' },
          itemName: { $first: '$itemName' },
          category: { $first: '$category' },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $project: {
          _id: 0,
          itemName: 1,
          category: 1,
          count: 1,
        },
      },
    ]);

    const categories = await Report.aggregate([
      {
        $group: {
          _id: { $toLower: '$category' },
          category: { $first: '$category' },
          totalCount: { $sum: 1 },
        },
      },
      { $sort: { totalCount: -1 } },
      {
        $project: {
          _id: 0,
          category: 1,
          totalCount: 1,
        },
      },
    ]);

    res.json({
      data: {
        mostLostItems,
        categories,
      },
    });
  } catch (err) {
    next(err);
  }
}
