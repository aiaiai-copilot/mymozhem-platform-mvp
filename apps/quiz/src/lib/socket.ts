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
  if (socket.connected) {
    socket.emit('room:subscribe', { roomId });
  } else {
    // Wait for connection then subscribe
    socket.once('connect', () => {
      socket.emit('room:subscribe', { roomId });
    });
  }
}

export function unsubscribeFromRoom(roomId: string) {
  if (socket.connected) {
    socket.emit('room:unsubscribe', { roomId });
  }
}

// Quiz-specific socket emitters
export function emitQuizAnswer(roomId: string, questionId: string, answerIndex: number) {
  if (socket.connected) {
    socket.emit('quiz:answer', { roomId, questionId, answerIndex, timestamp: Date.now() });
  }
}

export function emitShowQuestion(roomId: string, questionIndex: number) {
  if (socket.connected) {
    socket.emit('quiz:show_question', { roomId, questionIndex });
  }
}

export function emitStartQuiz(roomId: string) {
  if (socket.connected) {
    socket.emit('quiz:start', { roomId });
  }
}

export function emitEndQuiz(roomId: string) {
  if (socket.connected) {
    socket.emit('quiz:end', { roomId });
  }
}
