import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

function HomePage() {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <div>
      <nav className="navbar">
        <div className="navbar-brand">Routes & Chat</div>
        <ul className="navbar-nav">
          {isAuthenticated ? (
            <>
              <li><span className="nav-link">Welcome, {user?.username}!</span></li>
              <li><Link to="/map" className="nav-link">Map</Link></li>
              <li><Link to="/chat" className="nav-link">Chat</Link></li>
              <li><button onClick={logout} className="nav-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>Logout</button></li>
            </>
          ) : (
            <>
              <li><Link to="/login" className="nav-link">Login</Link></li>
              <li><Link to="/register" className="nav-link">Register</Link></li>
            </>
          )}
        </ul>
      </nav>

      <main className="main-content">
        <div className="container">
          <h1>Welcome to Routes & Chat</h1>
          <p>Your all-in-one application for navigation and real-time communication.</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginTop: '3rem' }}>
            <div style={{ padding: '2rem', border: '1px solid #dee2e6', borderRadius: '8px', textAlign: 'center' }}>
              <h3>🗺️ Interactive Maps</h3>
              <p>Get directions, find routes, and explore locations with our interactive map interface.</p>
              {isAuthenticated ? (
                <Link to="/map" className="btn btn-primary">Open Map</Link>
              ) : (
                <p><Link to="/login">Login</Link> to access maps</p>
              )}
            </div>

            <div style={{ padding: '2rem', border: '1px solid #dee2e6', borderRadius: '8px', textAlign: 'center' }}>
              <h3>💬 Live Chat</h3>
              <p>Connect with other users in real-time. Share locations and get route recommendations.</p>
              {isAuthenticated ? (
                <Link to="/chat" className="btn btn-primary">Join Chat</Link>
              ) : (
                <p><Link to="/login">Login</Link> to start chatting</p>
              )}
            </div>

            <div style={{ padding: '2rem', border: '1px solid #dee2e6', borderRadius: '8px', textAlign: 'center' }}>
              <h3>🛣️ Route Planning</h3>
              <p>Plan your journeys with detailed turn-by-turn directions and multiple transportation modes.</p>
              {isAuthenticated ? (
                <Link to="/map" className="btn btn-primary">Plan Route</Link>
              ) : (
                <p><Link to="/login">Login</Link> to plan routes</p>
              )}
            </div>
          </div>

          {!isAuthenticated && (
            <div style={{ textAlign: 'center', marginTop: '3rem', padding: '2rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
              <h3>Get Started</h3>
              <p>Create an account to access all features of Routes & Chat.</p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <Link to="/register" className="btn btn-primary">Sign Up</Link>
                <Link to="/login" className="btn btn-secondary">Sign In</Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default HomePage;

