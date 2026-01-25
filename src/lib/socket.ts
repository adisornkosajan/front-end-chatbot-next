import { io, Socket } from 'socket.io-client';
import { getWsUrl } from './config';

let socket: Socket | null = null;
let isConnecting = false;

export function connectSocket(token: string): Socket {
  if (socket?.connected) {
    console.log('Socket already connected');
    return socket;
  }

  if (isConnecting) {
    console.log('Socket connection in progress...');
    return socket!;
  }

  isConnecting = true;
  console.log('Connecting to WebSocket...', getWsUrl());

  try {
    socket = io(getWsUrl(), {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('✅ WebSocket connected:', socket?.id);
      isConnecting = false;
    });

    socket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error.message);
      isConnecting = false;
    });

    socket.on('disconnect', (reason) => {
      console.log('👋 WebSocket disconnected:', reason);
      isConnecting = false;
    });

    return socket;
  } catch (error) {
    console.error('❌ Failed to create socket:', error);
    isConnecting = false;
    throw error;
  }
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    isConnecting = false;
    console.log('Socket disconnected manually');
  }
}

export function isSocketConnected(): boolean {
  return socket?.connected || false;
}

