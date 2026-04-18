import express from 'express';
import {
  register,
  login,
  logout,
  getMe,
  upgradeRole,
  googleLogin,
  updateRole,
  updateDetails,
  updatePassword,
  updateActiveMode
} from '../controllers/AuthController.js';
import { protect } from '../middleware/Auth.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/logout', logout);
router.post('/google', googleLogin);

router.use(protect);

router.get('/me', getMe);
router.put('/role', updateRole);
router.put('/active-mode', updateActiveMode);
router.put('/updatedetails', updateDetails);
router.put('/updatepassword', updatePassword);
router.put('/upgrade-role', upgradeRole);

export default router;
