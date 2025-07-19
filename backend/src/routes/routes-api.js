const express = require('express');
const Route = require('../models/Route');
const StopPoint = require('../models/StopPoint');
const { authenticateToken } = require('../middleware/auth');
const { requirePermission } = require('./roles');
const router = express.Router();

// Apply authentication to all route endpoints
router.use(authenticateToken);

// Get all public routes
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    const includeStops = req.query.include_stops === 'true';

    const routes = await Route.findPublicRoutes(includeStops, limit, offset);

    res.json({
      success: true,
      routes: await Promise.all(routes.map(route => route.toJSON(includeStops, true))),
      pagination: {
        page,
        limit,
        total: routes.length
      }
    });
  } catch (error) {
    console.error('Get routes error:', error);
    res.status(500).json({ error: 'Failed to fetch routes' });
  }
});

// Search routes
router.get('/search', async (req, res) => {
  try {
    const { q: searchTerm, lat, lng, radius = 10 } = req.query;
    const includeStops = req.query.include_stops === 'true';
    let routes = [];

    if (searchTerm) {
      routes = await Route.searchByLocation(searchTerm, includeStops);
    } else if (lat && lng) {
      routes = await Route.findNearby(parseFloat(lat), parseFloat(lng), parseFloat(radius), includeStops);
    } else {
      return res.status(400).json({ error: 'Search term or coordinates required' });
    }

    res.json({
      success: true,
      routes: await Promise.all(routes.map(route => route.toJSON(includeStops, true))),
      search_params: { searchTerm, lat, lng, radius }
    });
  } catch (error) {
    console.error('Search routes error:', error);
    res.status(500).json({ error: 'Failed to search routes' });
  }
});

// Get user's routes
router.get('/my-routes', async (req, res) => {
  try {
    const includeStops = req.query.include_stops === 'true';
    const routes = await Route.findByUser(req.user.userId, includeStops);

    res.json({
      success: true,
      routes: await Promise.all(routes.map(route => route.toJSON(includeStops, true)))
    });
  } catch (error) {
    console.error('Get user routes error:', error);
    res.status(500).json({ error: 'Failed to fetch user routes' });
  }
});

// Get specific route
router.get('/:id', async (req, res) => {
  try {
    const includeStops = req.query.include_stops === 'true';
    const route = await Route.findById(req.params.id, includeStops);

    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }

    res.json({
      success: true,
      route: await route.toJSON(includeStops, true)
    });
  } catch (error) {
    console.error('Get route error:', error);
    res.status(500).json({ error: 'Failed to fetch route' });
  }
});

// Create new route
router.post('/', async (req, res) => {
  try {
    const {
      name, description, start_location, end_location,
      start_latitude, start_longitude, end_latitude, end_longitude,
      distance_km, estimated_duration_minutes, is_public = false,
      stop_points = []
    } = req.body;

    // Validate required fields
    if (!name || !start_location || !end_location) {
      return res.status(400).json({
        error: 'Name, start_location, and end_location are required'
      });
    }

    // Create route
    const newRoute = await Route.create({
      name,
      description,
      start_location,
      end_location,
      start_latitude,
      start_longitude,
      end_latitude,
      end_longitude,
      distance_km,
      estimated_duration_minutes,
      route_type: 'custom',
      created_by: req.user.userId,
      is_public
    });

    // Add stop points if provided
    if (stop_points.length > 0) {
      for (let i = 0; i < stop_points.length; i++) {
        const stop = stop_points[i];
        await newRoute.addStopPoint({
          ...stop,
          stop_order: i + 1
        });
      }
    }

    const routeWithStops = await Route.findById(newRoute.id, true);

    res.status(201).json({
      success: true,
      message: 'Route created successfully',
      route: await routeWithStops.toJSON(true, true)
    });
  } catch (error) {
    console.error('Create route error:', error);
    res.status(500).json({ error: 'Failed to create route' });
  }
});

// Update route
router.put('/:id', async (req, res) => {
  try {
    const route = await Route.findById(req.params.id);

    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }

    // Check if user can edit this route
    if (!route.canEdit(req.user.userId)) {
      return res.status(403).json({ error: 'Not authorized to edit this route' });
    }

    const {
      name, description, start_location, end_location,
      start_latitude, start_longitude, end_latitude, end_longitude,
      distance_km, estimated_duration_minutes, is_public
    } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (start_location !== undefined) updateData.start_location = start_location;
    if (end_location !== undefined) updateData.end_location = end_location;
    if (start_latitude !== undefined) updateData.start_latitude = start_latitude;
    if (start_longitude !== undefined) updateData.start_longitude = start_longitude;
    if (end_latitude !== undefined) updateData.end_latitude = end_latitude;
    if (end_longitude !== undefined) updateData.end_longitude = end_longitude;
    if (distance_km !== undefined) updateData.distance_km = distance_km;
    if (estimated_duration_minutes !== undefined) updateData.estimated_duration_minutes = estimated_duration_minutes;
    if (is_public !== undefined) updateData.is_public = is_public;

    const updatedRoute = await route.update(updateData);

    res.json({
      success: true,
      message: 'Route updated successfully',
      route: await updatedRoute.toJSON(true, true)
    });
  } catch (error) {
    console.error('Update route error:', error);
    res.status(500).json({ error: 'Failed to update route' });
  }
});

// Delete route
router.delete('/:id', async (req, res) => {
  try {
    const route = await Route.findById(req.params.id);

    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }

    // Check if user can edit this route
    if (!route.canEdit(req.user.userId)) {
      return res.status(403).json({ error: 'Not authorized to delete this route' });
    }

    await route.delete();

    res.json({
      success: true,
      message: 'Route deleted successfully'
    });
  } catch (error) {
    console.error('Delete route error:', error);
    res.status(500).json({ error: 'Failed to delete route' });
  }
});

// Get route stop points
router.get('/:id/stops', async (req, res) => {
  try {
    const route = await Route.findById(req.params.id);

    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }

    const stopPoints = await route.getStopPoints();

    res.json({
      success: true,
      route: {
        id: route.id,
        name: route.name
      },
      stop_points: stopPoints.map(stop => stop.toJSON())
    });
  } catch (error) {
    console.error('Get route stops error:', error);
    res.status(500).json({ error: 'Failed to fetch route stops' });
  }
});

// Add stop point to route
router.post('/:id/stops', async (req, res) => {
  try {
    const route = await Route.findById(req.params.id);

    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }

    // Check if user can edit this route
    if (!route.canEdit(req.user.userId)) {
      return res.status(403).json({ error: 'Not authorized to edit this route' });
    }

    const {
      name, description, latitude, longitude, address,
      stop_order, is_pickup_point, is_dropoff_point, estimated_arrival_time
    } = req.body;

    if (!name || !latitude || !longitude) {
      return res.status(400).json({
        error: 'Name, latitude, and longitude are required'
      });
    }

    const stopPoint = await route.addStopPoint({
      name,
      description,
      latitude,
      longitude,
      address,
      stop_order,
      is_pickup_point,
      is_dropoff_point,
      estimated_arrival_time
    });

    res.status(201).json({
      success: true,
      message: 'Stop point added successfully',
      stop_point: stopPoint.toJSON()
    });
  } catch (error) {
    console.error('Add stop point error:', error);
    res.status(500).json({ error: 'Failed to add stop point' });
  }
});

// Update stop point
router.put('/:id/stops/:stopId', async (req, res) => {
  try {
    const route = await Route.findById(req.params.id);

    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }

    // Check if user can edit this route
    if (!route.canEdit(req.user.userId)) {
      return res.status(403).json({ error: 'Not authorized to edit this route' });
    }

    const stopPoint = await StopPoint.findById(req.params.stopId);

    if (!stopPoint || stopPoint.route_id !== route.id) {
      return res.status(404).json({ error: 'Stop point not found' });
    }

    const {
      name, description, latitude, longitude, address,
      stop_order, is_pickup_point, is_dropoff_point, estimated_arrival_time
    } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (latitude !== undefined) updateData.latitude = latitude;
    if (longitude !== undefined) updateData.longitude = longitude;
    if (address !== undefined) updateData.address = address;
    if (stop_order !== undefined) updateData.stop_order = stop_order;
    if (is_pickup_point !== undefined) updateData.is_pickup_point = is_pickup_point;
    if (is_dropoff_point !== undefined) updateData.is_dropoff_point = is_dropoff_point;
    if (estimated_arrival_time !== undefined) updateData.estimated_arrival_time = estimated_arrival_time;

    const updatedStopPoint = await stopPoint.update(updateData);

    res.json({
      success: true,
      message: 'Stop point updated successfully',
      stop_point: updatedStopPoint.toJSON()
    });
  } catch (error) {
    console.error('Update stop point error:', error);
    res.status(500).json({ error: 'Failed to update stop point' });
  }
});

// Delete stop point
router.delete('/:id/stops/:stopId', async (req, res) => {
  try {
    const route = await Route.findById(req.params.id);

    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }

    // Check if user can edit this route
    if (!route.canEdit(req.user.userId)) {
      return res.status(403).json({ error: 'Not authorized to edit this route' });
    }

    const stopPoint = await StopPoint.findById(req.params.stopId);

    if (!stopPoint || stopPoint.route_id !== route.id) {
      return res.status(404).json({ error: 'Stop point not found' });
    }

    await stopPoint.delete();

    res.json({
      success: true,
      message: 'Stop point deleted successfully'
    });
  } catch (error) {
    console.error('Delete stop point error:', error);
    res.status(500).json({ error: 'Failed to delete stop point' });
  }
});

// Get route trips
router.get('/:id/trips', async (req, res) => {
  try {
    const route = await Route.findById(req.params.id);

    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }

    const includeExpired = req.query.include_expired === 'true';
    const trips = await route.getTrips(includeExpired);

    res.json({
      success: true,
      route: {
        id: route.id,
        name: route.name
      },
      trips: await Promise.all(trips.map(trip => trip.toJSON()))
    });
  } catch (error) {
    console.error('Get route trips error:', error);
    res.status(500).json({ error: 'Failed to fetch route trips' });
  }
});

// Get route ratings
router.get('/:id/ratings', async (req, res) => {
  try {
    const route = await Route.findById(req.params.id);

    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }

    const ratings = await route.getRatings();
    const averageRating = await route.getAverageRating();

    res.json({
      success: true,
      route: {
        id: route.id,
        name: route.name
      },
      ratings,
      average_rating: averageRating.average_rating,
      total_ratings: averageRating.total_ratings
    });
  } catch (error) {
    console.error('Get route ratings error:', error);
    res.status(500).json({ error: 'Failed to fetch route ratings' });
  }
});

module.exports = router;
