import { io, Socket } from 'socket.io-client';

const PLATFORM_URL = import.meta.env.VITE_PLATFORM_URL || 'http://localhost:3000';

export const socket: Socket = io(PLATFORM_URL, {
  autoConnect: false,
  transports: ['websocket', 'polling'],
});

export function connectWithToken(token: string) {
  socket.auth = { token };
  socket.connect();
}

export function disconnect() {
  socket.disconnect();
}

export function subscribeToRoom(roomId: string) {
  socket.emit('room:subscribe', { roomId });
}

export function unsubscribeFromRoom(roomId: string) {
  socket.emit('room:unsubscribe', { roomId });
}
