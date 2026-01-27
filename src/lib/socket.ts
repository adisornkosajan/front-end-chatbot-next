import { io, Socket } from 'socket.io-client';
import { getWsUrl } from './config';

let socket: Socket | null = null;
let isConnecting = false;

export function connectSocket(token: string): Socket {
  console.log('═══════════════════════════════════════');
  console.log('🔌 connectSocket() called');
  console.log('Token:', token ? token.substring(0, 20) + '...' : 'NO TOKEN');
  console.log('Current socket state:', socket?.connected ? 'CONNECTED' : 'DISCONNECTED');
  console.log('═══════════════════════════════════════');

  if (socket?.connected) {
    console.log('✅ Socket already connected, reusing:', socket.id);
    return socket;
  }

  if (isConnecting) {
    console.log('⏳ Socket connection in progress...');
    return socket!;
  }

  isConnecting = true;
  console.log('🚀 Creating new socket connection to:', getWsUrl());

  try {
    socket = io(getWsUrl(), {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('═══════════════════════════════════════');
      console.log('✅ SOCKET CONNECTED SUCCESSFULLY!');
      console.log('Socket ID:', socket?.id);
      console.log('Transport:', socket?.io?.engine?.transport?.name);
      console.log('═══════════════════════════════════════');
      isConnecting = false;
    });

    socket.on('connect_error', (error) => {
      console.error('═══════════════════════════════════════');
      console.error('❌ SOCKET CONNECTION ERROR!');
      console.error('Error:', error.message);
      console.error('Stack:', error.stack);
      console.error('═══════════════════════════════════════');
      isConnecting = false;
    });

    socket.on('disconnect', (reason) => {
      console.log('═══════════════════════════════════════');
      console.log('👋 SOCKET DISCONNECTED!');
      console.log('Reason:', reason);
      console.log('═══════════════════════════════════════');
      isConnecting = false;
    });

    // Debug: Listen to ALL events
    socket.onAny((eventName, ...args) => {
      console.log('📡 Socket event received:', eventName, args);
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

