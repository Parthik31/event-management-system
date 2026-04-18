import express from 'express';
import {
  createMovie,
  getMovies,
  getMovieById,
  getMovieByIdForManagement,
  getMovieShowtimes,
  getOrganizerMovies,
  getPendingMovies,
  updateMovieStatus,
  updateMovie,
  createShowtime,
  getShowById,
  updateShowtime,
  updateShowWave,
  deleteShowWave
} from '../controllers/MovieController.js';
import { protect, authorize } from '../middleware/Auth.js';
import { uploadCDN as upload } from '../config/cloudinary.js';

const router = express.Router();

router.post(
  '/',
  protect,
  authorize('organizer'),
  upload.fields([
    { name: 'poster', maxCount: 1 },
    { name: 'banner', maxCount: 1 },
    { name: 'castImages', maxCount: 20 }
  ]),
  createMovie
);

router.get('/admin/pending', protect, authorize('admin'), getPendingMovies);
router.get('/admin/list', protect, authorize('admin'), getMovies);
router.put('/admin/:id/status', protect, authorize('admin'), updateMovieStatus);
router.get('/organizer/manage/:id', protect, authorize('organizer', 'admin'), getMovieByIdForManagement);
router.get('/organizer/my', protect, authorize('organizer'), getOrganizerMovies);

router.get('/', getMovies);
router.get('/shows/:showId', getShowById);
router.put('/shows/:showId', protect, authorize('organizer'), updateShowtime);
router.put('/shows/:showId/wave', protect, authorize('organizer'), updateShowWave);
router.delete('/shows/:showId/wave', protect, authorize('organizer'), deleteShowWave);
router.post('/:id/shows', protect, authorize('organizer'), createShowtime);

router.get('/:id/shows', getMovieShowtimes);
router.get('/:id', getMovieById);

router.put(
  '/:id',
  protect,
  authorize('organizer'),
  upload.fields([
    { name: 'poster', maxCount: 1 },
    { name: 'banner', maxCount: 1 },
    { name: 'castImages', maxCount: 20 }
  ]),
  updateMovie
);

export default router;
