import User from '../models/User.js';
import { OAuth2Client } from 'google-auth-library';
import { ensureModeAccess, getLegacyBusinessType, normalizeMode } from '../utils/modeHelpers.js';

const sendTokenResponse = (user, statusCode, res) => {
  const token = user.getSignedJwtToken();
  const modeState = ensureModeAccess(user);

  const options = {
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  };

  res.status(statusCode).cookie('token', token, options).json({
    success: true,
    token,
    user: {
      id: user._id,
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      companyName: user.companyName || '',
      businessType: user.businessType || '',
      activeMode: modeState.activeMode,
      availableModes: modeState.availableModes
    }
  });
};

export const register = async (req, res) => {
  try {
    const normalizedName = req.body.name?.trim();
    const normalizedEmail = req.body.email?.trim().toLowerCase();
    const { password } = req.body;

    if (!normalizedName || !normalizedEmail || !password) {
      return res.status(400).json({ success: false, message: 'Please provide all fields' });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const user = await User.create({
      name: normalizedName,
      email: normalizedEmail,
      password,
      role: 'user'
    });

    sendTokenResponse(user, 201, res);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const normalizedEmail = req.body.email?.trim().toLowerCase();
    const { password } = req.body;

    if (!normalizedEmail || !password) {
      return res.status(400).json({ success: false, message: 'Please provide an email and password' });
    }

    const user = await User.findOne({ email: normalizedEmail }).select('+password');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const logout = async (req, res) => {
  // BUG-05 FIX: Mirror the same secure/sameSite options used during login.
  // Without these, the httpOnly cookie on a cross-origin (Netlify + Render) setup
  // may not be cleared in the browser after logout.
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  });

  res.status(200).json({ success: true, message: 'Logged out successfully' });
};

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const modeState = ensureModeAccess(user);

    res.status(200).json({
      success: true,
      data: {
        ...user.toObject(),
        activeMode: modeState.activeMode,
        availableModes: modeState.availableModes
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateRole = async (req, res) => {
  try {
    const { role } = req.body;

    if (!['organizer', 'user'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { role },
      { returnDocument: 'after', runValidators: true }
    );

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateDetails = async (req, res) => {
  try {
    const name = req.body.name?.trim();
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name },
      { returnDocument: 'after', runValidators: true }
    );

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id).select('+password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!(await user.matchPassword(currentPassword))) {
      return res.status(401).json({ success: false, message: 'Incorrect current password' });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const googleLogin = async (req, res) => {
  try {
    const { token } = req.body;

    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const { name, email } = ticket.getPayload();
    const normalizedEmail = email?.trim().toLowerCase();

    let user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      const randomPassword = Math.random().toString(36).slice(-10) + 'A1@';

      user = await User.create({
        name,
        email: normalizedEmail,
        password: randomPassword,
        role: 'user'
      });
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error('Google Auth Error:', error);
    res.status(401).json({ success: false, message: 'Google authentication failed' });
  }
};

export const upgradeRole = async (req, res) => {
  try {
    const { role, companyName, businessType } = req.body;

    if (role && role !== 'organizer') {
      return res.status(400).json({ success: false, message: 'Invalid role upgrade.' });
    }
    if (!companyName?.trim()) {
      return res.status(400).json({ success: false, message: 'Company name is required.' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const selectedMode = normalizeMode(businessType);

    user.role = 'organizer';
    user.companyName = companyName.trim();
    user.businessType = getLegacyBusinessType(selectedMode);
    user.activeMode = selectedMode;
    user.availableModes = [selectedMode];

    await user.save();

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyName: user.companyName,
        businessType: user.businessType,
        activeMode: user.activeMode,
        availableModes: user.availableModes
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateActiveMode = async (req, res) => {
  try {
    const activeMode = normalizeMode(req.body.activeMode);
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    user.activeMode = activeMode;
    user.availableModes = [activeMode];
    user.businessType = getLegacyBusinessType(activeMode);
    await user.save();

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyName: user.companyName,
        businessType: user.businessType,
        activeMode: user.activeMode,
        availableModes: user.availableModes
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
