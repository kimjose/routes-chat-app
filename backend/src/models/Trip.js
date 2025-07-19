const { query } = require('../config/database');

class Trip {
  constructor(tripData) {
    this.id = tripData.id;
    this.route_id = tripData.route_id;
    this.driver_id = tripData.driver_id;
    this.title = tripData.title;
    this.description = tripData.description;
    this.departure_time = tripData.departure_time;
    this.arrival_time = tripData.arrival_time;
    this.available_seats = tripData.available_seats;
    this.price_per_seat = tripData.price_per_seat;
    this.currency = tripData.currency;
    this.trip_status = tripData.trip_status;
    this.pickup_flexibility_minutes = tripData.pickup_flexibility_minutes;
    this.special_instructions = tripData.special_instructions;
    this.is_recurring = tripData.is_recurring;
    this.recurring_pattern = tripData.recurring_pattern;
    this.created_at = tripData.created_at;
    this.updated_at = tripData.updated_at;
  }

  // Create a new trip
  static async create(tripData) {
    const {
      route_id, driver_id, title, description, departure_time,
      arrival_time, available_seats = 1, price_per_seat,
      currency = 'USD', pickup_flexibility_minutes = 15,
      special_instructions, is_recurring = false, recurring_pattern
    } = tripData;

    const insertQuery = `
      INSERT INTO trips (
        route_id, driver_id, title, description, departure_time,
        arrival_time, available_seats, price_per_seat, currency,
        pickup_flexibility_minutes, special_instructions,
        is_recurring, recurring_pattern
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    try {
      const result = await query(insertQuery, [
        route_id, driver_id, title, description, departure_time,
        arrival_time, available_seats, price_per_seat, currency,
        pickup_flexibility_minutes, special_instructions,
        is_recurring, JSON.stringify(recurring_pattern)
      ]);

      return new Trip(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }

  // Find trip by ID
  static async findById(id, includeDetails = false) {
    const selectQuery = `
      SELECT t.*, r.name as route_name, r.start_location, r.end_location,
             u.username as driver_username, u.first_name as driver_first_name,
             u.last_name as driver_last_name
      FROM trips t
      JOIN routes r ON t.route_id = r.id
      JOIN users u ON t.driver_id = u.id
      WHERE t.id = $1
    `;
    
    try {
      const result = await query(selectQuery, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const trip = new Trip(result.rows[0]);
      
      if (includeDetails) {
        trip.route = await trip.getRoute();
        trip.requests = await trip.getRequests();
      }

      return trip;
    } catch (error) {
      throw error;
    }
  }

  // Find trips by driver
  static async findByDriver(driverId, includeExpired = false) {
    let selectQuery = `
      SELECT t.*, r.name as route_name, r.start_location, r.end_location
      FROM trips t
      JOIN routes r ON t.route_id = r.id
      WHERE t.driver_id = $1
    `;

    if (!includeExpired) {
      selectQuery += ` AND t.departure_time > NOW()`;
    }

    selectQuery += ` ORDER BY t.departure_time ASC`;
    
    try {
      const result = await query(selectQuery, [driverId]);
      return result.rows.map(row => new Trip(row));
    } catch (error) {
      throw error;
    }
  }

  // Find trips by route
  static async findByRoute(routeId, includeExpired = false) {
    let selectQuery = `
      SELECT t.*, r.name as route_name, r.start_location, r.end_location,
             u.username as driver_username, u.first_name as driver_first_name,
             u.last_name as driver_last_name
      FROM trips t
      JOIN routes r ON t.route_id = r.id
      JOIN users u ON t.driver_id = u.id
      WHERE t.route_id = $1 AND t.trip_status != 'cancelled'
    `;

    if (!includeExpired) {
      selectQuery += ` AND t.departure_time > NOW()`;
    }

    selectQuery += ` ORDER BY t.departure_time ASC`;
    
    try {
      const result = await query(selectQuery, [routeId]);
      return result.rows.map(row => new Trip(row));
    } catch (error) {
      throw error;
    }
  }

  // Search available trips
  static async searchAvailable(searchParams = {}) {
    const {
      start_location, end_location, departure_date,
      max_price, min_seats = 1, limit = 50, offset = 0
    } = searchParams;

    let selectQuery = `
      SELECT t.*, r.name as route_name, r.start_location, r.end_location,
             u.username as driver_username, u.first_name as driver_first_name,
             u.last_name as driver_last_name,
             (t.available_seats - COALESCE(
               (SELECT SUM(tr.requested_seats) 
                FROM trip_requests tr 
                WHERE tr.trip_id = t.id AND tr.request_status = 'approved'), 0
             )) as remaining_seats
      FROM trips t
      JOIN routes r ON t.route_id = r.id
      JOIN users u ON t.driver_id = u.id
      WHERE t.trip_status = 'scheduled' 
        AND t.departure_time > NOW()
        AND t.available_seats >= $1
    `;

    const values = [min_seats];
    let valueIndex = 2;

    if (start_location) {
      selectQuery += ` AND r.start_location ILIKE $${valueIndex}`;
      values.push(`%${start_location}%`);
      valueIndex++;
    }

    if (end_location) {
      selectQuery += ` AND r.end_location ILIKE $${valueIndex}`;
      values.push(`%${end_location}%`);
      valueIndex++;
    }

    if (departure_date) {
      selectQuery += ` AND DATE(t.departure_time) = $${valueIndex}`;
      values.push(departure_date);
      valueIndex++;
    }

    if (max_price) {
      selectQuery += ` AND t.price_per_seat <= $${valueIndex}`;
      values.push(max_price);
      valueIndex++;
    }

    selectQuery += ` 
      HAVING (t.available_seats - COALESCE(
        (SELECT SUM(tr.requested_seats) 
         FROM trip_requests tr 
         WHERE tr.trip_id = t.id AND tr.request_status = 'approved'), 0
      )) >= $1
      ORDER BY t.departure_time ASC
      LIMIT $${valueIndex} OFFSET $${valueIndex + 1}
    `;

    values.push(limit, offset);

    try {
      const result = await query(selectQuery, values);
      return result.rows.map(row => new Trip(row));
    } catch (error) {
      throw error;
    }
  }

  // Update trip
  async update(updateData) {
    const allowedFields = [
      'title', 'description', 'departure_time', 'arrival_time',
      'available_seats', 'price_per_seat', 'trip_status',
      'pickup_flexibility_minutes', 'special_instructions'
    ];
    
    const updates = [];
    const values = [];
    let valueIndex = 1;

    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        updates.push(`${field} = $${valueIndex}`);
        values.push(updateData[field]);
        valueIndex++;
      }
    }

    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }

    values.push(this.id);
    const updateQuery = `
      UPDATE trips 
      SET ${updates.join(', ')}
      WHERE id = $${valueIndex}
      RETURNING *
    `;

    try {
      const result = await query(updateQuery, values);
      
      if (result.rows.length === 0) {
        throw new Error('Trip not found');
      }

      Object.assign(this, new Trip(result.rows[0]));
      return this;
    } catch (error) {
      throw error;
    }
  }

  // Cancel trip
  async cancel() {
    return await this.update({ trip_status: 'cancelled' });
  }

  // Start trip
  async start() {
    return await this.update({ trip_status: 'active' });
  }

  // Complete trip
  async complete() {
    return await this.update({ trip_status: 'completed' });
  }

  // Get route information
  async getRoute() {
    const Route = require('./Route');
    return await Route.findById(this.route_id, true);
  }

  // Get trip requests
  async getRequests(status = null) {
    const TripRequest = require('./TripRequest');
    return await TripRequest.findByTrip(this.id, status);
  }

  // Get approved passengers
  async getPassengers() {
    const selectQuery = `
      SELECT u.id, u.username, u.first_name, u.last_name, u.email,
             tr.requested_seats, tr.pickup_stop_id, tr.dropoff_stop_id,
             tr.pickup_time, tr.dropoff_time, tr.total_price
      FROM trip_requests tr
      JOIN users u ON tr.passenger_id = u.id
      WHERE tr.trip_id = $1 AND tr.request_status = 'approved'
      ORDER BY tr.created_at ASC
    `;

    try {
      const result = await query(selectQuery, [this.id]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Get remaining seats
  async getRemainingSeats() {
    const selectQuery = `
      SELECT (t.available_seats - COALESCE(
        (SELECT SUM(tr.requested_seats) 
         FROM trip_requests tr 
         WHERE tr.trip_id = t.id AND tr.request_status = 'approved'), 0
      )) as remaining_seats
      FROM trips t
      WHERE t.id = $1
    `;

    try {
      const result = await query(selectQuery, [this.id]);
      return parseInt(result.rows[0]?.remaining_seats) || this.available_seats;
    } catch (error) {
      throw error;
    }
  }

  // Check if trip has available seats
  async hasAvailableSeats(requestedSeats = 1) {
    const remaining = await this.getRemainingSeats();
    return remaining >= requestedSeats;
  }

  // Check if user can edit this trip
  canEdit(userId) {
    return this.driver_id === userId;
  }

  // Check if trip is bookable
  isBookable() {
    const now = new Date();
    const departureTime = new Date(this.departure_time);
    
    return this.trip_status === 'scheduled' && 
           departureTime > now &&
           this.available_seats > 0;
  }

  // Get total revenue for this trip
  async getTotalRevenue() {
    const selectQuery = `
      SELECT SUM(tr.total_price) as total_revenue
      FROM trip_requests tr
      WHERE tr.trip_id = $1 AND tr.request_status = 'approved'
    `;

    try {
      const result = await query(selectQuery, [this.id]);
      return parseFloat(result.rows[0]?.total_revenue) || 0;
    } catch (error) {
      throw error;
    }
  }

  // Return trip data as JSON
  async toJSON(includeDetails = false) {
    const tripData = {
      id: this.id,
      route_id: this.route_id,
      driver_id: this.driver_id,
      title: this.title,
      description: this.description,
      departure_time: this.departure_time,
      arrival_time: this.arrival_time,
      available_seats: this.available_seats,
      price_per_seat: this.price_per_seat,
      currency: this.currency,
      trip_status: this.trip_status,
      pickup_flexibility_minutes: this.pickup_flexibility_minutes,
      special_instructions: this.special_instructions,
      is_recurring: this.is_recurring,
      recurring_pattern: this.recurring_pattern,
      created_at: this.created_at,
      updated_at: this.updated_at
    };

    if (includeDetails) {
      tripData.route = await this.getRoute();
      tripData.passengers = await this.getPassengers();
      tripData.remaining_seats = await this.getRemainingSeats();
      tripData.total_revenue = await this.getTotalRevenue();
    }

    return tripData;
  }
}

module.exports = Trip;
