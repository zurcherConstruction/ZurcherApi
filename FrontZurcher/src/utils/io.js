import { io } from 'socket.io-client';
import api from './axios'; // Importa tu instancia de Axios

// Usa la base URL de Axios para configurar Socket.IO
const socket = io(api.defaults.baseURL); // Usa la baseURL configurada en Axios

export default socket;