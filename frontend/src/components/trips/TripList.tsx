import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

interface Trip {
  id: number;
  route_id: number;
  route_name: string;
  route_start_location: string;
  route_end_location: string;
  driver_id: number;
  driver_name: string;
  departure_datetime: string;
  available_seats: number;
  price_per_seat?: number;
  vehicle_info?: {
    make?: string;
    model?: string;
    color?: string;
    license_plate?: string;
  };
  notes?: string;
  status: 'active' | 'cancelled' | 'completed';
  pickup_locations?: string[];
  dropoff_locations?: string[];
}

interface TripFilters {
  from?: string;
  to?: string;
  date?: string;
  available_only: boolean;
  price_range?: {
    min?: number;
    max?: number;
  };
}

const TripList: React.FC = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<TripFilters>({
    available_only: true
  });
  const [showMyTrips, setShowMyTrips] = useState(false);
  const [tripRole, setTripRole] = useState<'driver' | 'passenger'>('passenger');
  const { user } = useAuth();

  useEffect(() => {
    fetchTrips();
  }, [showMyTrips, tripRole, filters.available_only]);

  const fetchTrips = async () => {
    try {
      setLoading(true);
      let url = '/trips';
      const params = new URLSearchParams();

      if (showMyTrips) {
        url = '/trips/my-trips';
        params.append('role', tripRole);
      } else {
        if (filters.available_only) {
          params.append('available_only', 'true');
        }
      }

      const response = await api.get(`${url}?${params}`);
      setTrips(response.data.trips || []);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch trips');
    } finally {
      setLoading(false);
    }
  };

  const searchTrips = async () => {
    if (!filters.from || !filters.to) {
      setError('Both from and to locations are required for search');
      return;
    }

    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('from', filters.from);
      params.append('to', filters.to);
      if (filters.date) params.append('date', filters.date);

      const response = await api.get(`/trips/search?${params}`);
      setTrips(response.data.trips || []);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to search trips');
    } finally {
      setLoading(false);
    }
  };

  const requestTrip = async (tripId: number) => {
    try {
      const passengerCount = 1; // Default to 1, could be made configurable
      const response = await api.post(`/trips/${tripId}/request`, {
        passenger_count: passengerCount,
        message: 'I would like to join this trip.'
      });

      alert('Trip request sent successfully!');
      fetchTrips(); // Refresh the list
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to request trip');
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatPrice = (price?: number) => {
    if (!price) return 'Free';
    return `KSh ${price.toFixed(0)}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-600';
      case 'cancelled': return 'bg-red-100 text-red-600';
      case 'completed': return 'bg-gray-100 text-gray-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const canRequestTrip = (trip: Trip) => {
    return trip.driver_id !== parseInt(user?.id || '0') && 
           trip.status === 'active' && 
           trip.available_seats > 0 &&
           new Date(trip.departure_datetime) > new Date();
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
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Available Trips</h1>
        
        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-md mb-6">
          <div className="flex flex-wrap gap-4 mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={showMyTrips}
                onChange={(e) => setShowMyTrips(e.target.checked)}
                className="mr-2"
              />
              My Trips
            </label>
            
            {showMyTrips && (
              <select
                value={tripRole}
                onChange={(e) => setTripRole(e.target.value as 'driver' | 'passenger')}
                className="px-3 py-1 border border-gray-300 rounded"
              >
                <option value="driver">As Driver</option>
                <option value="passenger">As Passenger</option>
              </select>
            )}

            {!showMyTrips && (
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.available_only}
                  onChange={(e) => setFilters(prev => ({ ...prev, available_only: e.target.checked }))}
                  className="mr-2"
                />
                Available Only
              </label>
            )}
          </div>

          {/* Search Form */}
          {!showMyTrips && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <input
                type="text"
                placeholder="From location"
                value={filters.from || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, from: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="text"
                placeholder="To location"
                value={filters.to || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, to: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="date"
                value={filters.date || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, date: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={searchTrips}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Search
              </button>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {trips.length === 0 && !loading ? (
        <div className="text-center py-8">
          <p className="text-gray-500 text-lg">No trips found</p>
          {showMyTrips && tripRole === 'driver' && (
            <p className="text-gray-400 mt-2">Post your first trip to start offering rides!</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {trips.map((trip) => (
            <div key={trip.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {trip.route_name || `${trip.route_start_location} → ${trip.route_end_location}`}
                  </h3>
                  <div className="flex items-center text-sm text-gray-600 mb-2">
                    <svg className="w-4 h-4 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Driver: {trip.driver_name}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <svg className="w-4 h-4 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Departure: {formatDateTime(trip.departure_datetime)}
                  </div>
                </div>
                
                <div className="flex flex-col items-end space-y-2">
                  <span className={`px-3 py-1 text-xs rounded-full ${getStatusColor(trip.status)}`}>
                    {trip.status.charAt(0).toUpperCase() + trip.status.slice(1)}
                  </span>
                  <span className="text-lg font-bold text-green-600">
                    {formatPrice(trip.price_per_seat)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="flex items-center text-sm">
                  <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  From: {trip.route_start_location}
                </div>
                <div className="flex items-center text-sm">
                  <svg className="w-4 h-4 mr-2 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  To: {trip.route_end_location}
                </div>
                <div className="flex items-center text-sm">
                  <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Available Seats: {trip.available_seats}
                </div>
              </div>

              {/* Vehicle Info */}
              {trip.vehicle_info && (
                <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Vehicle Information</h4>
                  <div className="text-sm text-gray-600">
                    {trip.vehicle_info.make} {trip.vehicle_info.model}
                    {trip.vehicle_info.color && ` - ${trip.vehicle_info.color}`}
                    {trip.vehicle_info.license_plate && ` (${trip.vehicle_info.license_plate})`}
                  </div>
                </div>
              )}

              {/* Pickup/Dropoff Locations */}
              {(trip.pickup_locations || trip.dropoff_locations) && (
                <div className="mb-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {trip.pickup_locations && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-1">Pickup Locations</h4>
                      <div className="text-sm text-gray-600">
                        {trip.pickup_locations.join(', ')}
                      </div>
                    </div>
                  )}
                  {trip.dropoff_locations && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-1">Drop-off Locations</h4>
                      <div className="text-sm text-gray-600">
                        {trip.dropoff_locations.join(', ')}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              {trip.notes && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Driver Notes</h4>
                  <p className="text-sm text-gray-600">{trip.notes}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                <div className="flex space-x-2">
                  <button className="px-4 py-2 text-blue-600 hover:text-blue-800 text-sm font-medium">
                    View Details
                  </button>
                  <button className="px-4 py-2 text-blue-600 hover:text-blue-800 text-sm font-medium">
                    View Route
                  </button>
                </div>
                
                {canRequestTrip(trip) && (
                  <button
                    onClick={() => requestTrip(trip.id)}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Request to Join
                  </button>
                )}

                {trip.driver_id === parseInt(user?.id || '0') && (
                  <div className="flex space-x-2">
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                      Manage Requests
                    </button>
                    <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm">
                      Edit Trip
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TripList;
