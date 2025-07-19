import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

interface Route {
  id: number;
  name: string;
  description: string;
  start_location: string;
  end_location: string;
  distance_km: number;
  estimated_duration_minutes: number;
  route_type: 'default' | 'custom';
  created_by: number;
  is_public: boolean;
  stop_points?: StopPoint[];
  average_rating?: number;
  total_ratings?: number;
}

interface StopPoint {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  stop_order: number;
  is_pickup_point: boolean;
  is_dropoff_point: boolean;
}

const RouteList: React.FC = () => {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [includeStops, setIncludeStops] = useState(false);
  const [showMyRoutes, setShowMyRoutes] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    fetchRoutes();
  }, [showMyRoutes, includeStops]);

  const fetchRoutes = async () => {
    try {
      setLoading(true);
      const endpoint = showMyRoutes ? '/routes/my-routes' : '/routes';
      const params = new URLSearchParams();
      if (includeStops) params.append('include_stops', 'true');
      
      const response = await api.get(`${endpoint}?${params}`);
      setRoutes(response.data.routes || []);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch routes');
    } finally {
      setLoading(false);
    }
  };

  const searchRoutes = async () => {
    if (!searchTerm.trim()) {
      fetchRoutes();
      return;
    }

    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('q', searchTerm);
      if (includeStops) params.append('include_stops', 'true');

      const response = await api.get(`/routes/search?${params}`);
      setRoutes(response.data.routes || []);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to search routes');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      searchRoutes();
    }
  };

  const renderStopPoints = (stopPoints: StopPoint[]) => {
    if (!stopPoints || stopPoints.length === 0) return null;

    return (
      <div className="mt-3">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Stop Points:</h4>
        <div className="space-y-1">
          {stopPoints.map((stop) => (
            <div key={stop.id} className="flex items-center text-sm text-gray-600">
              <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs mr-2">
                {stop.stop_order}
              </span>
              <span>{stop.name}</span>
              {(stop.is_pickup_point || stop.is_dropoff_point) && (
                <span className="ml-2 text-xs">
                  {stop.is_pickup_point && (
                    <span className="bg-green-100 text-green-600 px-1 rounded">Pickup</span>
                  )}
                  {stop.is_dropoff_point && (
                    <span className="bg-red-100 text-red-600 px-1 rounded ml-1">Drop</span>
                  )}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderRating = (route: Route) => {
    if (!route.average_rating) return null;

    return (
      <div className="flex items-center mt-2">
        <div className="flex items-center">
          {[1, 2, 3, 4, 5].map((star) => (
            <svg
              key={star}
              className={`w-4 h-4 ${
                star <= (route.average_rating || 0) ? 'text-yellow-400' : 'text-gray-300'
              }`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
        </div>
        <span className="ml-2 text-sm text-gray-600">
          {route.average_rating?.toFixed(1)} ({route.total_ratings} reviews)
        </span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Routes</h1>
        
        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search routes by location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={handleSearchKeyPress}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={searchRoutes}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Search
          </button>
        </div>

        {/* Filter Options */}
        <div className="flex flex-wrap gap-4 mb-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={showMyRoutes}
              onChange={(e) => setShowMyRoutes(e.target.checked)}
              className="mr-2"
            />
            My Routes Only
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={includeStops}
              onChange={(e) => setIncludeStops(e.target.checked)}
              className="mr-2"
            />
            Show Stop Points
          </label>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {routes.length === 0 && !loading ? (
        <div className="text-center py-8">
          <p className="text-gray-500 text-lg">No routes found</p>
          {showMyRoutes && (
            <p className="text-gray-400 mt-2">Create your first custom route to get started!</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {routes.map((route) => (
            <div key={route.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-xl font-semibold text-gray-900">{route.name}</h3>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  route.route_type === 'default' 
                    ? 'bg-blue-100 text-blue-600' 
                    : 'bg-green-100 text-green-600'
                }`}>
                  {route.route_type}
                </span>
              </div>

              {route.description && (
                <p className="text-gray-600 mb-3">{route.description}</p>
              )}

              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-700">
                  <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  From: {route.start_location}
                </div>
                <div className="flex items-center text-sm text-gray-700">
                  <svg className="w-4 h-4 mr-2 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  To: {route.end_location}
                </div>
              </div>

              <div className="flex justify-between items-center text-sm text-gray-600 mb-3">
                <span>{route.distance_km} km</span>
                <span>{route.estimated_duration_minutes} min</span>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  route.is_public 
                    ? 'bg-green-100 text-green-600' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {route.is_public ? 'Public' : 'Private'}
                </span>
              </div>

              {renderRating(route)}
              {renderStopPoints(route.stop_points || [])}

              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex gap-2">
                  <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                    View Details
                  </button>
                  <button className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm">
                    Find Trips
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RouteList;
