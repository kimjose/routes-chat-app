import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import RouteList from './routes/RouteList';
import CreateRoute from './routes/CreateRoute';
import TripList from './trips/TripList';
import CreateTrip from './trips/CreateTrip';
import TripRequestManager from './trips/TripRequestManager';

type DashboardView = 'routes' | 'trips' | 'create-route' | 'create-trip' | 'requests';

const Dashboard: React.FC = () => {
  const [activeView, setActiveView] = useState<DashboardView>('routes');
  const [selectedTripId, setSelectedTripId] = useState<number | null>(null);
  const { user, logout } = useAuth();

  const renderNavigation = () => (
    <div className="bg-white shadow-sm border-b">
      <div className="max-w-6xl mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex space-x-6">
            <button
              onClick={() => setActiveView('routes')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeView === 'routes' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              Routes
            </button>
            <button
              onClick={() => setActiveView('trips')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeView === 'trips' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              Trips
            </button>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveView('create-route')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
              >
                + Create Route
              </button>
              <button
                onClick={() => setActiveView('create-trip')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                + Post Trip
              </button>
            </div>
            
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-600">
                Welcome, {user?.username}
              </span>
              <button
                onClick={logout}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeView) {
      case 'routes':
        return <RouteList />;
      
      case 'create-route':
        return (
          <CreateRoute
            onRouteCreated={() => setActiveView('routes')}
            onCancel={() => setActiveView('routes')}
          />
        );
      
      case 'trips':
        return <TripList />;
      
      case 'create-trip':
        return (
          <CreateTrip
            onTripCreated={() => setActiveView('trips')}
            onCancel={() => setActiveView('trips')}
          />
        );
      
      case 'requests':
        return selectedTripId ? (
          <TripRequestManager
            tripId={selectedTripId}
            onClose={() => {
              setActiveView('trips');
              setSelectedTripId(null);
            }}
          />
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">No trip selected for request management</p>
          </div>
        );
      
      default:
        return <RouteList />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {renderNavigation()}
      <main className="py-6">
        {renderContent()}
      </main>
    </div>
  );
};

export default Dashboard;
