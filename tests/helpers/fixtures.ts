import { APIRequestContext } from '@playwright/test';
import { authHeader } from './auth';

/**
 * Create a test room
 */
export async function createTestRoom(
  request: APIRequestContext,
  token: string,
  options: {
    name?: string;
    description?: string;
    ticketCount?: number;
    drawDate?: string;
    isPublic?: boolean;
  } = {}
) {
  const timestamp = Date.now();
  const response = await request.post('http://127.0.0.1:3000/api/v1/rooms', {
    headers: {
      ...authHeader(token),
      'Content-Type': 'application/json',
    },
    data: {
      name: options.name || `Test Lottery ${timestamp}`,
      description: options.description || 'Test lottery for automated testing',
      appId: 'app_lottery_v1',
      appSettings: {
        ticketCount: options.ticketCount || 100,
        drawDate: options.drawDate || '2026-12-31T23:00:00Z',
      },
      isPublic: options.isPublic !== undefined ? options.isPublic : true,
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to create room: ${response.status()}`);
  }

  return (await response.json()).data;
}

/**
 * Add a prize to a room
 */
export async function createPrize(
  request: APIRequestContext,
  token: string,
  roomId: string,
  options: {
    name?: string;
    description?: string;
    quantity?: number;
    imageUrl?: string;
  } = {}
) {
  const response = await request.post(
    `http://127.0.0.1:3000/api/v1/rooms/${roomId}/prizes`,
    {
      headers: {
        ...authHeader(token),
        'Content-Type': 'application/json',
      },
      data: {
        name: options.name || `Test Prize ${Date.now()}`,
        description: options.description || 'Test prize description',
        quantity: options.quantity || 1,
        imageUrl: options.imageUrl || 'https://picsum.photos/400/300',
      },
    }
  );

  if (!response.ok()) {
    throw new Error(`Failed to create prize: ${response.status()}`);
  }

  return (await response.json()).data;
}

/**
 * Join a room as a participant
 */
export async function joinRoom(
  request: APIRequestContext,
  token: string,
  roomId: string,
  role: 'PARTICIPANT' | 'VIEWER' = 'PARTICIPANT'
) {
  const response = await request.post(
    `http://127.0.0.1:3000/api/v1/rooms/${roomId}/participants`,
    {
      headers: {
        ...authHeader(token),
        'Content-Type': 'application/json',
      },
      data: { role },
    }
  );

  if (!response.ok()) {
    throw new Error(`Failed to join room: ${response.status()}`);
  }

  return (await response.json()).data;
}

/**
 * Update room status
 */
export async function updateRoomStatus(
  request: APIRequestContext,
  token: string,
  roomId: string,
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
) {
  const response = await request.patch(
    `http://127.0.0.1:3000/api/v1/rooms/${roomId}`,
    {
      headers: {
        ...authHeader(token),
        'Content-Type': 'application/json',
      },
      data: { status },
    }
  );

  if (!response.ok()) {
    throw new Error(`Failed to update room status: ${response.status()}`);
  }

  return (await response.json()).data;
}

/**
 * Draw a winner
 */
export async function drawWinner(
  request: APIRequestContext,
  token: string,
  roomId: string,
  participantId: string,
  prizeId: string
) {
  const response = await request.post(
    `http://127.0.0.1:3000/api/v1/rooms/${roomId}/winners`,
    {
      headers: {
        ...authHeader(token),
        'Content-Type': 'application/json',
      },
      data: {
        participantId,
        prizeId,
        metadata: { algorithm: 'random' },
      },
    }
  );

  if (!response.ok()) {
    throw new Error(`Failed to draw winner: ${response.status()}`);
  }

  return (await response.json()).data;
}
