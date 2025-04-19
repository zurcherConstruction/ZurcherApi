import { io } from 'socket.io-client';
import api from './axios';

// Define production URLs
const PRODUCTION_URLS = [
  'https://zurcherapi.up.railway.app',
  'https://zurcher-api-9526.onrender.com'
];

let currentUrlIndex = 0;
const getSocketURL = () => {
  return import.meta.env.MODE === 'production' 
    ? PRODUCTION_URLS[currentUrlIndex]
    : api.defaults.baseURL;
};

const createSocketConnection = (url) => {
  return io(url, {
    path: '/socket.io/',
    transports: ['polling', 'websocket'], // Try polling first
    secure: import.meta.env.MODE === 'production',
    rejectUnauthorized: false,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 45000,
    withCredentials: true,
    autoConnect: false
  });
};

let socket = createSocketConnection(getSocketURL());

// Enhanced error handling with fallback
socket.on("connect_error", (error) => {
  console.error("Socket connection error:", {
    message: error.message,
    type: error.type,
    url: socket.io.uri,
    time: new Date().toISOString()
  });

  // Try fallback URL in production
  if (import.meta.env.MODE === 'production' && currentUrlIndex < PRODUCTION_URLS.length - 1) {
    currentUrlIndex++;
    console.log(`Attempting connection to backup server: ${PRODUCTION_URLS[currentUrlIndex]}`);
    socket.close();
    socket = createSocketConnection(PRODUCTION_URLS[currentUrlIndex]);
    socket.connect();
  }
});

socket.on("connect", () => {
  console.log('Socket connected:', {
    id: socket.id,
    url: socket.io.uri
  });
});

socket.on("disconnect", (reason) => {
  console.log('Socket disconnected:', {
    reason,
    url: socket.io.uri,
    time: new Date().toISOString()
  });
});

// Helper functions with enhanced error handling
export const connectSocket = async (staffId) => {
  try {
    if (!socket.connected) {
      await socket.connect();
    }
    socket.emit('join', staffId);
    return true;
  } catch (error) {
    console.error('Connection error:', error);
    return false;
  }
};

export const disconnectSocket = () => {
  try {
    if (socket.connected) {
      socket.disconnect();
    }
    return true;
  } catch (error) {
    console.error('Disconnect error:', error);
    return false;
  }
};

export default socket;