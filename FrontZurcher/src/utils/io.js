import { io } from 'socket.io-client';
import api from './axios';



const SOCKET_URL = import.meta.env.MODE === 'production'
  ? 'https://zurcherapi.up.railway.app'
  : api.defaults.baseURL;

const socket = io(SOCKET_URL, {
  path: '/socket.io/',
  transports: ['websocket', 'polling'],
  secure: import.meta.env.MODE === 'production',
  rejectUnauthorized: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  timeout: 45000,
  withCredentials: true,
  autoConnect: false // Connect manually when needed
});

// Socket event handlers
socket.on("connect", () => {
  console.log('Socket connected:', socket.id);
});

socket.on("connect_error", (error) => {
  console.error("Socket connection error:", {
    message: error.message,
    type: error.type,
    time: new Date().toISOString()
  });
});

socket.on("disconnect", (reason) => {
  console.log('Socket disconnected:', reason);
});

// Helper functions
export const connectSocket = (staffId) => {
  if (!socket.connected) {
    socket.connect();
  }
  socket.emit('join', staffId);
};

export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
};

export default socket;