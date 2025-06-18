const express = require('express');
const axios = require('axios');
const router = express.Router();

// Get directions between two points
router.post('/directions', async (req, res) => {
  try {
    const { origin, destination, mode = 'driving' } = req.body;

    if (!origin || !destination) {
      return res.status(400).json({
        error: 'Origin and destination are required'
      });
    }

    // Using OpenRouteService API (free alternative to Google Maps)
    // You can replace this with Google Maps Directions API if you have a key
    const API_KEY = process.env.OPENROUTE_API_KEY;
    
    if (!API_KEY) {
      return res.status(500).json({
        error: 'Mapping service not configured'
      });
    }

    const profile = mode === 'walking' ? 'foot-walking' : 'driving-car';
    const url = `https://api.openrouteservice.org/v2/directions/${profile}`;
    
    const response = await axios.post(url, {
      coordinates: [
        [origin.lng, origin.lat],
        [destination.lng, destination.lat]
      ]
    }, {
      headers: {
        'Authorization': API_KEY,
        'Content-Type': 'application/json'
      }
    });

    const route = response.data.routes[0];
    
    res.json({
      success: true,
      route: {
        coordinates: route.geometry.coordinates,
        distance: route.summary.distance, // in meters
        duration: route.summary.duration, // in seconds
        instructions: route.segments[0]?.steps || []
      }
    });

  } catch (error) {
    console.error('Directions error:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to get directions',
      message: error.response?.data?.error?.message || error.message
    });
  }
});

// Geocoding - convert address to coordinates
router.post('/geocode', async (req, res) => {
  try {
    const { address } = req.body;

    if (!address) {
      return res.status(400).json({
        error: 'Address is required'
      });
    }

    // Using OpenStreetMap Nominatim (free geocoding)
    const url = 'https://nominatim.openstreetmap.org/search';
    
    const response = await axios.get(url, {
      params: {
        q: address,
        format: 'json',
        limit: 1
      },
      headers: {
        'User-Agent': 'RoutesChat-App/1.0'
      }
    });

    if (response.data.length === 0) {
      return res.status(404).json({
        error: 'Address not found'
      });
    }

    const result = response.data[0];
    
    res.json({
      success: true,
      coordinates: {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon)
      },
      address: result.display_name
    });

  } catch (error) {
    console.error('Geocoding error:', error.message);
    res.status(500).json({
      error: 'Failed to geocode address'
    });
  }
});

// Reverse geocoding - convert coordinates to address
router.post('/reverse-geocode', async (req, res) => {
  try {
    const { lat, lng } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({
        error: 'Latitude and longitude are required'
      });
    }

    const url = 'https://nominatim.openstreetmap.org/reverse';
    
    const response = await axios.get(url, {
      params: {
        lat,
        lon: lng,
        format: 'json'
      },
      headers: {
        'User-Agent': 'RoutesChat-App/1.0'
      }
    });

    res.json({
      success: true,
      address: response.data.display_name,
      details: response.data.address
    });

  } catch (error) {
    console.error('Reverse geocoding error:', error.message);
    res.status(500).json({
      error: 'Failed to reverse geocode coordinates'
    });
  }
});

// Find nearby places
router.post('/nearby', async (req, res) => {
  try {
    const { lat, lng, radius = 1000, type = 'restaurant' } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({
        error: 'Latitude and longitude are required'
      });
    }

    // Using Overpass API to find nearby places from OpenStreetMap
    const query = `
      [out:json][timeout:25];
      (
        node["amenity"="${type}"](around:${radius},${lat},${lng});
      );
      out center;
    `;

    const response = await axios.post('https://overpass-api.de/api/interpreter', query, {
      headers: {
        'Content-Type': 'text/plain'
      }
    });

    const places = response.data.elements.map(element => ({
      id: element.id,
      name: element.tags?.name || 'Unnamed',
      type: element.tags?.amenity,
      coordinates: {
        lat: element.lat,
        lng: element.lon
      },
      address: element.tags?.['addr:full'] || 
                `${element.tags?.['addr:street'] || ''} ${element.tags?.['addr:housenumber'] || ''}`.trim()
    }));

    res.json({
      success: true,
      places: places.slice(0, 20) // Limit to 20 results
    });

  } catch (error) {
    console.error('Nearby search error:', error.message);
    res.status(500).json({
      error: 'Failed to find nearby places'
    });
  }
});

module.exports = router;

