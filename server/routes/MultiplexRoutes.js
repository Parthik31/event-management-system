import express from 'express';
import {
  createMultiplex,
  addScreen,
  getAdminMultiplexes,
  getMyMultiplexes,
  updateMultiplex,
  updateMultiplexStatus,
  updateScreen
} from '../controllers/MultiplexController.js';
import { protect, authorize } from '../middleware/Auth.js';

const router = express.Router();

router.get('/admin/list', protect, authorize('admin'), getAdminMultiplexes);
router.put('/admin/:id/status', protect, authorize('admin'), updateMultiplexStatus);
router.post('/', protect, authorize('organizer'), createMultiplex);
router.get('/my', protect, authorize('organizer'), getMyMultiplexes);
router.put('/:id', protect, authorize('organizer'), updateMultiplex);
router.post('/:id/screens', protect, authorize('organizer'), addScreen);
router.put('/:id/screens/:screenId', protect, authorize('organizer'), updateScreen);

export default router;
