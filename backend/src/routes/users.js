import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { db as pool } from '../config/db.js';
import { authenticateToken, optionalAuth, JWT_SECRET } from '../middleware/auth.js';
import { uploadMediaToS3, getSignedMediaUrl } from '../services/s3Service.js';
import { findUserById, findUserWithDrops } from '../repositories/userRepo.js';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB max
});

async function resolveProfilePicture(value) {
  if (!value) return null;
  if (value.startsWith('http')) return value;
  try {
    return await getSignedMediaUrl(value);
  } catch {
    return null;
  }
}

// Signup with phone number
router.post('/signup', async (req, res) => {
  try {
    const { phoneNumber, password, name, username, profilePictureUrl } = req.body;

    if (!phoneNumber || !password || !username) {
      return res.status(400).json({ error: 'phone number, username, and password are required' });
    }

    const existingUser = await pool.query('SELECT id FROM users WHERE phone_number = $1', [phoneNumber]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'phone number already registered' });
    }

    const existingUsername = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    if (existingUsername.rows.length > 0) {
      return res.status(409).json({ error: 'username already taken' });
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const result = await pool.query(
      `INSERT INTO users (phone_number, password_hash, name, username, profile_picture_url)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, phone_number, name, username, profile_picture_url`,
      [phoneNumber, passwordHash, name || null, username, profilePictureUrl || null]
    );

    const user = result.rows[0];
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      user: {
        id: user.id,
        phoneNumber: user.phone_number,
        name: user.name,
        username: user.username,
        profilePictureUrl: user.profile_picture_url
      },
      token
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login with phone number or username
router.post('/login', async (req, res) => {
  try {
    const { phoneNumber, password } = req.body;

    if (!phoneNumber || !password) {
      return res.status(400).json({ error: 'phone/username and password are required' });
    }

    // Find user
    const result = await pool.query(
      'SELECT * FROM users WHERE phone_number = $1 OR username = $1',
      [phoneNumber]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'invalid credentials' });
    }

    const user = result.rows[0];

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      user: {
        id: user.id,
        phoneNumber: user.phone_number,
        name: user.name,
        username: user.username,
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
    const pic = await resolveProfilePicture(req.user.profile_picture_url);
    res.json({
      user: {
        id: req.user.id,
        phoneNumber: req.user.phone_number,
        name: req.user.name,
        username: req.user.username,
        profilePictureUrl: pic
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
    const { name, profilePictureUrl, username } = req.body;
    const userId = req.user.id;

    if (username) {
      const existingUsername = await pool.query('SELECT id FROM users WHERE username = $1 AND id <> $2', [username, userId]);
      if (existingUsername.rows.length > 0) {
        return res.status(409).json({ error: 'username already taken' });
      }
    }

    const result = await pool.query(
      'UPDATE users SET name = $1, profile_picture_url = $2, username = COALESCE($3, username) WHERE id = $4 RETURNING id, phone_number, name, username, profile_picture_url',
      [name, profilePictureUrl, username, userId]
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
        username: user.username,
        profilePictureUrl: await resolveProfilePicture(user.profile_picture_url)
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload profile picture via multipart (profilePicture field)
router.post('/profile-picture', authenticateToken, upload.single('profilePicture'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'profile picture is required' });
    }

    const file = req.file;
    const userId = req.user.id;

    if (!file.mimetype.startsWith('image/')) {
      return res.status(400).json({ error: 'only image uploads are allowed' });
    }

    const key = `profile-pictures/${userId}/${Date.now()}-${file.originalname}`;
    const storedKey = await uploadMediaToS3(key, file.buffer, file.mimetype);
    const signed = await getSignedMediaUrl(storedKey);

    const result = await pool.query(
      'UPDATE users SET profile_picture_url = $1 WHERE id = $2 RETURNING profile_picture_url',
      [storedKey, userId]
    );

    res.json({ profilePictureUrl: signed });
  } catch (error) {
    console.error('Profile picture upload error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Public profile by id (with drops)
router.get('/profile/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const data = await findUserWithDrops(id);
    if (!data) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isOwner = req.user ? req.user.id === Number(id) : false;

    res.json({
      user: {
        id: data.user.id,
        phoneNumber: isOwner ? data.user.phone_number : undefined,
        name: data.user.name,
        username: data.user.username,
        profilePictureUrl: await resolveProfilePicture(data.user.profile_picture_url),
        isOwner
      },
      drops: data.drops.map(d => ({
        ...d,
        isOwner
      }))
    });
  } catch (error) {
    console.error('Public profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
