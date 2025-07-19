import React, { useState, useEffect } from 'react';
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

interface Route {
  id: number;
  name: string;
  start_location: string;
  end_location: string;
  distance_km: number;
  estimated_duration_minutes: number;
}

interface CreateTripProps {
  onTripCreated?: () => void;
  onCancel?: () => void;
}

const CreateTrip: React.FC<CreateTripProps> = ({ onTripCreated, onCancel }) => {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [formData, setFormData] = useState({
    route_id: '',
    departure_datetime: '',
    available_seats: 1,
    price_per_seat: '',
    notes: '',
    vehicle_make: '',
    vehicle_model: '',
    vehicle_color: '',
    vehicle_license_plate: '',
    pickup_locations: '',
    dropoff_locations: ''
  });

  const [loading, setLoading] = useState(false);
  const [loadingRoutes, setLoadingRoutes] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchRoutes();
  }, []);

  const fetchRoutes = async () => {
    try {
      setLoadingRoutes(true);
      const response = await api.get('/routes');
      setRoutes(response.data.routes || []);
    } catch (err: any) {
      console.error('Failed to fetch routes:', err);
      setError('Failed to load routes');
    } finally {
      setLoadingRoutes(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30); // Minimum 30 minutes from now
    return now.toISOString().slice(0, 16);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Validate required fields
      if (!formData.route_id || !formData.departure_datetime || !formData.available_seats) {
        throw new Error('Route, departure time, and available seats are required');
      }

      // Validate departure time is in the future
      const departureTime = new Date(formData.departure_datetime);
      const now = new Date();
      if (departureTime <= now) {
        throw new Error('Departure time must be in the future');
      }

      // Prepare trip data
      const tripData: any = {
        route_id: parseInt(formData.route_id),
        departure_datetime: formData.departure_datetime,
        available_seats: formData.available_seats,
        notes: formData.notes || undefined
      };

      // Add price if provided
      if (formData.price_per_seat) {
        tripData.price_per_seat = parseFloat(formData.price_per_seat);
      }

      // Add vehicle info if provided
      if (formData.vehicle_make || formData.vehicle_model || formData.vehicle_color || formData.vehicle_license_plate) {
        tripData.vehicle_info = {};
        if (formData.vehicle_make) tripData.vehicle_info.make = formData.vehicle_make;
        if (formData.vehicle_model) tripData.vehicle_info.model = formData.vehicle_model;
        if (formData.vehicle_color) tripData.vehicle_info.color = formData.vehicle_color;
        if (formData.vehicle_license_plate) tripData.vehicle_info.license_plate = formData.vehicle_license_plate;
      }

      // Add pickup/dropoff locations if provided
      if (formData.pickup_locations) {
        tripData.pickup_locations = formData.pickup_locations.split(',').map(loc => loc.trim()).filter(loc => loc);
      }
      if (formData.dropoff_locations) {
        tripData.dropoff_locations = formData.dropoff_locations.split(',').map(loc => loc.trim()).filter(loc => loc);
      }

      const response = await api.post('/trips', tripData);
      
      setSuccess('Trip posted successfully!');
      
      // Reset form
      setFormData({
        route_id: '',
        departure_datetime: '',
        available_seats: 1,
        price_per_seat: '',
        notes: '',
        vehicle_make: '',
        vehicle_model: '',
        vehicle_color: '',
        vehicle_license_plate: '',
        pickup_locations: '',
        dropoff_locations: ''
      });

      if (onTripCreated) {
        onTripCreated();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to create trip');
    } finally {
      setLoading(false);
    }
  };

  const selectedRoute = routes.find(route => route.id === parseInt(formData.route_id));

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Post a New Trip</h2>
          {onCancel && (
            <button
              onClick={onCancel}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Route Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Route *
            </label>
            {loadingRoutes ? (
              <div className="animate-pulse">
                <div className="h-10 bg-gray-200 rounded"></div>
              </div>
            ) : (
              <select
                name="route_id"
                value={formData.route_id}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Choose a route...</option>
                {routes.map(route => (
                  <option key={route.id} value={route.id}>
                    {route.name} ({route.start_location} → {route.end_location})
                  </option>
                ))}
              </select>
            )}
            {selectedRoute && (
              <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Distance:</span> {selectedRoute.distance_km} km | 
                  <span className="font-medium ml-2">Estimated Duration:</span> {selectedRoute.estimated_duration_minutes} min
                </div>
              </div>
            )}
          </div>

          {/* Trip Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Departure Date & Time *
              </label>
              <input
                type="datetime-local"
                name="departure_datetime"
                value={formData.departure_datetime}
                onChange={handleInputChange}
                min={getMinDateTime()}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Available Seats *
              </label>
              <input
                type="number"
                name="available_seats"
                value={formData.available_seats}
                onChange={handleInputChange}
                min="1"
                max="8"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Price per Seat (KSh)
            </label>
            <input
              type="number"
              name="price_per_seat"
              value={formData.price_per_seat}
              onChange={handleInputChange}
              min="0"
              step="50"
              placeholder="Leave empty for free ride"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Vehicle Information */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Vehicle Information (Optional)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Make
                </label>
                <input
                  type="text"
                  name="vehicle_make"
                  value={formData.vehicle_make}
                  onChange={handleInputChange}
                  placeholder="e.g., Toyota"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Model
                </label>
                <input
                  type="text"
                  name="vehicle_model"
                  value={formData.vehicle_model}
                  onChange={handleInputChange}
                  placeholder="e.g., Corolla"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color
                </label>
                <input
                  type="text"
                  name="vehicle_color"
                  value={formData.vehicle_color}
                  onChange={handleInputChange}
                  placeholder="e.g., White"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  License Plate
                </label>
                <input
                  type="text"
                  name="vehicle_license_plate"
                  value={formData.vehicle_license_plate}
                  onChange={handleInputChange}
                  placeholder="e.g., KCA 123X"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Pickup/Dropoff Locations */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Flexible Locations (Optional)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pickup Locations
                </label>
                <input
                  type="text"
                  name="pickup_locations"
                  value={formData.pickup_locations}
                  onChange={handleInputChange}
                  placeholder="e.g., CBD, Westlands, Karen (comma separated)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Additional pickup points along the route
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Drop-off Locations
                </label>
                <input
                  type="text"
                  name="dropoff_locations"
                  value={formData.dropoff_locations}
                  onChange={handleInputChange}
                  placeholder="e.g., Terminal 1, Terminal 2 (comma separated)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Additional drop-off points along the route
                </p>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={3}
              placeholder="Any additional information for passengers (e.g., 'AC available', 'No smoking', etc.)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={loading || loadingRoutes}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Posting...' : 'Post Trip'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTrip;
