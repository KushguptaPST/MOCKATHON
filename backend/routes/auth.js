const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

// JWT Secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// Generate JWT Token
const generateToken = (user) => {
  const userId = user._id || user.id || user;
  return jwt.sign({
    id: userId,
    userId,
    role: user.role,
    digitalId: user.digitalId
  }, JWT_SECRET, { expiresIn: '7d' });
};

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phone').trim().isLength({ min: 10 }).withMessage('Phone number must be at least 10 characters'),
  body('emergencyContact').optional().trim(),
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { name, email, password, phone, emergencyContact, emergencyContacts, role = 'tourist' } = req.body;
    const normalizedEmail = email.trim().toLowerCase();

    // Check for existing user
    let user = await User.findOne({ email: normalizedEmail });

    if (user) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    let formattedEmergencyContacts = [];
    if (Array.isArray(emergencyContacts)) {
      formattedEmergencyContacts = emergencyContacts;
    } else if (typeof emergencyContact === 'string' && emergencyContact.trim() !== '') {
      formattedEmergencyContacts = [{ phone: emergencyContact.trim() }];
    }

    // Create new user
    user = new User({
      name,
      email: normalizedEmail,
      password,
      phone,
      emergencyContacts: formattedEmergencyContacts,
      role: role || 'tourist'
    });

    await user.save();

    // Generate JWT token
    const token = generateToken(user);

    const contactStr = user.emergencyContact || (user.emergencyContacts?.[0]?.phone || '');

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      digitalId: user.digitalId,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        emergencyContact: contactStr,
        emergencyContacts: user.emergencyContacts,
        role: user.role,
        digitalId: user.digitalId,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').exists().withMessage('Password is required')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { email, password } = req.body;
    const normalizedEmail = email.trim().toLowerCase();

    // Find user by email
    const user = await User.findOne({ email: normalizedEmail }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'No account found with this email address'
      });
    }

    // Check password
    const isPasswordValid = await user.matchPassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect password. Passwords are case-sensitive.'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated'
      });
    }

    // Generate JWT token
    const token = generateToken(user);

    // Return user data (without password)
    const contactStr = user.emergencyContact || (user.emergencyContacts?.[0]?.phone || '');
    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      emergencyContact: contactStr,
      emergencyContacts: user.emergencyContacts,
      role: user.role,
      digitalId: user.digitalId,
      createdAt: user.createdAt
    };

    res.json({
      success: true,
      message: 'Login successful',
      token,
      digitalId: user.digitalId,
      user: userData
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    res.json({
      success: true,
      user: req.user
    });
  } catch (error) {
    console.error('Auth verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during auth verification'
    });
  }
});

// @route   GET /api/auth/users
// @desc    Get all users (Admin only)
// @access  Private/Admin
router.get('/users', auth, adminOnly, async (req, res) => {
  try {
    const users = await User.find({}).select('-password');
    res.json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching users'
    });
  }
});

module.exports = router;
