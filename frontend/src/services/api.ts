import axios from 'axios';
import { DirectionsRequest, DirectionsResponse, GeocodeResponse, ChatRoom, ChatMessage, User } from '../types';

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

// Auth API
export const authService = {
  async login(email: string, password: string) {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  async register(username: string, email: string, password: string) {
    const response = await api.post('/auth/register', { username, email, password });
    return response.data;
  },

  async getProfile(): Promise<{ user: User }> {
    const response = await api.get('/auth/profile');
    return response.data;
  },
};

// Routes API
export const routesService = {
  async getDirections(request: DirectionsRequest): Promise<DirectionsResponse> {
    const response = await api.post('/routes/directions', request);
    return response.data;
  },

  async geocode(address: string): Promise<GeocodeResponse> {
    const response = await api.post('/routes/geocode', { address });
    return response.data;
  },

  async reverseGeocode(lat: number, lng: number): Promise<GeocodeResponse> {
    const response = await api.post('/routes/reverse-geocode', { lat, lng });
    return response.data;
  },

  async findNearby(lat: number, lng: number, radius?: number, type?: string) {
    const response = await api.post('/routes/nearby', { lat, lng, radius, type });
    return response.data;
  },
};

// Chat API
export const chatService = {
  async getRooms(): Promise<{ rooms: ChatRoom[] }> {
    const response = await api.get('/chat/rooms');
    return response.data;
  },

  async getChatHistory(roomId: string, limit = 50, offset = 0): Promise<{ messages: ChatMessage[]; total: number }> {
    const response = await api.get(`/chat/history/${roomId}?limit=${limit}&offset=${offset}`);
    return response.data;
  },

  async createRoom(name: string, description?: string, isPrivate = false): Promise<{ room: ChatRoom }> {
    const response = await api.post('/chat/rooms', { name, description, isPrivate });
    return response.data;
  },

  async joinRoom(roomId: string, userId: string) {
    const response = await api.post(`/chat/rooms/${roomId}/join`, { userId });
    return response.data;
  },

  async leaveRoom(roomId: string, userId: string) {
    const response = await api.post(`/chat/rooms/${roomId}/leave`, { userId });
    return response.data;
  },
};

export default api;

