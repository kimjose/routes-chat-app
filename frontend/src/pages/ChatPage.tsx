import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

function ChatPage() {
  const { logout, user } = useAuth();

  return (
    <div>
      <nav className="navbar">
        <div className="navbar-brand">Routes & Chat</div>
        <ul className="navbar-nav">
          <li><Link to="/" className="nav-link">Home</Link></li>
          <li><Link to="/map" className="nav-link">Map</Link></li>
          <li><span className="nav-link">Welcome, {user?.username}!</span></li>
          <li><button onClick={logout} className="nav-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>Logout</button></li>
        </ul>
      </nav>

      <main className="main-content">
        <div className="container">
          <h1>Chat</h1>
          <p>Real-time chat functionality will be implemented here.</p>
          <p>This will include:</p>
          <ul>
            <li>Chat rooms list</li>
            <li>Real-time messaging with Socket.io</li>
            <li>Location sharing</li>
            <li>Message history</li>
          </ul>
        </div>
      </main>
    </div>
  );
}

export default ChatPage;

