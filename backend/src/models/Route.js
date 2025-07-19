const { query } = require('../config/database');

class Route {
  constructor(routeData) {
    this.id = routeData.id;
    this.name = routeData.name;
    this.description = routeData.description;
    this.start_location = routeData.start_location;
    this.end_location = routeData.end_location;
    this.start_latitude = routeData.start_latitude;
    this.start_longitude = routeData.start_longitude;
    this.end_latitude = routeData.end_latitude;
    this.end_longitude = routeData.end_longitude;
    this.distance_km = routeData.distance_km;
    this.estimated_duration_minutes = routeData.estimated_duration_minutes;
    this.route_type = routeData.route_type;
    this.created_by = routeData.created_by;
    this.is_active = routeData.is_active;
    this.is_public = routeData.is_public;
    this.created_at = routeData.created_at;
    this.updated_at = routeData.updated_at;
  }

  // Create a new route
  static async create(routeData) {
    const {
      name, description, start_location, end_location,
      start_latitude, start_longitude, end_latitude, end_longitude,
      distance_km, estimated_duration_minutes, route_type = 'custom',
      created_by, is_public = false
    } = routeData;

    const insertQuery = `
      INSERT INTO routes (
        name, description, start_location, end_location,
        start_latitude, start_longitude, end_latitude, end_longitude,
        distance_km, estimated_duration_minutes, route_type, created_by, is_public
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    try {
      const result = await query(insertQuery, [
        name, description, start_location, end_location,
        start_latitude, start_longitude, end_latitude, end_longitude,
        distance_km, estimated_duration_minutes, route_type, created_by, is_public
      ]);

      return new Route(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }

  // Find route by ID
  static async findById(id, includeStops = false) {
    const selectQuery = 'SELECT * FROM routes WHERE id = $1 AND is_active = true';
    
    try {
      const result = await query(selectQuery, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const route = new Route(result.rows[0]);
      
      if (includeStops) {
        route.stop_points = await route.getStopPoints();
      }

      return route;
    } catch (error) {
      throw error;
    }
  }

  // Find routes by user
  static async findByUser(userId, includeStops = false) {
    const selectQuery = `
      SELECT * FROM routes 
      WHERE created_by = $1 AND is_active = true 
      ORDER BY created_at DESC
    `;
    
    try {
      const result = await query(selectQuery, [userId]);
      const routes = result.rows.map(row => new Route(row));
      
      if (includeStops) {
        for (const route of routes) {
          route.stop_points = await route.getStopPoints();
        }
      }

      return routes;
    } catch (error) {
      throw error;
    }
  }

  // Find public routes
  static async findPublicRoutes(includeStops = false, limit = 50, offset = 0) {
    const selectQuery = `
      SELECT r.*, u.username as creator_username
      FROM routes r
      LEFT JOIN users u ON r.created_by = u.id
      WHERE r.is_public = true AND r.is_active = true
      ORDER BY r.created_at DESC
      LIMIT $1 OFFSET $2
    `;
    
    try {
      const result = await query(selectQuery, [limit, offset]);
      const routes = result.rows.map(row => new Route(row));
      
      if (includeStops) {
        for (const route of routes) {
          route.stop_points = await route.getStopPoints();
        }
      }

      return routes;
    } catch (error) {
      throw error;
    }
  }

  // Search routes by location
  static async searchByLocation(searchTerm, includeStops = false) {
    const selectQuery = `
      SELECT r.*, u.username as creator_username
      FROM routes r
      LEFT JOIN users u ON r.created_by = u.id
      WHERE r.is_active = true AND (
        r.start_location ILIKE $1 OR 
        r.end_location ILIKE $1 OR 
        r.name ILIKE $1 OR
        r.description ILIKE $1
      )
      ORDER BY r.created_at DESC
    `;
    
    try {
      const result = await query(selectQuery, [`%${searchTerm}%`]);
      const routes = result.rows.map(row => new Route(row));
      
      if (includeStops) {
        for (const route of routes) {
          route.stop_points = await route.getStopPoints();
        }
      }

      return routes;
    } catch (error) {
      throw error;
    }
  }

  // Find routes within distance
  static async findNearby(latitude, longitude, radiusKm = 10, includeStops = false) {
    const selectQuery = `
      SELECT r.*, u.username as creator_username,
        (6371 * acos(
          cos(radians($1)) * cos(radians(r.start_latitude)) *
          cos(radians(r.start_longitude) - radians($2)) +
          sin(radians($1)) * sin(radians(r.start_latitude))
        )) as distance_from_start,
        (6371 * acos(
          cos(radians($1)) * cos(radians(r.end_latitude)) *
          cos(radians(r.end_longitude) - radians($2)) +
          sin(radians($1)) * sin(radians(r.end_latitude))
        )) as distance_from_end
      FROM routes r
      LEFT JOIN users u ON r.created_by = u.id
      WHERE r.is_active = true AND (
        (6371 * acos(
          cos(radians($1)) * cos(radians(r.start_latitude)) *
          cos(radians(r.start_longitude) - radians($2)) +
          sin(radians($1)) * sin(radians(r.start_latitude))
        )) <= $3
        OR
        (6371 * acos(
          cos(radians($1)) * cos(radians(r.end_latitude)) *
          cos(radians(r.end_longitude) - radians($2)) +
          sin(radians($1)) * sin(radians(r.end_latitude))
        )) <= $3
      )
      ORDER BY LEAST(distance_from_start, distance_from_end)
    `;
    
    try {
      const result = await query(selectQuery, [latitude, longitude, radiusKm]);
      const routes = result.rows.map(row => new Route(row));
      
      if (includeStops) {
        for (const route of routes) {
          route.stop_points = await route.getStopPoints();
        }
      }

      return routes;
    } catch (error) {
      throw error;
    }
  }

  // Update route
  async update(updateData) {
    const allowedFields = [
      'name', 'description', 'start_location', 'end_location',
      'start_latitude', 'start_longitude', 'end_latitude', 'end_longitude',
      'distance_km', 'estimated_duration_minutes', 'is_public', 'is_active'
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
      UPDATE routes 
      SET ${updates.join(', ')}
      WHERE id = $${valueIndex}
      RETURNING *
    `;

    try {
      const result = await query(updateQuery, values);
      
      if (result.rows.length === 0) {
        throw new Error('Route not found');
      }

      Object.assign(this, new Route(result.rows[0]));
      return this;
    } catch (error) {
      throw error;
    }
  }

  // Soft delete route
  async delete() {
    const deleteQuery = `
      UPDATE routes 
      SET is_active = false
      WHERE id = $1
      RETURNING id
    `;

    try {
      const result = await query(deleteQuery, [this.id]);
      
      if (result.rows.length === 0) {
        throw new Error('Route not found');
      }

      this.is_active = false;
      return this;
    } catch (error) {
      throw error;
    }
  }

  // Get stop points for this route
  async getStopPoints() {
    const StopPoint = require('./StopPoint');
    return await StopPoint.findByRoute(this.id);
  }

  // Add stop point to route
  async addStopPoint(stopData) {
    const StopPoint = require('./StopPoint');
    return await StopPoint.create({ ...stopData, route_id: this.id });
  }

  // Get trips for this route
  async getTrips(includeExpired = false) {
    const Trip = require('./Trip');
    return await Trip.findByRoute(this.id, includeExpired);
  }

  // Get route ratings
  async getRatings() {
    const selectQuery = `
      SELECT rr.*, u.username
      FROM route_ratings rr
      JOIN users u ON rr.user_id = u.id
      WHERE rr.route_id = $1
      ORDER BY rr.created_at DESC
    `;

    try {
      const result = await query(selectQuery, [this.id]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Get average rating
  async getAverageRating() {
    const selectQuery = `
      SELECT AVG(rating)::DECIMAL(3,2) as average_rating, COUNT(*) as total_ratings
      FROM route_ratings
      WHERE route_id = $1
    `;

    try {
      const result = await query(selectQuery, [this.id]);
      return {
        average_rating: parseFloat(result.rows[0].average_rating) || 0,
        total_ratings: parseInt(result.rows[0].total_ratings) || 0
      };
    } catch (error) {
      throw error;
    }
  }

  // Check if user can edit this route
  canEdit(userId) {
    return this.created_by === userId || this.route_type === 'custom';
  }

  // Return route data as JSON
  async toJSON(includeStops = false, includeRating = false) {
    const routeData = {
      id: this.id,
      name: this.name,
      description: this.description,
      start_location: this.start_location,
      end_location: this.end_location,
      start_latitude: this.start_latitude,
      start_longitude: this.start_longitude,
      end_latitude: this.end_latitude,
      end_longitude: this.end_longitude,
      distance_km: this.distance_km,
      estimated_duration_minutes: this.estimated_duration_minutes,
      route_type: this.route_type,
      created_by: this.created_by,
      is_active: this.is_active,
      is_public: this.is_public,
      created_at: this.created_at,
      updated_at: this.updated_at
    };

    if (includeStops) {
      routeData.stop_points = await this.getStopPoints();
    }

    if (includeRating) {
      routeData.rating = await this.getAverageRating();
    }

    return routeData;
  }
}

module.exports = Route;
