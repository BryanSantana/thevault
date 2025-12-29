import jwt from 'jsonwebtoken';
import { db as pool } from '../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const result = await pool.query('SELECT id, phone_number, name, username, profile_picture_url FROM users WHERE id = $1', [decoded.userId]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const result = await pool.query('SELECT id, phone_number, name, username, profile_picture_url FROM users WHERE id = $1', [decoded.userId]);

      if (result.rows.length > 0) {
        req.user = result.rows[0];
      }
    } catch (error) {
      // Ignore invalid tokens for optional auth
    }
  }

  next();
};

export { authenticateToken, optionalAuth, JWT_SECRET };
