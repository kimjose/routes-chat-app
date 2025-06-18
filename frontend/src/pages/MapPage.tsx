import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

function MapPage() {
  const { logout, user } = useAuth();

  return (
    <div>
      <nav className="navbar">
        <div className="navbar-brand">Routes & Chat</div>
        <ul className="navbar-nav">
          <li><Link to="/" className="nav-link">Home</Link></li>
          <li><Link to="/chat" className="nav-link">Chat</Link></li>
          <li><span className="nav-link">Welcome, {user?.username}!</span></li>
          <li><button onClick={logout} className="nav-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>Logout</button></li>
        </ul>
      </nav>

      <main className="main-content">
        <div className="container">
          <h1>Interactive Map</h1>
          <p>Map functionality will be implemented here.</p>
          <p>This will include:</p>
          <ul>
            <li>Interactive Leaflet map</li>
            <li>Route planning and directions</li>
            <li>Geocoding and reverse geocoding</li>
            <li>Location search</li>
            <li>Nearby places finder</li>
          </ul>
        </div>
      </main>
    </div>
  );
}

export default MapPage;

