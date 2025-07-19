const { query } = require('../config/database');

class TripRequest {
  constructor(requestData) {
    this.id = requestData.id;
    this.trip_id = requestData.trip_id;
    this.passenger_id = requestData.passenger_id;
    this.pickup_stop_id = requestData.pickup_stop_id;
    this.dropoff_stop_id = requestData.dropoff_stop_id;
    this.requested_seats = requestData.requested_seats;
    this.request_status = requestData.request_status;
    this.message = requestData.message;
    this.pickup_time = requestData.pickup_time;
    this.dropoff_time = requestData.dropoff_time;
    this.total_price = requestData.total_price;
    this.created_at = requestData.created_at;
    this.updated_at = requestData.updated_at;
  }

  // Create a new trip request
  static async create(requestData) {
    const {
      trip_id, passenger_id, pickup_stop_id, dropoff_stop_id,
      requested_seats = 1, message, pickup_time, dropoff_time
    } = requestData;

    // Calculate total price based on trip price per seat
    const tripQuery = 'SELECT price_per_seat FROM trips WHERE id = $1';
    const tripResult = await query(tripQuery, [trip_id]);
    
    if (tripResult.rows.length === 0) {
      throw new Error('Trip not found');
    }

    const pricePerSeat = parseFloat(tripResult.rows[0].price_per_seat) || 0;
    const total_price = pricePerSeat * requested_seats;

    const insertQuery = `
      INSERT INTO trip_requests (
        trip_id, passenger_id, pickup_stop_id, dropoff_stop_id,
        requested_seats, message, pickup_time, dropoff_time, total_price
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    try {
      const result = await query(insertQuery, [
        trip_id, passenger_id, pickup_stop_id, dropoff_stop_id,
        requested_seats, message, pickup_time, dropoff_time, total_price
      ]);

      return new TripRequest(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }

  // Find request by ID
  static async findById(id, includeDetails = false) {
    const selectQuery = `
      SELECT tr.*, 
             t.title as trip_title, t.departure_time, t.driver_id,
             u.username as passenger_username, u.first_name as passenger_first_name,
             u.last_name as passenger_last_name,
             pickup_stop.name as pickup_stop_name,
             dropoff_stop.name as dropoff_stop_name
      FROM trip_requests tr
      JOIN trips t ON tr.trip_id = t.id
      JOIN users u ON tr.passenger_id = u.id
      LEFT JOIN stop_points pickup_stop ON tr.pickup_stop_id = pickup_stop.id
      LEFT JOIN stop_points dropoff_stop ON tr.dropoff_stop_id = dropoff_stop.id
      WHERE tr.id = $1
    `;
    
    try {
      const result = await query(selectQuery, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const request = new TripRequest(result.rows[0]);
      
      if (includeDetails) {
        request.trip = await request.getTrip();
        request.passenger = await request.getPassenger();
      }

      return request;
    } catch (error) {
      throw error;
    }
  }

  // Find requests by trip
  static async findByTrip(tripId, status = null) {
    let selectQuery = `
      SELECT tr.*, 
             u.username as passenger_username, u.first_name as passenger_first_name,
             u.last_name as passenger_last_name,
             pickup_stop.name as pickup_stop_name,
             dropoff_stop.name as dropoff_stop_name
      FROM trip_requests tr
      JOIN users u ON tr.passenger_id = u.id
      LEFT JOIN stop_points pickup_stop ON tr.pickup_stop_id = pickup_stop.id
      LEFT JOIN stop_points dropoff_stop ON tr.dropoff_stop_id = dropoff_stop.id
      WHERE tr.trip_id = $1
    `;

    const values = [tripId];

    if (status) {
      selectQuery += ` AND tr.request_status = $2`;
      values.push(status);
    }

    selectQuery += ` ORDER BY tr.created_at DESC`;
    
    try {
      const result = await query(selectQuery, values);
      return result.rows.map(row => new TripRequest(row));
    } catch (error) {
      throw error;
    }
  }

  // Find requests by passenger
  static async findByPassenger(passengerId, status = null) {
    let selectQuery = `
      SELECT tr.*, 
             t.title as trip_title, t.departure_time, t.driver_id,
             r.name as route_name, r.start_location, r.end_location,
             driver.username as driver_username,
             pickup_stop.name as pickup_stop_name,
             dropoff_stop.name as dropoff_stop_name
      FROM trip_requests tr
      JOIN trips t ON tr.trip_id = t.id
      JOIN routes r ON t.route_id = r.id
      JOIN users driver ON t.driver_id = driver.id
      LEFT JOIN stop_points pickup_stop ON tr.pickup_stop_id = pickup_stop.id
      LEFT JOIN stop_points dropoff_stop ON tr.dropoff_stop_id = dropoff_stop.id
      WHERE tr.passenger_id = $1
    `;

    const values = [passengerId];

    if (status) {
      selectQuery += ` AND tr.request_status = $2`;
      values.push(status);
    }

    selectQuery += ` ORDER BY tr.created_at DESC`;
    
    try {
      const result = await query(selectQuery, values);
      return result.rows.map(row => new TripRequest(row));
    } catch (error) {
      throw error;
    }
  }

  // Update request status
  async updateStatus(status, updatedBy = null) {
    const allowedStatuses = ['pending', 'approved', 'rejected', 'cancelled'];
    
    if (!allowedStatuses.includes(status)) {
      throw new Error('Invalid status');
    }

    const updateQuery = `
      UPDATE trip_requests 
      SET request_status = $1
      WHERE id = $2
      RETURNING *
    `;

    try {
      const result = await query(updateQuery, [status, this.id]);
      
      if (result.rows.length === 0) {
        throw new Error('Trip request not found');
      }

      Object.assign(this, new TripRequest(result.rows[0]));

      // If approved, check if trip still has available seats
      if (status === 'approved') {
        const trip = await this.getTrip();
        const hasSeats = await trip.hasAvailableSeats(this.requested_seats);
        
        if (!hasSeats) {
          throw new Error('Not enough available seats');
        }
      }

      return this;
    } catch (error) {
      throw error;
    }
  }

  // Approve request
  async approve(approvedBy = null) {
    return await this.updateStatus('approved', approvedBy);
  }

  // Reject request
  async reject(rejectedBy = null) {
    return await this.updateStatus('rejected', rejectedBy);
  }

  // Cancel request
  async cancel() {
    return await this.updateStatus('cancelled');
  }

  // Update request details
  async update(updateData) {
    const allowedFields = [
      'pickup_stop_id', 'dropoff_stop_id', 'requested_seats',
      'message', 'pickup_time', 'dropoff_time'
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

    // Recalculate total price if seats changed
    if (updateData.requested_seats !== undefined) {
      const tripQuery = 'SELECT price_per_seat FROM trips WHERE id = $' + valueIndex;
      values.push(this.trip_id);
      
      const tripResult = await query(tripQuery, values.slice(-1));
      const pricePerSeat = parseFloat(tripResult.rows[0]?.price_per_seat) || 0;
      const newTotalPrice = pricePerSeat * updateData.requested_seats;
      
      updates.push(`total_price = $${valueIndex + 1}`);
      values.push(newTotalPrice);
      valueIndex++;
    }

    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }

    values.push(this.id);
    const updateQuery = `
      UPDATE trip_requests 
      SET ${updates.join(', ')}
      WHERE id = $${valueIndex}
      RETURNING *
    `;

    try {
      const result = await query(updateQuery, values);
      
      if (result.rows.length === 0) {
        throw new Error('Trip request not found');
      }

      Object.assign(this, new TripRequest(result.rows[0]));
      return this;
    } catch (error) {
      throw error;
    }
  }

  // Get trip information
  async getTrip() {
    const Trip = require('./Trip');
    return await Trip.findById(this.trip_id);
  }

  // Get passenger information
  async getPassenger() {
    const User = require('./User');
    return await User.findById(this.passenger_id);
  }

  // Get pickup stop information
  async getPickupStop() {
    if (!this.pickup_stop_id) return null;
    const StopPoint = require('./StopPoint');
    return await StopPoint.findById(this.pickup_stop_id);
  }

  // Get dropoff stop information
  async getDropoffStop() {
    if (!this.dropoff_stop_id) return null;
    const StopPoint = require('./StopPoint');
    return await StopPoint.findById(this.dropoff_stop_id);
  }

  // Check if request can be modified
  canModify() {
    return this.request_status === 'pending';
  }

  // Check if request can be cancelled
  canCancel() {
    return ['pending', 'approved'].includes(this.request_status);
  }

  // Check if user can edit this request
  canEdit(userId) {
    return this.passenger_id === userId && this.canModify();
  }

  // Check if user can approve/reject this request
  async canApprove(userId) {
    const trip = await this.getTrip();
    return trip && trip.driver_id === userId && this.request_status === 'pending';
  }

  // Get request statistics for a trip
  static async getTripRequestStats(tripId) {
    const statsQuery = `
      SELECT 
        request_status,
        COUNT(*) as count,
        SUM(requested_seats) as total_seats,
        SUM(total_price) as total_value
      FROM trip_requests
      WHERE trip_id = $1
      GROUP BY request_status
    `;

    try {
      const result = await query(statsQuery, [tripId]);
      
      const stats = {
        pending: { count: 0, total_seats: 0, total_value: 0 },
        approved: { count: 0, total_seats: 0, total_value: 0 },
        rejected: { count: 0, total_seats: 0, total_value: 0 },
        cancelled: { count: 0, total_seats: 0, total_value: 0 }
      };

      result.rows.forEach(row => {
        stats[row.request_status] = {
          count: parseInt(row.count),
          total_seats: parseInt(row.total_seats) || 0,
          total_value: parseFloat(row.total_value) || 0
        };
      });

      return stats;
    } catch (error) {
      throw error;
    }
  }

  // Return request data as JSON
  async toJSON(includeDetails = false) {
    const requestData = {
      id: this.id,
      trip_id: this.trip_id,
      passenger_id: this.passenger_id,
      pickup_stop_id: this.pickup_stop_id,
      dropoff_stop_id: this.dropoff_stop_id,
      requested_seats: this.requested_seats,
      request_status: this.request_status,
      message: this.message,
      pickup_time: this.pickup_time,
      dropoff_time: this.dropoff_time,
      total_price: this.total_price,
      created_at: this.created_at,
      updated_at: this.updated_at
    };

    if (includeDetails) {
      requestData.trip = await this.getTrip();
      requestData.passenger = await this.getPassenger();
      requestData.pickup_stop = await this.getPickupStop();
      requestData.dropoff_stop = await this.getDropoffStop();
    }

    return requestData;
  }
}

module.exports = TripRequest;
