const { query } = require('../config/database');

class StopPoint {
  constructor(stopData) {
    this.id = stopData.id;
    this.route_id = stopData.route_id;
    this.name = stopData.name;
    this.description = stopData.description;
    this.latitude = stopData.latitude;
    this.longitude = stopData.longitude;
    this.address = stopData.address;
    this.stop_order = stopData.stop_order;
    this.is_pickup_point = stopData.is_pickup_point;
    this.is_dropoff_point = stopData.is_dropoff_point;
    this.estimated_arrival_time = stopData.estimated_arrival_time;
    this.created_at = stopData.created_at;
    this.updated_at = stopData.updated_at;
  }

  // Create a new stop point
  static async create(stopData) {
    const {
      route_id, name, description, latitude, longitude, address,
      stop_order, is_pickup_point = true, is_dropoff_point = true,
      estimated_arrival_time
    } = stopData;

    // If stop_order is not provided, get the next order number
    let order = stop_order;
    if (!order) {
      const orderQuery = `
        SELECT COALESCE(MAX(stop_order), 0) + 1 as next_order
        FROM stop_points
        WHERE route_id = $1
      `;
      const orderResult = await query(orderQuery, [route_id]);
      order = orderResult.rows[0].next_order;
    }

    const insertQuery = `
      INSERT INTO stop_points (
        route_id, name, description, latitude, longitude, address,
        stop_order, is_pickup_point, is_dropoff_point, estimated_arrival_time
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    try {
      const result = await query(insertQuery, [
        route_id, name, description, latitude, longitude, address,
        order, is_pickup_point, is_dropoff_point, estimated_arrival_time
      ]);

      return new StopPoint(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }

  // Find stop point by ID
  static async findById(id) {
    const selectQuery = 'SELECT * FROM stop_points WHERE id = $1';
    
    try {
      const result = await query(selectQuery, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return new StopPoint(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }

  // Find stop points by route
  static async findByRoute(routeId) {
    const selectQuery = `
      SELECT * FROM stop_points 
      WHERE route_id = $1 
      ORDER BY stop_order ASC
    `;
    
    try {
      const result = await query(selectQuery, [routeId]);
      return result.rows.map(row => new StopPoint(row));
    } catch (error) {
      throw error;
    }
  }

  // Find nearby stop points
  static async findNearby(latitude, longitude, radiusKm = 5) {
    const selectQuery = `
      SELECT sp.*, r.name as route_name,
        (6371 * acos(
          cos(radians($1)) * cos(radians(sp.latitude)) *
          cos(radians(sp.longitude) - radians($2)) +
          sin(radians($1)) * sin(radians(sp.latitude))
        )) as distance
      FROM stop_points sp
      JOIN routes r ON sp.route_id = r.id
      WHERE r.is_active = true AND (
        6371 * acos(
          cos(radians($1)) * cos(radians(sp.latitude)) *
          cos(radians(sp.longitude) - radians($2)) +
          sin(radians($1)) * sin(radians(sp.latitude))
        )
      ) <= $3
      ORDER BY distance
    `;
    
    try {
      const result = await query(selectQuery, [latitude, longitude, radiusKm]);
      return result.rows.map(row => new StopPoint(row));
    } catch (error) {
      throw error;
    }
  }

  // Update stop point
  async update(updateData) {
    const allowedFields = [
      'name', 'description', 'latitude', 'longitude', 'address',
      'stop_order', 'is_pickup_point', 'is_dropoff_point', 'estimated_arrival_time'
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
      UPDATE stop_points 
      SET ${updates.join(', ')}
      WHERE id = $${valueIndex}
      RETURNING *
    `;

    try {
      const result = await query(updateQuery, values);
      
      if (result.rows.length === 0) {
        throw new Error('Stop point not found');
      }

      Object.assign(this, new StopPoint(result.rows[0]));
      return this;
    } catch (error) {
      throw error;
    }
  }

  // Delete stop point
  async delete() {
    const deleteQuery = 'DELETE FROM stop_points WHERE id = $1 RETURNING id';

    try {
      const result = await query(deleteQuery, [this.id]);
      
      if (result.rows.length === 0) {
        throw new Error('Stop point not found');
      }

      // Reorder remaining stop points
      await this.reorderStopPoints();

      return this;
    } catch (error) {
      throw error;
    }
  }

  // Reorder stop points after deletion
  async reorderStopPoints() {
    const reorderQuery = `
      UPDATE stop_points 
      SET stop_order = new_order
      FROM (
        SELECT id, ROW_NUMBER() OVER (ORDER BY stop_order) as new_order
        FROM stop_points
        WHERE route_id = $1
      ) as ordered_stops
      WHERE stop_points.id = ordered_stops.id
    `;

    try {
      await query(reorderQuery, [this.route_id]);
    } catch (error) {
      throw error;
    }
  }

  // Get route information
  async getRoute() {
    const Route = require('./Route');
    return await Route.findById(this.route_id);
  }

  // Check if this is a pickup point
  isPickupPoint() {
    return this.is_pickup_point;
  }

  // Check if this is a dropoff point
  isDropoffPoint() {
    return this.is_dropoff_point;
  }

  // Calculate distance to another point
  calculateDistanceTo(latitude, longitude) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (latitude - this.latitude) * Math.PI / 180;
    const dLon = (longitude - this.longitude) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.latitude * Math.PI / 180) * Math.cos(latitude * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in kilometers
  }

  // Return stop point data as JSON
  toJSON() {
    return {
      id: this.id,
      route_id: this.route_id,
      name: this.name,
      description: this.description,
      latitude: this.latitude,
      longitude: this.longitude,
      address: this.address,
      stop_order: this.stop_order,
      is_pickup_point: this.is_pickup_point,
      is_dropoff_point: this.is_dropoff_point,
      estimated_arrival_time: this.estimated_arrival_time,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

module.exports = StopPoint;
