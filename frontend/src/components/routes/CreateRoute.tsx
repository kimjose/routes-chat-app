import React, { useState } from 'react';
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

interface StopPoint {
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  is_pickup_point: boolean;
  is_dropoff_point: boolean;
  estimated_arrival_time?: string;
}

interface CreateRouteProps {
  onRouteCreated?: () => void;
  onCancel?: () => void;
}

const CreateRoute: React.FC<CreateRouteProps> = ({ onRouteCreated, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_location: '',
    end_location: '',
    start_latitude: '',
    start_longitude: '',
    end_latitude: '',
    end_longitude: '',
    distance_km: '',
    estimated_duration_minutes: '',
    is_public: true
  });

  const [stopPoints, setStopPoints] = useState<StopPoint[]>([]);
  const [newStopPoint, setNewStopPoint] = useState<StopPoint>({
    name: '',
    latitude: 0,
    longitude: 0,
    address: '',
    is_pickup_point: true,
    is_dropoff_point: true
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleStopPointChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setNewStopPoint(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
              (name === 'latitude' || name === 'longitude') ? parseFloat(value) || 0 : value
    }));
  };

  const addStopPoint = () => {
    if (!newStopPoint.name || !newStopPoint.latitude || !newStopPoint.longitude) {
      setError('Stop point name, latitude, and longitude are required');
      return;
    }

    setStopPoints(prev => [...prev, { ...newStopPoint }]);
    setNewStopPoint({
      name: '',
      latitude: 0,
      longitude: 0,
      address: '',
      is_pickup_point: true,
      is_dropoff_point: true
    });
    setError(null);
  };

  const removeStopPoint = (index: number) => {
    setStopPoints(prev => prev.filter((_, i) => i !== index));
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setNewStopPoint(prev => ({
            ...prev,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          }));
        },
        (error) => {
          console.error('Error getting location:', error);
          setError('Could not get current location');
        }
      );
    } else {
      setError('Geolocation is not supported by this browser');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Validate required fields
      if (!formData.name || !formData.start_location || !formData.end_location) {
        throw new Error('Name, start location, and end location are required');
      }

      const routeData = {
        ...formData,
        start_latitude: formData.start_latitude ? parseFloat(formData.start_latitude) : undefined,
        start_longitude: formData.start_longitude ? parseFloat(formData.start_longitude) : undefined,
        end_latitude: formData.end_latitude ? parseFloat(formData.end_latitude) : undefined,
        end_longitude: formData.end_longitude ? parseFloat(formData.end_longitude) : undefined,
        distance_km: formData.distance_km ? parseFloat(formData.distance_km) : undefined,
        estimated_duration_minutes: formData.estimated_duration_minutes ? 
          parseInt(formData.estimated_duration_minutes) : undefined,
        stop_points: stopPoints
      };

      const response = await api.post('/routes', routeData);
      
      setSuccess('Route created successfully!');
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        start_location: '',
        end_location: '',
        start_latitude: '',
        start_longitude: '',
        end_latitude: '',
        end_longitude: '',
        distance_km: '',
        estimated_duration_minutes: '',
        is_public: true
      });
      setStopPoints([]);

      if (onRouteCreated) {
        onRouteCreated();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to create route');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Create New Route</h2>
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
          {/* Basic Route Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Route Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., CBD to Airport Express"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Visibility
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="is_public"
                  checked={formData.is_public}
                  onChange={handleInputChange}
                  className="mr-2"
                />
                Make this route public
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Brief description of this route..."
            />
          </div>

          {/* Location Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Location *
              </label>
              <input
                type="text"
                name="start_location"
                value={formData.start_location}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., CBD Nairobi"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Location *
              </label>
              <input
                type="text"
                name="end_location"
                value={formData.end_location}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., JKIA Airport"
              />
            </div>
          </div>

          {/* Coordinates */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Latitude
              </label>
              <input
                type="number"
                step="any"
                name="start_latitude"
                value={formData.start_latitude}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="-1.2864"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Longitude
              </label>
              <input
                type="number"
                step="any"
                name="start_longitude"
                value={formData.start_longitude}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="36.8172"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Latitude
              </label>
              <input
                type="number"
                step="any"
                name="end_latitude"
                value={formData.end_latitude}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="-1.3192"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Longitude
              </label>
              <input
                type="number"
                step="any"
                name="end_longitude"
                value={formData.end_longitude}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="36.9275"
              />
            </div>
          </div>

          {/* Route Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Distance (km)
              </label>
              <input
                type="number"
                step="0.1"
                name="distance_km"
                value={formData.distance_km}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="18.5"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estimated Duration (minutes)
              </label>
              <input
                type="number"
                name="estimated_duration_minutes"
                value={formData.estimated_duration_minutes}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="45"
              />
            </div>
          </div>

          {/* Stop Points Section */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Stop Points</h3>
            
            {/* Add Stop Point Form */}
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <h4 className="text-md font-medium text-gray-700 mb-3">Add Stop Point</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <input
                    type="text"
                    name="name"
                    value={newStopPoint.name}
                    onChange={handleStopPointChange}
                    placeholder="Stop point name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    step="any"
                    name="latitude"
                    value={newStopPoint.latitude || ''}
                    onChange={handleStopPointChange}
                    placeholder="Latitude"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    step="any"
                    name="longitude"
                    value={newStopPoint.longitude || ''}
                    onChange={handleStopPointChange}
                    placeholder="Longitude"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div className="mt-3 flex flex-wrap gap-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="is_pickup_point"
                    checked={newStopPoint.is_pickup_point}
                    onChange={handleStopPointChange}
                    className="mr-2"
                  />
                  Pickup Point
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="is_dropoff_point"
                    checked={newStopPoint.is_dropoff_point}
                    onChange={handleStopPointChange}
                    className="mr-2"
                  />
                  Drop-off Point
                </label>
                <button
                  type="button"
                  onClick={getCurrentLocation}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Use Current Location
                </button>
              </div>

              <div className="mt-3">
                <button
                  type="button"
                  onClick={addStopPoint}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Add Stop Point
                </button>
              </div>
            </div>

            {/* Stop Points List */}
            {stopPoints.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-md font-medium text-gray-700">Route Stop Points</h4>
                {stopPoints.map((stop, index) => (
                  <div key={index} className="flex items-center justify-between bg-white p-3 rounded-lg border">
                    <div className="flex-1">
                      <span className="font-medium">{stop.name}</span>
                      <span className="text-gray-500 ml-2">
                        ({stop.latitude.toFixed(4)}, {stop.longitude.toFixed(4)})
                      </span>
                      <div className="text-sm text-gray-600 mt-1">
                        {stop.is_pickup_point && (
                          <span className="bg-green-100 text-green-600 px-2 py-1 rounded-full text-xs mr-1">
                            Pickup
                          </span>
                        )}
                        {stop.is_dropoff_point && (
                          <span className="bg-red-100 text-red-600 px-2 py-1 rounded-full text-xs">
                            Drop-off
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeStopPoint(index)}
                      className="text-red-600 hover:text-red-800 ml-4"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
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
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Route'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateRoute;
