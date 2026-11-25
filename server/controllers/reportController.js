import mongoose from 'mongoose';
import { Report } from '../models/Report.js';
import { REPORT_TYPES, REPORT_STATUSES } from '../../shared/report.js';
import { rankMatches } from '../services/matchingService.js';

/**
 * Normalizes input body to resolve 'colour' -> 'color' and trim strings.
 */
function normalizeReportInput(body, forcedType) {
  const normalized = { ...body };

  // Handle colour/color alias
  if (!normalized.color && normalized.colour) {
    normalized.color = normalized.colour;
  }

  // Reject conflicting client-supplied type if provided
  if (normalized.type && normalized.type !== forcedType) {
    const err = new Error(`Conflicting type "${normalized.type}" provided; this endpoint creates ${forcedType} reports.`);
    err.statusCode = 400;
    err.code = 'VALIDATION_ERROR';
    err.isCustom = true;
    throw err;
  }

  normalized.type = forcedType;
  normalized.status = REPORT_STATUSES.ACTIVE;
  return normalized;
}

/**
 * POST /api/reports/lost
 * Create a LOST report and immediately return the report with top matching found items.
 */
export async function createLostReport(req, res, next) {
  try {
    const input = normalizeReportInput(req.body, REPORT_TYPES.LOST);
    const report = new Report(input);
    const savedReport = await report.save();

    // Query active opposite-type candidates (FOUND)
    const candidates = await Report.find({
      type: REPORT_TYPES.FOUND,
      status: REPORT_STATUSES.ACTIVE,
    }).lean();

    const matches = rankMatches(savedReport, candidates);

    res.status(201).json({
      data: {
        ...savedReport.toJSON(),
        matches,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/reports/found
 * Create a FOUND report and immediately return the report with top matching lost items.
 */
export async function createFoundReport(req, res, next) {
  try {
    const input = normalizeReportInput(req.body, REPORT_TYPES.FOUND);
    const report = new Report(input);
    const savedReport = await report.save();

    // Query active opposite-type candidates (LOST)
    const candidates = await Report.find({
      type: REPORT_TYPES.LOST,
      status: REPORT_STATUSES.ACTIVE,
    }).lean();

    const matches = rankMatches(savedReport, candidates);

    res.status(201).json({
      data: {
        ...savedReport.toJSON(),
        matches,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/reports
 * List reports with optional filtering, search, and pagination.
 */
export async function getReports(req, res, next) {
  try {
    const { type, status, category, location, color, colour, q, page = 1, limit = 20 } = req.query;

    const query = {};

    if (type) {
      const upperType = type.toUpperCase();
      if ([REPORT_TYPES.LOST, REPORT_TYPES.FOUND].includes(upperType)) {
        query.type = upperType;
      }
    }

    if (status) {
      const upperStatus = status.toUpperCase();
      if ([REPORT_STATUSES.ACTIVE, REPORT_STATUSES.REUNITED].includes(upperStatus)) {
        query.status = upperStatus;
      }
    }

    if (category) {
      query.category = { $regex: new RegExp(`^${category}$`, 'i') };
    }

    if (location) {
      query.location = { $regex: new RegExp(location, 'i') };
    }

    const colorFilter = color || colour;
    if (colorFilter) {
      query.color = { $regex: new RegExp(colorFilter, 'i') };
    }

    if (q) {
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escaped, 'i');
      query.$or = [
        { itemName: searchRegex },
        { description: searchRegex },
        { location: searchRegex },
        { brand: searchRegex },
        { category: searchRegex },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [reports, total] = await Promise.all([
      Report.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      Report.countDocuments(query),
    ]);

    res.json({
      data: reports,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/reports/:id
 * Retrieve a single report by its ID.
 */
export async function getReportById(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const err = new Error(`Invalid report ID: ${id}`);
      err.statusCode = 400;
      err.code = 'INVALID_ID';
      err.isCustom = true;
      throw err;
    }

    const report = await Report.findById(id);
    if (!report) {
      const err = new Error(`Report not found with ID: ${id}`);
      err.statusCode = 404;
      err.code = 'REPORT_NOT_FOUND';
      err.isCustom = true;
      throw err;
    }

    res.json({ data: report });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/reports/:id/matches
 * Find active opposite-type matches for an existing report.
 */
export async function getReportMatches(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const err = new Error(`Invalid report ID: ${id}`);
      err.statusCode = 400;
      err.code = 'INVALID_ID';
      err.isCustom = true;
      throw err;
    }

    const targetReport = await Report.findById(id);
    if (!targetReport) {
      const err = new Error(`Report not found with ID: ${id}`);
      err.statusCode = 404;
      err.code = 'REPORT_NOT_FOUND';
      err.isCustom = true;
      throw err;
    }

    const oppositeType = targetReport.type === REPORT_TYPES.LOST ? REPORT_TYPES.FOUND : REPORT_TYPES.LOST;

    // Must be opposite type and ACTIVE (reunited items are excluded)
    const candidates = await Report.find({
      type: oppositeType,
      status: REPORT_STATUSES.ACTIVE,
    }).lean();

    const matches = rankMatches(targetReport, candidates);

    res.json({ data: matches });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/reports/:id/status
 * Update report status (e.g. to REUNITED).
 */
export async function updateReportStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      const err = new Error(`Invalid report ID: ${id}`);
      err.statusCode = 400;
      err.code = 'INVALID_ID';
      err.isCustom = true;
      throw err;
    }

    if (!status || ![REPORT_STATUSES.ACTIVE, REPORT_STATUSES.REUNITED].includes(status.toUpperCase())) {
      const err = new Error('Invalid status; must be either "ACTIVE" or "REUNITED"');
      err.statusCode = 400;
      err.code = 'VALIDATION_ERROR';
      err.isCustom = true;
      throw err;
    }

    const updated = await Report.findByIdAndUpdate(
      id,
      { status: status.toUpperCase() },
      { new: true, runValidators: true }
    );

    if (!updated) {
      const err = new Error(`Report not found with ID: ${id}`);
      err.statusCode = 404;
      err.code = 'REPORT_NOT_FOUND';
      err.isCustom = true;
      throw err;
    }

    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/reports/upload
 * Upload an image and return its URL path.
 */
export async function uploadReportImage(req, res, next) {
  try {
    if (!req.file) {
      const err = new Error('No image file provided');
      err.statusCode = 400;
      err.code = 'FILE_MISSING';
      err.isCustom = true;
      throw err;
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    res.status(201).json({
      data: {
        imageUrl: fileUrl,
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size,
      },
    });
  } catch (err) {
    next(err);
  }
}
