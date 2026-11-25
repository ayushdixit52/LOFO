import express from 'express';
import {
  createLostReport,
  createFoundReport,
  getReports,
  getReportById,
  getReportMatches,
  updateReportStatus,
  uploadReportImage,
} from '../controllers/reportController.js';
import { upload } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Report creation routes
router.post('/lost', createLostReport);
router.post('/found', createFoundReport);

// Image upload route
router.post('/upload', upload.single('image'), uploadReportImage);

// Report listing and query
router.get('/', getReports);

// Single report routes
router.get('/:id', getReportById);
router.get('/:id/matches', getReportMatches);
router.patch('/:id/status', updateReportStatus);

export default router;
