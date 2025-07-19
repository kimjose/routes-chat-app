const { query } = require('../config/database');

const createRoutesTable = async () => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS routes (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      start_location VARCHAR(255) NOT NULL,
      end_location VARCHAR(255) NOT NULL,
      start_latitude DECIMAL(10, 8),
      start_longitude DECIMAL(11, 8),
      end_latitude DECIMAL(10, 8),
      end_longitude DECIMAL(11, 8),
      distance_km DECIMAL(8, 2),
      estimated_duration_minutes INTEGER,
      route_type VARCHAR(50) DEFAULT 'custom' CHECK (route_type IN ('default', 'custom')),
      created_by INTEGER,
      is_active BOOLEAN DEFAULT true,
      is_public BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      
      CONSTRAINT fk_routes_created_by 
        FOREIGN KEY (created_by) 
        REFERENCES users(id) 
        ON DELETE SET NULL
    )
  `;

  try {
    await query(createTableQuery);
    console.log('Routes table created successfully');
  } catch (error) {
    console.error('Error creating routes table:', error);
    throw error;
  }
};

const createStopPointsTable = async () => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS stop_points (
      id SERIAL PRIMARY KEY,
      route_id INTEGER NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      latitude DECIMAL(10, 8) NOT NULL,
      longitude DECIMAL(11, 8) NOT NULL,
      address TEXT,
      stop_order INTEGER NOT NULL,
      is_pickup_point BOOLEAN DEFAULT true,
      is_dropoff_point BOOLEAN DEFAULT true,
      estimated_arrival_time INTEGER, -- minutes from route start
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      
      CONSTRAINT fk_stop_points_route_id 
        FOREIGN KEY (route_id) 
        REFERENCES routes(id) 
        ON DELETE CASCADE,
        
      CONSTRAINT unique_route_stop_order 
        UNIQUE(route_id, stop_order)
    )
  `;

  try {
    await query(createTableQuery);
    console.log('Stop points table created successfully');
  } catch (error) {
    console.error('Error creating stop_points table:', error);
    throw error;
  }
};

const createTripsTable = async () => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS trips (
      id SERIAL PRIMARY KEY,
      route_id INTEGER NOT NULL,
      driver_id INTEGER NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      departure_time TIMESTAMP WITH TIME ZONE NOT NULL,
      arrival_time TIMESTAMP WITH TIME ZONE,
      available_seats INTEGER NOT NULL DEFAULT 1,
      price_per_seat DECIMAL(8, 2),
      currency VARCHAR(3) DEFAULT 'USD',
      trip_status VARCHAR(50) DEFAULT 'scheduled' CHECK (
        trip_status IN ('scheduled', 'active', 'completed', 'cancelled')
      ),
      pickup_flexibility_minutes INTEGER DEFAULT 15,
      special_instructions TEXT,
      is_recurring BOOLEAN DEFAULT false,
      recurring_pattern JSONB, -- For recurring trips (weekly, daily, etc.)
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      
      CONSTRAINT fk_trips_route_id 
        FOREIGN KEY (route_id) 
        REFERENCES routes(id) 
        ON DELETE CASCADE,
        
      CONSTRAINT fk_trips_driver_id 
        FOREIGN KEY (driver_id) 
        REFERENCES users(id) 
        ON DELETE CASCADE
    )
  `;

  try {
    await query(createTableQuery);
    console.log('Trips table created successfully');
  } catch (error) {
    console.error('Error creating trips table:', error);
    throw error;
  }
};

const createTripRequestsTable = async () => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS trip_requests (
      id SERIAL PRIMARY KEY,
      trip_id INTEGER NOT NULL,
      passenger_id INTEGER NOT NULL,
      pickup_stop_id INTEGER,
      dropoff_stop_id INTEGER,
      requested_seats INTEGER DEFAULT 1,
      request_status VARCHAR(50) DEFAULT 'pending' CHECK (
        request_status IN ('pending', 'approved', 'rejected', 'cancelled')
      ),
      message TEXT,
      pickup_time TIMESTAMP WITH TIME ZONE,
      dropoff_time TIMESTAMP WITH TIME ZONE,
      total_price DECIMAL(8, 2),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      
      CONSTRAINT fk_trip_requests_trip_id 
        FOREIGN KEY (trip_id) 
        REFERENCES trips(id) 
        ON DELETE CASCADE,
        
      CONSTRAINT fk_trip_requests_passenger_id 
        FOREIGN KEY (passenger_id) 
        REFERENCES users(id) 
        ON DELETE CASCADE,
        
      CONSTRAINT fk_trip_requests_pickup_stop 
        FOREIGN KEY (pickup_stop_id) 
        REFERENCES stop_points(id) 
        ON DELETE SET NULL,
        
      CONSTRAINT fk_trip_requests_dropoff_stop 
        FOREIGN KEY (dropoff_stop_id) 
        REFERENCES stop_points(id) 
        ON DELETE SET NULL,
        
      CONSTRAINT unique_passenger_trip 
        UNIQUE(trip_id, passenger_id)
    )
  `;

  try {
    await query(createTableQuery);
    console.log('Trip requests table created successfully');
  } catch (error) {
    console.error('Error creating trip_requests table:', error);
    throw error;
  }
};

const createRouteRatingsTable = async () => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS route_ratings (
      id SERIAL PRIMARY KEY,
      route_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      review TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      
      CONSTRAINT fk_route_ratings_route_id 
        FOREIGN KEY (route_id) 
        REFERENCES routes(id) 
        ON DELETE CASCADE,
        
      CONSTRAINT fk_route_ratings_user_id 
        FOREIGN KEY (user_id) 
        REFERENCES users(id) 
        ON DELETE CASCADE,
        
      CONSTRAINT unique_user_route_rating 
        UNIQUE(route_id, user_id)
    )
  `;

  try {
    await query(createTableQuery);
    console.log('Route ratings table created successfully');
  } catch (error) {
    console.error('Error creating route_ratings table:', error);
    throw error;
  }
};

const createRouteIndexes = async () => {
  const indexes = [
    // Routes table indexes
    'CREATE INDEX IF NOT EXISTS idx_routes_created_by ON routes(created_by)',
    'CREATE INDEX IF NOT EXISTS idx_routes_type ON routes(route_type)',
    'CREATE INDEX IF NOT EXISTS idx_routes_is_active ON routes(is_active)',
    'CREATE INDEX IF NOT EXISTS idx_routes_is_public ON routes(is_public)',
    'CREATE INDEX IF NOT EXISTS idx_routes_start_location ON routes(start_location)',
    'CREATE INDEX IF NOT EXISTS idx_routes_end_location ON routes(end_location)',
    'CREATE INDEX IF NOT EXISTS idx_routes_coordinates ON routes(start_latitude, start_longitude, end_latitude, end_longitude)',
    
    // Stop points table indexes
    'CREATE INDEX IF NOT EXISTS idx_stop_points_route_id ON stop_points(route_id)',
    'CREATE INDEX IF NOT EXISTS idx_stop_points_coordinates ON stop_points(latitude, longitude)',
    'CREATE INDEX IF NOT EXISTS idx_stop_points_order ON stop_points(route_id, stop_order)',
    
    // Trips table indexes
    'CREATE INDEX IF NOT EXISTS idx_trips_route_id ON trips(route_id)',
    'CREATE INDEX IF NOT EXISTS idx_trips_driver_id ON trips(driver_id)',
    'CREATE INDEX IF NOT EXISTS idx_trips_departure_time ON trips(departure_time)',
    'CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(trip_status)',
    'CREATE INDEX IF NOT EXISTS idx_trips_available_seats ON trips(available_seats)',
    
    // Trip requests table indexes
    'CREATE INDEX IF NOT EXISTS idx_trip_requests_trip_id ON trip_requests(trip_id)',
    'CREATE INDEX IF NOT EXISTS idx_trip_requests_passenger_id ON trip_requests(passenger_id)',
    'CREATE INDEX IF NOT EXISTS idx_trip_requests_status ON trip_requests(request_status)',
    'CREATE INDEX IF NOT EXISTS idx_trip_requests_pickup_stop ON trip_requests(pickup_stop_id)',
    'CREATE INDEX IF NOT EXISTS idx_trip_requests_dropoff_stop ON trip_requests(dropoff_stop_id)',
    
    // Route ratings table indexes
    'CREATE INDEX IF NOT EXISTS idx_route_ratings_route_id ON route_ratings(route_id)',
    'CREATE INDEX IF NOT EXISTS idx_route_ratings_user_id ON route_ratings(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_route_ratings_rating ON route_ratings(rating)'
  ];

  try {
    for (const indexQuery of indexes) {
      await query(indexQuery);
    }
    console.log('Route indexes created successfully');
  } catch (error) {
    console.error('Error creating route indexes:', error);
    throw error;
  }
};

const createRouteTriggers = async () => {
  // Triggers for updated_at fields
  const triggers = [
    {
      table: 'routes',
      trigger: `
        DROP TRIGGER IF EXISTS update_routes_updated_at ON routes;
        CREATE TRIGGER update_routes_updated_at
            BEFORE UPDATE ON routes
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
      `
    },
    {
      table: 'stop_points',
      trigger: `
        DROP TRIGGER IF EXISTS update_stop_points_updated_at ON stop_points;
        CREATE TRIGGER update_stop_points_updated_at
            BEFORE UPDATE ON stop_points
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
      `
    },
    {
      table: 'trips',
      trigger: `
        DROP TRIGGER IF EXISTS update_trips_updated_at ON trips;
        CREATE TRIGGER update_trips_updated_at
            BEFORE UPDATE ON trips
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
      `
    },
    {
      table: 'trip_requests',
      trigger: `
        DROP TRIGGER IF EXISTS update_trip_requests_updated_at ON trip_requests;
        CREATE TRIGGER update_trip_requests_updated_at
            BEFORE UPDATE ON trip_requests
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
      `
    },
    {
      table: 'route_ratings',
      trigger: `
        DROP TRIGGER IF EXISTS update_route_ratings_updated_at ON route_ratings;
        CREATE TRIGGER update_route_ratings_updated_at
            BEFORE UPDATE ON route_ratings
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
      `
    }
  ];

  try {
    for (const { table, trigger } of triggers) {
      await query(trigger);
    }
    console.log('Route triggers created successfully');
  } catch (error) {
    console.error('Error creating route triggers:', error);
    throw error;
  }
};

const insertDefaultRoutes = async () => {
  const defaultRoutes = [
    {
      name: 'CBD to Airport',
      description: 'Popular route from Central Business District to the main airport',
      start_location: 'Central Business District',
      end_location: 'Main Airport',
      start_latitude: -1.2864,
      start_longitude: 36.8172,
      end_latitude: -1.3192,
      end_longitude: 36.9278,
      distance_km: 18.5,
      estimated_duration_minutes: 45,
      route_type: 'default',
      is_public: true
    },
    {
      name: 'University to Shopping Mall',
      description: 'Route connecting main university campus to the largest shopping mall',
      start_location: 'University of Nairobi',
      end_location: 'Westgate Shopping Mall',
      start_latitude: -1.2796,
      start_longitude: 36.8077,
      end_latitude: -1.2676,
      end_longitude: 36.8071,
      distance_km: 8.2,
      estimated_duration_minutes: 25,
      route_type: 'default',
      is_public: true
    },
    {
      name: 'Industrial Area to Residential Zone',
      description: 'Daily commuter route from industrial area to main residential zone',
      start_location: 'Industrial Area',
      end_location: 'Karen',
      start_latitude: -1.3031,
      start_longitude: 36.8595,
      end_latitude: -1.3197,
      end_longitude: 36.6829,
      distance_km: 15.3,
      estimated_duration_minutes: 35,
      route_type: 'default',
      is_public: true
    }
  ];

  try {
    for (const route of defaultRoutes) {
      const insertQuery = `
        INSERT INTO routes (
          name, description, start_location, end_location, 
          start_latitude, start_longitude, end_latitude, end_longitude,
          distance_km, estimated_duration_minutes, route_type, is_public
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (name) DO NOTHING
        RETURNING id
      `;
      
      const result = await query(insertQuery, [
        route.name, route.description, route.start_location, route.end_location,
        route.start_latitude, route.start_longitude, route.end_latitude, route.end_longitude,
        route.distance_km, route.estimated_duration_minutes, route.route_type, route.is_public
      ]);

      // Add stop points for each default route
      if (result.rows.length > 0) {
        const routeId = result.rows[0].id;
        await insertDefaultStopPoints(routeId, route.name);
      }
    }
    console.log('Default routes inserted successfully');
  } catch (error) {
    console.error('Error inserting default routes:', error);
    throw error;
  }
};

const insertDefaultStopPoints = async (routeId, routeName) => {
  const stopPointsMap = {
    'CBD to Airport': [
      { name: 'CBD Bus Station', latitude: -1.2864, longitude: 36.8172, stop_order: 1, address: 'Tom Mboya Street, Nairobi' },
      { name: 'Uhuru Highway Junction', latitude: -1.2921, longitude: 36.8219, stop_order: 2, address: 'Uhuru Highway, Nairobi' },
      { name: 'Wilson Airport', latitude: -1.3218, longitude: 36.8148, stop_order: 3, address: 'Wilson Airport, Nairobi' },
      { name: 'JKIA Terminal 1', latitude: -1.3192, longitude: 36.9278, stop_order: 4, address: 'Jomo Kenyatta International Airport' }
    ],
    'University to Shopping Mall': [
      { name: 'University Main Gate', latitude: -1.2796, longitude: 36.8077, stop_order: 1, address: 'University Way, Nairobi' },
      { name: 'Museum Hill', latitude: -1.2743, longitude: 36.8138, stop_order: 2, address: 'Museum Hill, Nairobi' },
      { name: 'Westlands Roundabout', latitude: -1.2693, longitude: 36.8096, stop_order: 3, address: 'Westlands Roundabout, Nairobi' },
      { name: 'Westgate Mall', latitude: -1.2676, longitude: 36.8071, stop_order: 4, address: 'Westgate Shopping Mall, Westlands' }
    ],
    'Industrial Area to Residential Zone': [
      { name: 'Industrial Area Gate', latitude: -1.3031, longitude: 36.8595, stop_order: 1, address: 'Enterprise Road, Industrial Area' },
      { name: 'Nyayo Stadium', latitude: -1.3017, longitude: 36.8344, stop_order: 2, address: 'Nyayo National Stadium' },
      { name: 'Lang\'ata Road Junction', latitude: -1.3141, longitude: 36.7821, stop_order: 3, address: 'Lang\'ata Road, Nairobi' },
      { name: 'Karen Shopping Center', latitude: -1.3197, longitude: 36.6829, stop_order: 4, address: 'Karen Shopping Center' }
    ]
  };

  const stopPoints = stopPointsMap[routeName] || [];
  
  try {
    for (const stop of stopPoints) {
      const insertStopQuery = `
        INSERT INTO stop_points (
          route_id, name, latitude, longitude, address, stop_order,
          estimated_arrival_time, is_pickup_point, is_dropoff_point
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `;
      
      const estimatedTime = (stop.stop_order - 1) * 10; // 10 minutes between stops
      
      await query(insertStopQuery, [
        routeId, stop.name, stop.latitude, stop.longitude, stop.address,
        stop.stop_order, estimatedTime, true, true
      ]);
    }
  } catch (error) {
    console.error(`Error inserting stop points for route ${routeName}:`, error);
    throw error;
  }
};

const initializeRoutesTables = async () => {
  try {
    await createRoutesTable();
    await createStopPointsTable();
    await createTripsTable();
    await createTripRequestsTable();
    await createRouteRatingsTable();
    await createRouteIndexes();
    await createRouteTriggers();
    await insertDefaultRoutes();
    console.log('Routes tables initialization completed');
  } catch (error) {
    console.error('Error initializing routes tables:', error);
    throw error;
  }
};

module.exports = {
  createRoutesTable,
  createStopPointsTable,
  createTripsTable,
  createTripRequestsTable,
  createRouteRatingsTable,
  createRouteIndexes,
  createRouteTriggers,
  insertDefaultRoutes,
  insertDefaultStopPoints,
  initializeRoutesTables
};
