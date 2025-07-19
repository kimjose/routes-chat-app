const express = require('express');
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Apply authentication to all rating endpoints
router.use(authenticateToken);

// Rate a route
router.post('/routes/:routeId/rate', async (req, res) => {
  try {
    const { routeId } = req.params;
    const { rating, comment } = req.body;

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        error: 'Rating must be between 1 and 5'
      });
    }

    // Check if route exists
    const routeCheck = await query(
      'SELECT id FROM routes WHERE id = $1',
      [routeId]
    );

    if (routeCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Route not found' });
    }

    // Check if user has already rated this route
    const existingRating = await query(
      'SELECT id FROM route_ratings WHERE route_id = $1 AND user_id = $2',
      [routeId, req.user.userId]
    );

    if (existingRating.rows.length > 0) {
      // Update existing rating
      const result = await query(
        `UPDATE route_ratings 
         SET rating = $1, comment = $2, updated_at = CURRENT_TIMESTAMP
         WHERE route_id = $3 AND user_id = $4
         RETURNING id, rating, comment, created_at, updated_at`,
        [rating, comment, routeId, req.user.userId]
      );

      res.json({
        success: true,
        message: 'Rating updated successfully',
        rating: {
          id: result.rows[0].id,
          route_id: parseInt(routeId),
          user_id: req.user.userId,
          rating: result.rows[0].rating,
          comment: result.rows[0].comment,
          created_at: result.rows[0].created_at,
          updated_at: result.rows[0].updated_at
        }
      });
    } else {
      // Create new rating
      const result = await query(
        `INSERT INTO route_ratings (route_id, user_id, rating, comment)
         VALUES ($1, $2, $3, $4)
         RETURNING id, rating, comment, created_at, updated_at`,
        [routeId, req.user.userId, rating, comment]
      );

      res.status(201).json({
        success: true,
        message: 'Rating created successfully',
        rating: {
          id: result.rows[0].id,
          route_id: parseInt(routeId),
          user_id: req.user.userId,
          rating: result.rows[0].rating,
          comment: result.rows[0].comment,
          created_at: result.rows[0].created_at,
          updated_at: result.rows[0].updated_at
        }
      });
    }
  } catch (error) {
    console.error('Rate route error:', error);
    res.status(500).json({ error: 'Failed to rate route' });
  }
});

// Get route ratings
router.get('/routes/:routeId/ratings', async (req, res) => {
  try {
    const { routeId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Check if route exists
    const routeCheck = await query(
      'SELECT id, name FROM routes WHERE id = $1',
      [routeId]
    );

    if (routeCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Route not found' });
    }

    // Get ratings with user info
    const ratingsResult = await query(
      `SELECT 
         rr.id, rr.rating, rr.comment, rr.created_at, rr.updated_at,
         u.username, u.first_name, u.last_name
       FROM route_ratings rr
       JOIN users u ON rr.user_id = u.id
       WHERE rr.route_id = $1
       ORDER BY rr.created_at DESC
       LIMIT $2 OFFSET $3`,
      [routeId, parseInt(limit), offset]
    );

    // Get average rating and total count
    const statsResult = await query(
      `SELECT 
         ROUND(AVG(rating)::numeric, 2) as average_rating,
         COUNT(*) as total_ratings
       FROM route_ratings 
       WHERE route_id = $1`,
      [routeId]
    );

    const ratings = ratingsResult.rows.map(row => ({
      id: row.id,
      rating: row.rating,
      comment: row.comment,
      created_at: row.created_at,
      updated_at: row.updated_at,
      user: {
        username: row.username,
        name: `${row.first_name || ''} ${row.last_name || ''}`.trim() || row.username
      }
    }));

    res.json({
      success: true,
      route: {
        id: parseInt(routeId),
        name: routeCheck.rows[0].name
      },
      ratings,
      stats: {
        average_rating: parseFloat(statsResult.rows[0].average_rating) || 0,
        total_ratings: parseInt(statsResult.rows[0].total_ratings)
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: ratings.length
      }
    });
  } catch (error) {
    console.error('Get route ratings error:', error);
    res.status(500).json({ error: 'Failed to fetch route ratings' });
  }
});

// Get user's rating for a route
router.get('/routes/:routeId/my-rating', async (req, res) => {
  try {
    const { routeId } = req.params;

    const result = await query(
      `SELECT id, rating, comment, created_at, updated_at
       FROM route_ratings 
       WHERE route_id = $1 AND user_id = $2`,
      [routeId, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        rating: null,
        message: 'No rating found for this route'
      });
    }

    res.json({
      success: true,
      rating: {
        id: result.rows[0].id,
        route_id: parseInt(routeId),
        user_id: req.user.userId,
        rating: result.rows[0].rating,
        comment: result.rows[0].comment,
        created_at: result.rows[0].created_at,
        updated_at: result.rows[0].updated_at
      }
    });
  } catch (error) {
    console.error('Get user rating error:', error);
    res.status(500).json({ error: 'Failed to fetch user rating' });
  }
});

// Delete user's rating
router.delete('/routes/:routeId/my-rating', async (req, res) => {
  try {
    const { routeId } = req.params;

    const result = await query(
      'DELETE FROM route_ratings WHERE route_id = $1 AND user_id = $2 RETURNING id',
      [routeId, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Rating not found' });
    }

    res.json({
      success: true,
      message: 'Rating deleted successfully'
    });
  } catch (error) {
    console.error('Delete rating error:', error);
    res.status(500).json({ error: 'Failed to delete rating' });
  }
});

// Get all ratings by a user
router.get('/users/:userId/ratings', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Only allow users to view their own ratings or if they have admin permissions
    if (parseInt(userId) !== req.user.userId) {
      // Check if user has admin permissions
      const userRoles = await query(
        `SELECT r.permissions 
         FROM user_roles ur 
         JOIN roles r ON ur.role_id = r.id 
         WHERE ur.user_id = $1 AND ur.is_active = true`,
        [req.user.userId]
      );

      const hasAdminPermission = userRoles.rows.some(role => 
        role.permissions && role.permissions.admin
      );

      if (!hasAdminPermission) {
        return res.status(403).json({ error: 'Not authorized to view these ratings' });
      }
    }

    // Get user's ratings with route info
    const ratingsResult = await query(
      `SELECT 
         rr.id, rr.rating, rr.comment, rr.created_at, rr.updated_at,
         rt.id as route_id, rt.name as route_name, rt.start_location, rt.end_location
       FROM route_ratings rr
       JOIN routes rt ON rr.route_id = rt.id
       WHERE rr.user_id = $1
       ORDER BY rr.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, parseInt(limit), offset]
    );

    const ratings = ratingsResult.rows.map(row => ({
      id: row.id,
      rating: row.rating,
      comment: row.comment,
      created_at: row.created_at,
      updated_at: row.updated_at,
      route: {
        id: row.route_id,
        name: row.route_name,
        start_location: row.start_location,
        end_location: row.end_location
      }
    }));

    res.json({
      success: true,
      user_id: parseInt(userId),
      ratings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: ratings.length
      }
    });
  } catch (error) {
    console.error('Get user ratings error:', error);
    res.status(500).json({ error: 'Failed to fetch user ratings' });
  }
});

module.exports = router;
