import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db as pool } from '../config/db.js';
import { authenticateToken, JWT_SECRET } from '../middleware/auth.js';
import { uploadMediaToS3 } from '../services/s3Service.js';

const router = express.Router();

// Signup with phone number
router.post('/signup', async (req, res) => {
  try {
    const { phoneNumber, password, name } = req.body;

    if (!phoneNumber || !password) {
      return res.status(400).json({ error: 'Phone number and password are required' });
    }

    // Check if user already exists
    const existingUser = await pool.query('SELECT id FROM users WHERE phone_number = $1', [phoneNumber]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Phone number already registered' });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const result = await pool.query(
      'INSERT INTO users (phone_number, password_hash, name) VALUES ($1, $2, $3) RETURNING id, phone_number, name',
      [phoneNumber, passwordHash, name || null]
    );

    const user = result.rows[0];

    // Generate JWT token
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      user: {
        id: user.id,
        phoneNumber: user.phone_number,
        name: user.name
      },
      token
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login with phone number
router.post('/login', async (req, res) => {
  try {
    const { phoneNumber, password } = req.body;

    if (!phoneNumber || !password) {
      return res.status(400).json({ error: 'Phone number and password are required' });
    }

    // Find user
    const result = await pool.query('SELECT * FROM users WHERE phone_number = $1', [phoneNumber]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid phone number or password' });
    }

    const user = result.rows[0];

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid phone number or password' });
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      user: {
        id: user.id,
        phoneNumber: user.phone_number,
        name: user.name,
        profilePictureUrl: user.profile_picture_url
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user.id,
        phoneNumber: req.user.phone_number,
        name: req.user.name,
        profilePictureUrl: req.user.profile_picture_url
      }
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name, profilePictureUrl } = req.body;
    const userId = req.user.id;

    const result = await pool.query(
      'UPDATE users SET name = $1, profile_picture_url = $2 WHERE id = $3 RETURNING id, phone_number, name, profile_picture_url',
      [name, profilePictureUrl, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    res.json({
      user: {
        id: user.id,
        phoneNumber: user.phone_number,
        name: user.name,
        profilePictureUrl: user.profile_picture_url
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload profile picture
router.post('/profile-picture', authenticateToken, async (req, res) => {
  try {
    if (!req.files || !req.files.profilePicture) {
      return res.status(400).json({ error: 'Profile picture is required' });
    }

    const file = req.files.profilePicture;
    const userId = req.user.id;

    // Upload to S3
    const s3Key = `profile-pictures/${userId}/${Date.now()}-${file.name}`;
    await uploadMediaToS3(s3Key, file.data, file.mimetype);

    // Update user profile
    const result = await pool.query(
      'UPDATE users SET profile_picture_url = $1 WHERE id = $2 RETURNING profile_picture_url',
      [uploadResult.Location, userId]
    );

    res.json({ profilePictureUrl: result.rows[0].profile_picture_url });
  } catch (error) {
    console.error('Profile picture upload error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;