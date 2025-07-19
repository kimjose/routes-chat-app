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

interface Rating {
  id: number;
  rating: number;
  comment: string;
  created_at: string;
  user: {
    username: string;
    name: string;
  };
}

interface RouteRatingProps {
  routeId: number;
  routeName: string;
  onClose?: () => void;
}

const RouteRating: React.FC<RouteRatingProps> = ({ routeId, routeName, onClose }) => {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [userRating, setUserRating] = useState<{ rating: number; comment: string } | null>(null);
  const [newRating, setNewRating] = useState({ rating: 5, comment: '' });
  const [averageRating, setAverageRating] = useState(0);
  const [totalRatings, setTotalRatings] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRatingForm, setShowRatingForm] = useState(false);

  useEffect(() => {
    fetchRatings();
    fetchUserRating();
  }, [routeId]);

  const fetchRatings = async () => {
    try {
      const response = await api.get(`/ratings/routes/${routeId}/ratings`);
      setRatings(response.data.ratings || []);
      setAverageRating(response.data.stats?.average_rating || 0);
      setTotalRatings(response.data.stats?.total_ratings || 0);
    } catch (err: any) {
      console.error('Failed to fetch ratings:', err);
      setError('Failed to load ratings');
    }
  };

  const fetchUserRating = async () => {
    try {
      const response = await api.get(`/ratings/routes/${routeId}/my-rating`);
      if (response.data.rating) {
        setUserRating({
          rating: response.data.rating.rating,
          comment: response.data.rating.comment || ''
        });
      }
    } catch (err: any) {
      // User hasn't rated yet, which is fine
      console.log('User has not rated this route yet');
    } finally {
      setLoading(false);
    }
  };

  const submitRating = async () => {
    try {
      setSubmitting(true);
      setError(null);

      await api.post(`/ratings/routes/${routeId}/rate`, {
        rating: newRating.rating,
        comment: newRating.comment
      });

      // Refresh data
      await Promise.all([fetchRatings(), fetchUserRating()]);
      
      setShowRatingForm(false);
      setNewRating({ rating: 5, comment: '' });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit rating');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteRating = async () => {
    if (!window.confirm('Are you sure you want to delete your rating?')) {
      return;
    }

    try {
      await api.delete(`/ratings/routes/${routeId}/my-rating`);
      
      // Refresh data
      await Promise.all([fetchRatings(), fetchUserRating()]);
      setUserRating(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete rating');
    }
  };

  const renderStars = (rating: number, interactive = false, onRatingChange?: (rating: number) => void) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => interactive && onRatingChange && onRatingChange(star)}
            disabled={!interactive}
            className={`w-5 h-5 ${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'} ${
              star <= rating ? 'text-yellow-400' : 'text-gray-300'
            } transition-all`}
          >
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        ))}
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Route Ratings</h2>
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

        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{routeName}</h3>
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              {renderStars(averageRating)}
              <span className="ml-2 text-lg font-medium text-gray-900">
                {averageRating.toFixed(1)}
              </span>
            </div>
            <span className="text-gray-600">
              ({totalRatings} {totalRatings === 1 ? 'review' : 'reviews'})
            </span>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* User's Rating Section */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-md font-semibold text-gray-900 mb-3">Your Rating</h4>
          
          {userRating ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {renderStars(userRating.rating)}
                  <span className="text-sm text-gray-600">({userRating.rating}/5)</span>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setNewRating({ rating: userRating.rating, comment: userRating.comment });
                      setShowRatingForm(true);
                    }}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={deleteRating}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
              {userRating.comment && (
                <p className="text-sm text-gray-600 italic">"{userRating.comment}"</p>
              )}
            </div>
          ) : (
            <div>
              <p className="text-gray-600 mb-3">You haven't rated this route yet.</p>
              <button
                onClick={() => setShowRatingForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Rate This Route
              </button>
            </div>
          )}
        </div>

        {/* Rating Form */}
        {showRatingForm && (
          <div className="mb-6 p-4 border border-gray-200 rounded-lg">
            <h4 className="text-md font-semibold text-gray-900 mb-3">
              {userRating ? 'Update Your Rating' : 'Rate This Route'}
            </h4>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rating
                </label>
                <div className="flex items-center space-x-2">
                  {renderStars(newRating.rating, true, (rating) => 
                    setNewRating(prev => ({ ...prev, rating }))
                  )}
                  <span className="text-sm text-gray-600">({newRating.rating}/5)</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comment (optional)
                </label>
                <textarea
                  value={newRating.comment}
                  onChange={(e) => setNewRating(prev => ({ ...prev, comment: e.target.value }))}
                  rows={3}
                  placeholder="Share your experience with this route..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowRatingForm(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={submitRating}
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Submitting...' : 'Submit Rating'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* All Ratings */}
        <div>
          <h4 className="text-lg font-semibold text-gray-900 mb-4">All Reviews</h4>
          
          {ratings.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No reviews yet. Be the first to rate this route!
            </p>
          ) : (
            <div className="space-y-4">
              {ratings.map((rating) => (
                <div key={rating.id} className="border-b border-gray-200 pb-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        {renderStars(rating.rating)}
                        <span className="text-sm text-gray-600">({rating.rating}/5)</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        by {rating.user.name} • {formatDate(rating.created_at)}
                      </div>
                    </div>
                  </div>
                  
                  {rating.comment && (
                    <p className="text-gray-700 mt-2">"{rating.comment}"</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RouteRating;
