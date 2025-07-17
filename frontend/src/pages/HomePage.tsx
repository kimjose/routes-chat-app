import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

function HomePage() {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <div>
      <nav className="navbar">
        <div className="navbar-brand">
          <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>🚗 RouteShare</span>
        </div>
        <ul className="navbar-nav">
          {isAuthenticated ? (
            <>
              <li><span className="nav-link">Welcome, {user?.username}!</span></li>
              <li><Link to="/map" className="nav-link">🗺️ Routes</Link></li>
              <li><Link to="/chat" className="nav-link">💬 Chat</Link></li>
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
        {/* Hero Section */}
        <div style={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '4rem 0',
          textAlign: 'center'
        }}>
          <div className="container">
            <h1 style={{ fontSize: '3rem', marginBottom: '1rem', fontWeight: 'bold' }}>
              Share Your Route, Share Your Costs
            </h1>
            <p style={{ fontSize: '1.2rem', marginBottom: '2rem', maxWidth: '600px', margin: '0 auto' }}>
              Connect with fellow commuters traveling the same route. Save money, reduce traffic, and help the environment.
            </p>
            <div style={{ 
              display: 'flex', 
              gap: '1rem', 
              justifyContent: 'center', 
              flexWrap: 'wrap',
              marginTop: '2rem'
            }}>
              {isAuthenticated ? (
                <>
                  <Link to="/map" className="btn btn-primary" style={{ 
                    backgroundColor: '#fff', 
                    color: '#667eea',
                    padding: '1rem 2rem',
                    fontSize: '1.1rem',
                    fontWeight: 'bold'
                  }}>
                    🚗 Post a Trip
                  </Link>
                  <Link to="/chat" className="btn btn-secondary" style={{ 
                    backgroundColor: 'rgba(255,255,255,0.2)', 
                    color: '#fff',
                    padding: '1rem 2rem',
                    fontSize: '1.1rem',
                    border: '2px solid rgba(255,255,255,0.3)'
                  }}>
                    🔍 Find a Ride
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/register" className="btn btn-primary" style={{ 
                    backgroundColor: '#fff', 
                    color: '#667eea',
                    padding: '1rem 2rem',
                    fontSize: '1.1rem',
                    fontWeight: 'bold'
                  }}>
                    Get Started
                  </Link>
                  <Link to="/login" className="btn btn-secondary" style={{ 
                    backgroundColor: 'rgba(255,255,255,0.2)', 
                    color: '#fff',
                    padding: '1rem 2rem',
                    fontSize: '1.1rem',
                    border: '2px solid rgba(255,255,255,0.3)'
                  }}>
                    Sign In
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>

        {/* How It Works Section */}
        <div style={{ padding: '4rem 0', backgroundColor: '#f8f9fa' }}>
          <div className="container">
            <h2 style={{ textAlign: 'center', marginBottom: '3rem', fontSize: '2.5rem', color: '#333' }}>
              How It Works
            </h2>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
              gap: '2rem',
              marginBottom: '3rem'
            }}>
              <div style={{ 
                textAlign: 'center', 
                padding: '2rem',
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
              }}>
                <div style={{ 
                  width: '80px', 
                  height: '80px', 
                  backgroundColor: '#667eea',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.5rem auto',
                  fontSize: '2rem'
                }}>
                  🚗
                </div>
                <h3 style={{ marginBottom: '1rem', color: '#333' }}>Post Your Trip</h3>
                <p style={{ color: '#666' }}>
                  Drivers post their route, departure time, and available seats. 
                  Set your own price and preferences.
                </p>
              </div>

              <div style={{ 
                textAlign: 'center', 
                padding: '2rem',
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
              }}>
                <div style={{ 
                  width: '80px', 
                  height: '80px', 
                  backgroundColor: '#764ba2',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.5rem auto',
                  fontSize: '2rem'
                }}>
                  🔍
                </div>
                <h3 style={{ marginBottom: '1rem', color: '#333' }}>Find & Request</h3>
                <p style={{ color: '#666' }}>
                  Passengers browse available trips on their route and send 
                  requests to join rides that match their needs.
                </p>
              </div>

              <div style={{ 
                textAlign: 'center', 
                padding: '2rem',
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
              }}>
                <div style={{ 
                  width: '80px', 
                  height: '80px', 
                  backgroundColor: '#28a745',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.5rem auto',
                  fontSize: '2rem'
                }}>
                  🤝
                </div>
                <h3 style={{ marginBottom: '1rem', color: '#333' }}>Connect & Go</h3>
                <p style={{ color: '#666' }}>
                  Drivers approve requests, passengers get connected, and 
                  everyone saves money while reducing traffic.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div style={{ padding: '4rem 0' }}>
          <div className="container">
            <h2 style={{ textAlign: 'center', marginBottom: '3rem', fontSize: '2.5rem', color: '#333' }}>
              Why Choose RouteShare?
            </h2>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
              gap: '2rem' 
            }}>
              <div style={{ 
                padding: '2rem', 
                border: '1px solid #dee2e6', 
                borderRadius: '12px', 
                textAlign: 'center',
                transition: 'transform 0.3s ease, box-shadow 0.3s ease'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💰</div>
                <h3 style={{ color: '#333', marginBottom: '1rem' }}>Save Money</h3>
                <p style={{ color: '#666' }}>
                  Split fuel costs with fellow travelers. Drivers earn back their 
                  expenses while passengers pay less than public transport.
                </p>
              </div>

              <div style={{ 
                padding: '2rem', 
                border: '1px solid #dee2e6', 
                borderRadius: '12px', 
                textAlign: 'center',
                transition: 'transform 0.3s ease, box-shadow 0.3s ease'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🌍</div>
                <h3 style={{ color: '#333', marginBottom: '1rem' }}>Help Environment</h3>
                <p style={{ color: '#666' }}>
                  Reduce carbon footprint by sharing rides. Fewer cars on the road 
                  means less pollution and cleaner air.
                </p>
              </div>

              <div style={{ 
                padding: '2rem', 
                border: '1px solid #dee2e6', 
                borderRadius: '12px', 
                textAlign: 'center',
                transition: 'transform 0.3s ease, box-shadow 0.3s ease'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚦</div>
                <h3 style={{ color: '#333', marginBottom: '1rem' }}>Reduce Traffic</h3>
                <p style={{ color: '#666' }}>
                  Less congestion means faster commutes for everyone. Help make 
                  your city's traffic flow better.
                </p>
              </div>

              <div style={{ 
                padding: '2rem', 
                border: '1px solid #dee2e6', 
                borderRadius: '12px', 
                textAlign: 'center',
                transition: 'transform 0.3s ease, box-shadow 0.3s ease'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💬</div>
                <h3 style={{ color: '#333', marginBottom: '1rem' }}>Stay Connected</h3>
                <p style={{ color: '#666' }}>
                  Built-in chat system to coordinate with your travel companions. 
                  Share updates and build community.
                </p>
                {isAuthenticated ? (
                  <Link to="/chat" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                    Start Chatting
                  </Link>
                ) : (
                  <p style={{ marginTop: '1rem' }}>
                    <Link to="/login">Login</Link> to start chatting
                  </p>
                )}
              </div>

              <div style={{ 
                padding: '2rem', 
                border: '1px solid #dee2e6', 
                borderRadius: '12px', 
                textAlign: 'center',
                transition: 'transform 0.3s ease, box-shadow 0.3s ease'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🗺️</div>
                <h3 style={{ color: '#333', marginBottom: '1rem' }}>Smart Routes</h3>
                <p style={{ color: '#666' }}>
                  Interactive maps help you plan optimal routes and find the best 
                  pickup/drop-off points.
                </p>
                {isAuthenticated ? (
                  <Link to="/map" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                    Explore Maps
                  </Link>
                ) : (
                  <p style={{ marginTop: '1rem' }}>
                    <Link to="/login">Login</Link> to access maps
                  </p>
                )}
              </div>

              <div style={{ 
                padding: '2rem', 
                border: '1px solid #dee2e6', 
                borderRadius: '12px', 
                textAlign: 'center',
                transition: 'transform 0.3s ease, box-shadow 0.3s ease'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛡️</div>
                <h3 style={{ color: '#333', marginBottom: '1rem' }}>Safe & Secure</h3>
                <p style={{ color: '#666' }}>
                  Verified users, ratings system, and secure payment processing. 
                  Your safety is our priority.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        {!isAuthenticated && (
          <div style={{ 
            backgroundColor: '#667eea',
            color: 'white',
            padding: '4rem 0',
            textAlign: 'center'
          }}>
            <div className="container">
              <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>
                Ready to Start Sharing?
              </h2>
              <p style={{ fontSize: '1.2rem', marginBottom: '2rem', maxWidth: '600px', margin: '0 auto 2rem auto' }}>
                Join thousands of commuters who are already saving money and helping the environment. 
                Your next ride is just a click away.
              </p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link to="/register" className="btn btn-primary" style={{ 
                  backgroundColor: '#fff', 
                  color: '#667eea',
                  padding: '1rem 2rem',
                  fontSize: '1.1rem',
                  fontWeight: 'bold'
                }}>
                  Sign Up Now
                </Link>
                <Link to="/login" className="btn btn-secondary" style={{ 
                  backgroundColor: 'rgba(255,255,255,0.2)', 
                  color: '#fff',
                  padding: '1rem 2rem',
                  fontSize: '1.1rem',
                  border: '2px solid rgba(255,255,255,0.3)'
                }}>
                  Already have an account?
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Stats Section */}
        <div style={{ padding: '3rem 0', backgroundColor: '#f8f9fa' }}>
          <div className="container">
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '2rem',
              textAlign: 'center'
            }}>
              <div>
                <h3 style={{ fontSize: '2.5rem', color: '#28a745', marginBottom: '0.5rem' }}>$500+</h3>
                <p style={{ color: '#666' }}>Average Annual Savings</p>
              </div>
              <div>
                <h3 style={{ fontSize: '2.5rem', color: '#28a745', marginBottom: '0.5rem' }}>50%</h3>
                <p style={{ color: '#666' }}>Reduction in CO2 Emissions</p>
              </div>
              <div>
                <h3 style={{ fontSize: '2.5rem', color: '#28a745', marginBottom: '0.5rem' }}>1000+</h3>
                <p style={{ color: '#666' }}>Daily Successful Rides</p>
              </div>
              <div>
                <h3 style={{ fontSize: '2.5rem', color: '#28a745', marginBottom: '0.5rem' }}>4.8★</h3>
                <p style={{ color: '#666' }}>Average User Rating</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default HomePage;

