export interface User {
  id: string;
  username: string;
  email: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface ChatMessage {
  id: string | number;
  userId: string;
  username: string;
  message: string;
  timestamp: string;
  roomId: string;
}

export interface ChatRoom {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  lastActivity: string;
  isPrivate?: boolean;
}

export interface Location {
  lat: number;
  lng: number;
}

export interface RouteInstruction {
  instruction: string;
  distance: number;
  duration: number;
}

export interface Route {
  coordinates: [number, number][];
  distance: number; // in meters
  duration: number; // in seconds
  instructions: RouteInstruction[];
}

export interface DirectionsRequest {
  origin: Location;
  destination: Location;
  mode?: 'driving' | 'walking' | 'cycling';
}

export interface DirectionsResponse {
  success: boolean;
  route: Route;
}

export interface Place {
  id: string | number;
  name: string;
  type: string;
  coordinates: Location;
  address: string;
}

export interface GeocodeResponse {
  success: boolean;
  coordinates: Location;
  address: string;
}

export interface SocketEvents {
  // Chat events
  join_room: (roomId: string) => void;
  send_message: (data: {
    roomId: string;
    message: string;
    userId: string;
    username: string;
  }) => void;
  receive_message: (message: ChatMessage) => void;
  
  // Location events
  share_location: (data: {
    roomId: string;
    location: Location;
    userId: string;
  }) => void;
  location_update: (data: {
    userId: string;
    location: Location;
    timestamp: string;
  }) => void;
  
  // Typing events
  typing: (data: {
    roomId: string;
    userId: string;
    isTyping: boolean;
  }) => void;
  user_typing: (data: {
    userId: string;
    isTyping: boolean;
  }) => void;
}

