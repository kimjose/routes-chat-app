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

interface TripRequest {
  id: number;
  trip_id: number;
  passenger_id: number;
  passenger_name: string;
  passenger_count: number;
  pickup_location?: string;
  pickup_latitude?: number;
  pickup_longitude?: number;
  dropoff_location?: string;
  dropoff_latitude?: number;
  dropoff_longitude?: number;
  message?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  driver_response?: string;
  created_at: string;
}

interface Trip {
  id: number;
  route_name: string;
  departure_datetime: string;
  available_seats: number;
  price_per_seat?: number;
}

interface TripRequestManagerProps {
  tripId: number;
  onClose?: () => void;
}

const TripRequestManager: React.FC<TripRequestManagerProps> = ({ tripId, onClose }) => {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [requests, setRequests] = useState<TripRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<{ [key: number]: boolean }>({});

  useEffect(() => {
    fetchTripAndRequests();
  }, [tripId]);

  const fetchTripAndRequests = async () => {
    try {
      setLoading(true);
      
      // Fetch trip details and requests in parallel
      const [tripResponse, requestsResponse] = await Promise.all([
        api.get(`/trips/${tripId}`),
        api.get(`/trips/${tripId}/requests`)
      ]);

      setTrip(tripResponse.data.trip);
      setRequests(requestsResponse.data.requests || []);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch trip requests');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAction = async (requestId: number, action: 'approve' | 'reject', message?: string) => {
    try {
      setActionLoading(prev => ({ ...prev, [requestId]: true }));

      await api.put(`/trips/${tripId}/requests/${requestId}`, {
        action,
        message: message || ''
      });

      // Refresh the requests
      await fetchTripAndRequests();
      
      // Show success message
      const actionText = action === 'approve' ? 'approved' : 'rejected';
      alert(`Request ${actionText} successfully!`);
    } catch (err: any) {
      alert(err.response?.data?.error || `Failed to ${action} request`);
    } finally {
      setActionLoading(prev => ({ ...prev, [requestId]: false }));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-600';
      case 'approved': return 'bg-green-100 text-green-600';
      case 'rejected': return 'bg-red-100 text-red-600';
      case 'cancelled': return 'bg-gray-100 text-gray-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getTotalApprovedPassengers = () => {
    return requests
      .filter(req => req.status === 'approved')
      .reduce((total, req) => total + req.passenger_count, 0);
  };

  const getRemainingSeats = () => {
    if (!trip) return 0;
    return trip.available_seats - getTotalApprovedPassengers();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        Trip not found
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Manage Trip Requests</h2>
          {onClose && (
            <button
              onClick={onClose}
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

        {/* Trip Summary */}
        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{trip.route_name}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
            <div>
              <span className="font-medium">Departure:</span> {formatDateTime(trip.departure_datetime)}
            </div>
            <div>
              <span className="font-medium">Total Seats:</span> {trip.available_seats}
            </div>
            <div>
              <span className="font-medium">Remaining:</span> {getRemainingSeats()}
            </div>
          </div>
          {trip.price_per_seat && (
            <div className="mt-2 text-sm text-gray-600">
              <span className="font-medium">Price per Seat:</span> KSh {trip.price_per_seat}
            </div>
          )}
        </div>

        {/* Requests List */}
        {requests.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 text-lg">No requests yet</p>
            <p className="text-gray-400 mt-2">Passengers will be able to request to join your trip once it's posted.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Trip Requests ({requests.length})
            </h3>
            
            {requests.map((request) => (
              <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h4 className="text-lg font-medium text-gray-900">
                      {request.passenger_name}
                    </h4>
                    <div className="text-sm text-gray-600 mt-1">
                      Requested: {formatDateTime(request.created_at)}
                    </div>
                  </div>
                  <span className={`px-3 py-1 text-xs rounded-full ${getStatusColor(request.status)}`}>
                    {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                  <div>
                    <span className="font-medium text-sm text-gray-700">Passengers:</span>
                    <span className="ml-2 text-sm text-gray-600">{request.passenger_count}</span>
                  </div>
                  
                  {request.pickup_location && (
                    <div>
                      <span className="font-medium text-sm text-gray-700">Pickup:</span>
                      <span className="ml-2 text-sm text-gray-600">{request.pickup_location}</span>
                    </div>
                  )}
                  
                  {request.dropoff_location && (
                    <div>
                      <span className="font-medium text-sm text-gray-700">Drop-off:</span>
                      <span className="ml-2 text-sm text-gray-600">{request.dropoff_location}</span>
                    </div>
                  )}
                </div>

                {request.message && (
                  <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium text-sm text-gray-700">Message from passenger:</span>
                    <p className="text-sm text-gray-600 mt-1">{request.message}</p>
                  </div>
                )}

                {request.driver_response && (
                  <div className="mb-3 p-3 bg-blue-50 rounded-lg">
                    <span className="font-medium text-sm text-gray-700">Your response:</span>
                    <p className="text-sm text-gray-600 mt-1">{request.driver_response}</p>
                  </div>
                )}

                {/* Action Buttons for Pending Requests */}
                {request.status === 'pending' && (
                  <div className="flex flex-col sm:flex-row gap-3 mt-4">
                    <ApprovalDialog
                      requestId={request.id}
                      passengerName={request.passenger_name}
                      passengerCount={request.passenger_count}
                      remainingSeats={getRemainingSeats()}
                      onApprove={(message) => handleRequestAction(request.id, 'approve', message)}
                      onReject={(message) => handleRequestAction(request.id, 'reject', message)}
                      loading={actionLoading[request.id]}
                    />
                  </div>
                )}

                {/* Info for insufficient seats */}
                {request.status === 'pending' && request.passenger_count > getRemainingSeats() && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-700">
                      ⚠️ Not enough seats available. This request needs {request.passenger_count} seats but only {getRemainingSeats()} remain.
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Approval Dialog Component
interface ApprovalDialogProps {
  requestId: number;
  passengerName: string;
  passengerCount: number;
  remainingSeats: number;
  onApprove: (message: string) => void;
  onReject: (message: string) => void;
  loading?: boolean;
}

const ApprovalDialog: React.FC<ApprovalDialogProps> = ({
  requestId,
  passengerName,
  passengerCount,
  remainingSeats,
  onApprove,
  onReject,
  loading
}) => {
  const [showDialog, setShowDialog] = useState(false);
  const [action, setAction] = useState<'approve' | 'reject'>('approve');
  const [message, setMessage] = useState('');

  const handleSubmit = () => {
    if (action === 'approve') {
      onApprove(message);
    } else {
      onReject(message);
    }
    setShowDialog(false);
    setMessage('');
  };

  const canApprove = passengerCount <= remainingSeats;

  return (
    <>
      <div className="flex gap-2">
        <button
          onClick={() => {
            setAction('approve');
            setShowDialog(true);
          }}
          disabled={!canApprove || loading}
          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Processing...' : 'Approve'}
        </button>
        <button
          onClick={() => {
            setAction('reject');
            setShowDialog(true);
          }}
          disabled={loading}
          className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Processing...' : 'Reject'}
        </button>
      </div>

      {showDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {action === 'approve' ? 'Approve' : 'Reject'} Request
            </h3>
            
            <p className="text-gray-600 mb-4">
              {action === 'approve' 
                ? `Approve ${passengerName}'s request for ${passengerCount} seat(s)?`
                : `Reject ${passengerName}'s request?`
              }
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message to passenger (optional):
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                placeholder={action === 'approve' 
                  ? "e.g., 'Approved! I'll pick you up at the specified location.'"
                  : "e.g., 'Sorry, the trip is full. Try another trip.'"
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDialog(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors ${
                  action === 'approve' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {action === 'approve' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TripRequestManager;
