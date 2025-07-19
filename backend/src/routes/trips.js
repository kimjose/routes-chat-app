const express = require('express');
const Trip = require('../models/Trip');
const TripRequest = require('../models/TripRequest');
const Route = require('../models/Route');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Apply authentication to all trip endpoints
router.use(authenticateToken);

// Get all available trips
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      route_id,
      departure_date,
      from_lat,
      from_lng,
      to_lat,
      to_lng,
      radius = 10,
      available_only = 'true'
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const filters = {
      routeId: route_id,
      departureDate: departure_date,
      from: from_lat && from_lng ? { lat: parseFloat(from_lat), lng: parseFloat(from_lng) } : null,
      to: to_lat && to_lng ? { lat: parseFloat(to_lat), lng: parseFloat(to_lng) } : null,
      radius: parseFloat(radius),
      availableOnly: available_only === 'true'
    };

    const trips = await Trip.search(filters, parseInt(limit), offset);

    res.json({
      success: true,
      trips: await Promise.all(trips.map(trip => trip.toJSON())),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: trips.length
      },
      filters
    });
  } catch (error) {
    console.error('Get trips error:', error);
    res.status(500).json({ error: 'Failed to fetch trips' });
  }
});

// Search trips by location
router.get('/search', async (req, res) => {
  try {
    const { from, to, date, radius = 10 } = req.query;

    if (!from || !to) {
      return res.status(400).json({
        error: 'From and to locations are required'
      });
    }

    const trips = await Trip.findByLocation(from, to, date, parseFloat(radius));

    res.json({
      success: true,
      trips: await Promise.all(trips.map(trip => trip.toJSON())),
      search_params: { from, to, date, radius }
    });
  } catch (error) {
    console.error('Search trips error:', error);
    res.status(500).json({ error: 'Failed to search trips' });
  }
});

// Get user's trips (as driver)
router.get('/my-trips', async (req, res) => {
  try {
    const { role = 'driver', status } = req.query;
    let trips = [];

    if (role === 'driver') {
      trips = await Trip.findByDriver(req.user.userId, status);
    } else if (role === 'passenger') {
      const requests = await TripRequest.findByPassenger(req.user.userId, status);
      trips = await Promise.all(
        requests.map(async (request) => {
          const trip = await Trip.findById(request.trip_id);
          return {
            ...await trip.toJSON(),
            request_status: request.status,
            request_id: request.id,
            passenger_count: request.passenger_count,
            pickup_location: request.pickup_location,
            dropoff_location: request.dropoff_location
          };
        })
      );
    }

    res.json({
      success: true,
      trips,
      role,
      status
    });
  } catch (error) {
    console.error('Get user trips error:', error);
    res.status(500).json({ error: 'Failed to fetch user trips' });
  }
});

// Get specific trip
router.get('/:id', async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);

    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    const tripData = await trip.toJSON();

    // If user is the driver, include trip requests
    if (trip.driver_id === req.user.userId) {
      const requests = await trip.getRequests();
      tripData.requests = requests.map(request => request.toJSON());
    }

    res.json({
      success: true,
      trip: tripData
    });
  } catch (error) {
    console.error('Get trip error:', error);
    res.status(500).json({ error: 'Failed to fetch trip' });
  }
});

// Create new trip (driver posts a trip)
router.post('/', async (req, res) => {
  try {
    const {
      route_id,
      departure_datetime,
      available_seats,
      price_per_seat,
      vehicle_info,
      notes,
      pickup_locations = [],
      dropoff_locations = []
    } = req.body;

    // Validate required fields
    if (!route_id || !departure_datetime || !available_seats) {
      return res.status(400).json({
        error: 'Route ID, departure datetime, and available seats are required'
      });
    }

    // Verify route exists
    const route = await Route.findById(route_id);
    if (!route) {
      return res.status(400).json({ error: 'Route not found' });
    }

    // Validate departure time is in the future
    const departureTime = new Date(departure_datetime);
    if (departureTime <= new Date()) {
      return res.status(400).json({
        error: 'Departure time must be in the future'
      });
    }

    const newTrip = await Trip.create({
      route_id,
      driver_id: req.user.userId,
      departure_datetime: departureTime,
      available_seats: parseInt(available_seats),
      price_per_seat: price_per_seat ? parseFloat(price_per_seat) : null,
      vehicle_info,
      notes,
      pickup_locations: pickup_locations.length > 0 ? pickup_locations : null,
      dropoff_locations: dropoff_locations.length > 0 ? dropoff_locations : null
    });

    res.status(201).json({
      success: true,
      message: 'Trip created successfully',
      trip: await newTrip.toJSON()
    });
  } catch (error) {
    console.error('Create trip error:', error);
    res.status(500).json({ error: 'Failed to create trip' });
  }
});

// Update trip
router.put('/:id', async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);

    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    // Only driver can update their trip
    if (trip.driver_id !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized to update this trip' });
    }

    // Don't allow updates to trips that have started
    if (trip.hasStarted()) {
      return res.status(400).json({ error: 'Cannot update trip that has already started' });
    }

    const {
      departure_datetime,
      available_seats,
      price_per_seat,
      vehicle_info,
      notes,
      pickup_locations,
      dropoff_locations,
      status
    } = req.body;

    const updateData = {};
    if (departure_datetime !== undefined) {
      const departureTime = new Date(departure_datetime);
      if (departureTime <= new Date()) {
        return res.status(400).json({
          error: 'Departure time must be in the future'
        });
      }
      updateData.departure_datetime = departureTime;
    }
    if (available_seats !== undefined) updateData.available_seats = parseInt(available_seats);
    if (price_per_seat !== undefined) updateData.price_per_seat = price_per_seat ? parseFloat(price_per_seat) : null;
    if (vehicle_info !== undefined) updateData.vehicle_info = vehicle_info;
    if (notes !== undefined) updateData.notes = notes;
    if (pickup_locations !== undefined) updateData.pickup_locations = pickup_locations.length > 0 ? pickup_locations : null;
    if (dropoff_locations !== undefined) updateData.dropoff_locations = dropoff_locations.length > 0 ? dropoff_locations : null;
    if (status !== undefined && ['active', 'cancelled', 'completed'].includes(status)) {
      updateData.status = status;
    }

    const updatedTrip = await trip.update(updateData);

    res.json({
      success: true,
      message: 'Trip updated successfully',
      trip: await updatedTrip.toJSON()
    });
  } catch (error) {
    console.error('Update trip error:', error);
    res.status(500).json({ error: 'Failed to update trip' });
  }
});

// Cancel trip
router.delete('/:id', async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);

    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    // Only driver can cancel their trip
    if (trip.driver_id !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized to cancel this trip' });
    }

    // Don't allow cancellation of trips that have started
    if (trip.hasStarted()) {
      return res.status(400).json({ error: 'Cannot cancel trip that has already started' });
    }

    await trip.cancel();

    res.json({
      success: true,
      message: 'Trip cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel trip error:', error);
    res.status(500).json({ error: 'Failed to cancel trip' });
  }
});

// Get trip requests
router.get('/:id/requests', async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);

    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    // Only driver can view trip requests
    if (trip.driver_id !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized to view trip requests' });
    }

    const requests = await trip.getRequests();

    res.json({
      success: true,
      trip: {
        id: trip.id,
        route_name: trip.route_name,
        departure_datetime: trip.departure_datetime
      },
      requests: requests.map(request => request.toJSON())
    });
  } catch (error) {
    console.error('Get trip requests error:', error);
    res.status(500).json({ error: 'Failed to fetch trip requests' });
  }
});

// Request to join trip (passenger makes a request)
router.post('/:id/request', async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);

    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    // Cannot request own trip
    if (trip.driver_id === req.user.userId) {
      return res.status(400).json({ error: 'Cannot request your own trip' });
    }

    const {
      passenger_count = 1,
      pickup_location,
      pickup_latitude,
      pickup_longitude,
      dropoff_location,
      dropoff_latitude,
      dropoff_longitude,
      message
    } = req.body;

    // Validate passenger count
    if (passenger_count < 1 || passenger_count > trip.available_seats) {
      return res.status(400).json({
        error: `Passenger count must be between 1 and ${trip.available_seats}`
      });
    }

    // Check if trip has enough available seats
    if (!trip.hasAvailableSeats(passenger_count)) {
      return res.status(400).json({ error: 'Not enough available seats' });
    }

    // Check for existing pending request
    const existingRequest = await TripRequest.findPendingByUserAndTrip(req.user.userId, trip.id);
    if (existingRequest) {
      return res.status(400).json({
        error: 'You already have a pending request for this trip'
      });
    }

    const tripRequest = await TripRequest.create({
      trip_id: trip.id,
      passenger_id: req.user.userId,
      passenger_count: parseInt(passenger_count),
      pickup_location,
      pickup_latitude,
      pickup_longitude,
      dropoff_location,
      dropoff_latitude,
      dropoff_longitude,
      message
    });

    res.status(201).json({
      success: true,
      message: 'Trip request sent successfully',
      request: tripRequest.toJSON()
    });
  } catch (error) {
    console.error('Create trip request error:', error);
    res.status(500).json({ error: 'Failed to create trip request' });
  }
});

// Approve/reject trip request
router.put('/:id/requests/:requestId', async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);

    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    // Only driver can approve/reject requests
    if (trip.driver_id !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized to manage trip requests' });
    }

    const tripRequest = await TripRequest.findById(req.params.requestId);

    if (!tripRequest || tripRequest.trip_id !== trip.id) {
      return res.status(404).json({ error: 'Trip request not found' });
    }

    const { action, message } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Action must be approve or reject' });
    }

    let updatedRequest;
    if (action === 'approve') {
      updatedRequest = await tripRequest.approve(message);
    } else {
      updatedRequest = await tripRequest.reject(message);
    }

    res.json({
      success: true,
      message: `Trip request ${action}d successfully`,
      request: updatedRequest.toJSON()
    });
  } catch (error) {
    console.error('Update trip request error:', error);
    res.status(500).json({ error: 'Failed to update trip request' });
  }
});

// Get passenger's trip requests
router.get('/requests/my-requests', async (req, res) => {
  try {
    const { status } = req.query;
    const requests = await TripRequest.findByPassenger(req.user.userId, status);

    // Include trip details for each request
    const requestsWithTrips = await Promise.all(
      requests.map(async (request) => {
        const trip = await Trip.findById(request.trip_id);
        return {
          ...request.toJSON(),
          trip: await trip.toJSON()
        };
      })
    );

    res.json({
      success: true,
      requests: requestsWithTrips,
      status
    });
  } catch (error) {
    console.error('Get passenger requests error:', error);
    res.status(500).json({ error: 'Failed to fetch trip requests' });
  }
});

// Cancel trip request (passenger cancels their request)
router.delete('/requests/:requestId', async (req, res) => {
  try {
    const tripRequest = await TripRequest.findById(req.params.requestId);

    if (!tripRequest) {
      return res.status(404).json({ error: 'Trip request not found' });
    }

    // Only passenger can cancel their request
    if (tripRequest.passenger_id !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized to cancel this request' });
    }

    // Can only cancel pending or approved requests
    if (!['pending', 'approved'].includes(tripRequest.status)) {
      return res.status(400).json({
        error: 'Can only cancel pending or approved requests'
      });
    }

    await tripRequest.cancel();

    res.json({
      success: true,
      message: 'Trip request cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel trip request error:', error);
    res.status(500).json({ error: 'Failed to cancel trip request' });
  }
});

module.exports = router;
