# Routes & Chat Application

A web application featuring interactive maps with directions and real-time chat functionality.

## Features

- 🗺️ **Interactive Maps** - View maps, get directions, and find nearby places
- 💬 **Real-time Chat** - Live messaging with Socket.io
- 📍 **Location Sharing** - Share your location with other users
- 🛣️ **Route Planning** - Get turn-by-turn directions
- 👥 **User Authentication** - Secure login and registration
- 📱 **Responsive Design** - Works on desktop and mobile

## Tech Stack

### Backend
- **Node.js** with Express
- **Socket.io** for real-time communication
- **PostgreSQL** for database (recommended)
- **JWT** for authentication
- **OpenRouteService API** for mapping (free alternative to Google Maps)

### Frontend
- **React** with TypeScript
- **React Leaflet** for maps
- **Socket.io Client** for real-time features
- **Axios** for API calls

## Project Structure

```
routes-chat-app/
├── backend/
│   ├── src/
│   │   ├── routes/          # API routes
│   │   ├── controllers/     # Business logic
│   │   ├── middleware/      # Auth & validation
│   │   ├── models/         # Database models
│   │   └── server.js       # Main server file
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── services/      # API services
│   │   └── types/         # TypeScript types
│   └── package.json
└── package.json           # Root package.json
```

## Quick Start

### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install all workspace dependencies
npm run install:all
```

### 2. Environment Setup

Copy the environment template and fill in your values:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:
```env
PORT=5000
FRONTEND_URL=http://localhost:3000
JWT_SECRET=your-super-secret-jwt-key
DATABASE_URL=postgresql://username:password@localhost:5432/routes_chat_db
OPENROUTE_API_KEY=your-openroute-api-key
```

### 3. Get API Keys

**OpenRouteService (Recommended - Free):**
1. Sign up at https://openrouteservice.org/
2. Get your free API key
3. Add it to `OPENROUTE_API_KEY` in `.env`

**Alternative - Google Maps:**
1. Get API key from Google Cloud Console
2. Enable Maps JavaScript API and Directions API
3. Add to `GOOGLE_MAPS_API_KEY` in `.env`

### 4. Database Setup (Optional)

For production, set up PostgreSQL:

```bash
# Install PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# Create database
sudo -u postgres createdb routes_chat_db

# Create user and grant permissions
sudo -u postgres psql
```

```sql
CREATE USER your_username WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE routes_chat_db TO your_username;
```

**Note:** The current implementation uses in-memory storage for development. Database integration is marked with TODOs.

### 5. Run the Application

```bash
# Run both frontend and backend
npm run dev

# Or run separately:
npm run dev:backend  # Backend on http://localhost:5000
npm run dev:frontend # Frontend on http://localhost:3000
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile

### Routes & Mapping
- `POST /api/routes/directions` - Get directions between points
- `POST /api/routes/geocode` - Convert address to coordinates
- `POST /api/routes/reverse-geocode` - Convert coordinates to address
- `POST /api/routes/nearby` - Find nearby places

### Chat
- `GET /api/chat/rooms` - Get available chat rooms
- `GET /api/chat/history/:roomId` - Get chat history
- `POST /api/chat/rooms` - Create new chat room
- `POST /api/chat/rooms/:roomId/join` - Join chat room

### WebSocket Events
- `join_room` - Join a chat room
- `send_message` - Send chat message
- `receive_message` - Receive chat message
- `share_location` - Share user location
- `location_update` - Receive location updates

## Development

### Available Scripts

```bash
# Root level
npm run dev              # Run both frontend and backend
npm run install:all      # Install all dependencies
npm run build           # Build frontend for production
npm run start           # Start production server

# Backend
npm run dev:backend     # Start backend in development mode
npm run start          # Start backend in production mode

# Frontend
npm run dev:frontend   # Start frontend development server
npm run build         # Build for production
```

### Key Components

- **Authentication Flow** - JWT-based auth with React context
- **Real-time Chat** - Socket.io rooms and message handling
- **Map Integration** - Leaflet maps with route display
- **API Services** - Axios-based API client with interceptors

## Deployment

### Backend
- Deploy to Railway, Heroku, or DigitalOcean
- Set environment variables
- Connect to PostgreSQL database

### Frontend
- Deploy to Vercel, Netlify, or AWS S3
- Set `REACT_APP_BACKEND_URL` environment variable

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Next Steps

- [ ] Implement PostgreSQL database models
- [ ] Add user profiles and avatars
- [ ] Implement private messaging
- [ ] Add push notifications
- [ ] Mobile app with React Native
- [ ] Advanced route optimization
- [ ] Integration with public transit APIs

