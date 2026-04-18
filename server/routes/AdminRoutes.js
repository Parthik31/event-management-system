import express from 'express';
import { getAdminStats, getAllUsers, deleteUser } from '../controllers/AdminController.js';
import { protect, authorize } from '../middleware/Auth.js';

const router = express.Router();

// Apply protection and authorization to all admin routes
router.use(protect);
router.use(authorize('admin'));

router.get('/stats', getAdminStats);
router.get('/users', getAllUsers);
router.delete('/users/:id', deleteUser);

export default router;
