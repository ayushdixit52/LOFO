import express from 'express';
import {
  getOverviewAnalytics,
  getHotspotsAnalytics,
  getItemsAnalytics,
} from '../controllers/analyticsController.js';

const router = express.Router();

router.get('/overview', getOverviewAnalytics);
router.get('/hotspots', getHotspotsAnalytics);
router.get('/items', getItemsAnalytics);

export default router;
