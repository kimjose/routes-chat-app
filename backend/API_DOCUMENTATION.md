# Routes Chat App API Documentation

## Overview
This API provides endpoints for managing routes, trips, and bookings in a ride-sharing application. All authenticated endpoints require a valid JWT token in the Authorization header.

## Authentication
All API endpoints (except `/auth/login` and `/auth/register`) require authentication:
```
Authorization: Bearer <jwt_token>
```

## Base URL
```
http://localhost:3000/api
```

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `GET /auth/profile` - Get user profile
- `PUT /auth/profile` - Update user profile

### Routes Management

#### Get All Routes
```http
GET /routes
```
Query Parameters:
- `page` (number, default: 1) - Page number
- `limit` (number, default: 50) - Items per page
- `include_stops` (boolean) - Include stop points

#### Search Routes
```http
GET /routes/search
```
Query Parameters:
- `q` (string) - Search term for location
- `lat` (number) - Latitude for nearby search
- `lng` (number) - Longitude for nearby search
- `radius` (number, default: 10) - Search radius in km
- `include_stops` (boolean) - Include stop points

#### Get User's Routes
```http
GET /routes/my-routes
```
Query Parameters:
- `include_stops` (boolean) - Include stop points

#### Get Specific Route
```http
GET /routes/:id
```
Query Parameters:
- `include_stops` (boolean) - Include stop points

#### Create New Route
```http
POST /routes
```
Body:
```json
{
  "name": "CBD to Airport",
  "description": "Fast route from city center to airport",
  "start_location": "CBD Nairobi",
  "end_location": "JKIA Airport",
  "start_latitude": -1.2864,
  "start_longitude": 36.8172,
  "end_latitude": -1.3192,
  "end_longitude": 36.9275,
  "distance_km": 18.5,
  "estimated_duration_minutes": 45,
  "is_public": true,
  "stop_points": [
    {
      "name": "Westlands",
      "latitude": -1.2630,
      "longitude": 36.8063,
      "address": "Westlands, Nairobi",
      "is_pickup_point": true,
      "is_dropoff_point": true
    }
  ]
}
```

#### Update Route
```http
PUT /routes/:id
```
Body: Same as create route (all fields optional)

#### Delete Route
```http
DELETE /routes/:id
```

#### Route Stop Points
```http
GET /routes/:id/stops
POST /routes/:id/stops
PUT /routes/:id/stops/:stopId
DELETE /routes/:id/stops/:stopId
```

#### Route Trips
```http
GET /routes/:id/trips
```

#### Route Ratings
```http
GET /routes/:id/ratings
```

### Trips Management

#### Get All Trips
```http
GET /trips
```
Query Parameters:
- `page` (number, default: 1) - Page number
- `limit` (number, default: 20) - Items per page
- `route_id` (number) - Filter by route
- `departure_date` (date) - Filter by departure date
- `from_lat`, `from_lng` - From coordinates
- `to_lat`, `to_lng` - To coordinates
- `radius` (number, default: 10) - Search radius in km
- `available_only` (boolean, default: true) - Only available trips

#### Search Trips
```http
GET /trips/search
```
Query Parameters:
- `from` (string, required) - From location
- `to` (string, required) - To location
- `date` (date) - Departure date
- `radius` (number, default: 10) - Search radius

#### Get User's Trips
```http
GET /trips/my-trips
```
Query Parameters:
- `role` (string) - 'driver' or 'passenger'
- `status` (string) - Filter by status

#### Get Specific Trip
```http
GET /trips/:id
```

#### Create New Trip (Driver Posts Trip)
```http
POST /trips
```
Body:
```json
{
  "route_id": 1,
  "departure_datetime": "2025-07-20T08:00:00Z",
  "available_seats": 3,
  "price_per_seat": 500.00,
  "vehicle_info": {
    "make": "Toyota",
    "model": "Corolla",
    "color": "White",
    "license_plate": "KCA 123X"
  },
  "notes": "AC available, no smoking",
  "pickup_locations": ["CBD", "Westlands"],
  "dropoff_locations": ["Airport Terminal 1", "Airport Terminal 2"]
}
```

#### Update Trip
```http
PUT /trips/:id
```
Body: Same as create trip (all fields optional)

#### Cancel Trip
```http
DELETE /trips/:id
```

#### Trip Requests Management
```http
GET /trips/:id/requests - Get trip requests (driver only)
POST /trips/:id/request - Request to join trip (passenger)
PUT /trips/:id/requests/:requestId - Approve/reject request (driver)
```

#### Passenger Trip Requests
```http
GET /trips/requests/my-requests - Get passenger's requests
DELETE /trips/requests/:requestId - Cancel request (passenger)
```

### Trip Request Example

#### Request to Join Trip (Passenger)
```http
POST /trips/:id/request
```
Body:
```json
{
  "passenger_count": 2,
  "pickup_location": "Westlands Round About",
  "pickup_latitude": -1.2630,
  "pickup_longitude": 36.8063,
  "dropoff_location": "Airport Terminal 1",
  "dropoff_latitude": -1.3192,
  "dropoff_longitude": 36.9275,
  "message": "Need pickup at exactly 8:15 AM"
}
```

#### Approve/Reject Request (Driver)
```http
PUT /trips/:id/requests/:requestId
```
Body:
```json
{
  "action": "approve",
  "message": "Approved! I'll pick you up at 8:15 AM sharp."
}
```

### Ratings Management

#### Rate a Route
```http
POST /ratings/routes/:routeId/rate
```
Body:
```json
{
  "rating": 5,
  "comment": "Excellent route, very efficient and safe!"
}
```

#### Get Route Ratings
```http
GET /ratings/routes/:routeId/ratings
```
Query Parameters:
- `page` (number, default: 1)
- `limit` (number, default: 20)

#### Get User's Rating for Route
```http
GET /ratings/routes/:routeId/my-rating
```

#### Delete User's Rating
```http
DELETE /ratings/routes/:routeId/my-rating
```

#### Get All Ratings by User
```http
GET /ratings/users/:userId/ratings
```

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

## Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

## Rate Limiting
No rate limiting is currently implemented, but it's recommended for production use.

## Testing the APIs

### 1. Register a User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testdriver",
    "email": "driver@test.com",
    "password": "password123",
    "first_name": "John",
    "last_name": "Driver"
  }'
```

### 2. Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "driver@test.com",
    "password": "password123"
  }'
```

### 3. Create a Route (use token from login)
```bash
curl -X POST http://localhost:3000/api/routes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "My Custom Route",
    "start_location": "Westlands",
    "end_location": "Airport",
    "is_public": true
  }'
```

### 4. Post a Trip
```bash
curl -X POST http://localhost:3000/api/trips \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "route_id": 1,
    "departure_datetime": "2025-07-20T08:00:00Z",
    "available_seats": 3,
    "price_per_seat": 500
  }'
```

## Database Schema
The API uses the following main tables:
- `users` - User accounts
- `roles` - User roles and permissions
- `routes` - Route definitions
- `stop_points` - Route waypoints
- `trips` - Driver trip postings
- `trip_requests` - Passenger booking requests
- `route_ratings` - Route ratings and reviews

## Next Steps
- Implement real-time notifications for trip requests
- Add payment integration
- Implement trip tracking and GPS updates
- Add chat functionality between drivers and passengers
- Implement advanced search filters
- Add trip history and analytics
