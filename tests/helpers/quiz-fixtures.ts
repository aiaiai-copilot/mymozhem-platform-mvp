import { APIRequestContext } from '@playwright/test';
import { authHeader } from './auth';

/**
 * Quiz question structure
 */
export interface QuizQuestion {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  timeLimit?: number;
}

/**
 * Create a test quiz room with questions
 */
export async function createQuizRoom(
  request: APIRequestContext,
  token: string,
  options: {
    name?: string;
    description?: string;
    questions?: QuizQuestion[];
    isPublic?: boolean;
  } = {}
) {
  const timestamp = Date.now();
  const defaultQuestions: QuizQuestion[] = [
    {
      id: `q1_${timestamp}`,
      text: 'What is 2 + 2?',
      options: ['3', '4', '5', '6'],
      correctIndex: 1, // Answer is '4'
    },
    {
      id: `q2_${timestamp}`,
      text: 'What color is the sky?',
      options: ['Green', 'Red', 'Blue', 'Yellow'],
      correctIndex: 2, // Answer is 'Blue'
    },
    {
      id: `q3_${timestamp}`,
      text: 'How many days in a week?',
      options: ['5', '6', '7', '8'],
      correctIndex: 2, // Answer is '7'
    },
  ];

  const questions = options.questions || defaultQuestions;

  const response = await request.post('http://127.0.0.1:3000/api/v1/rooms', {
    headers: {
      ...authHeader(token),
      'Content-Type': 'application/json',
    },
    data: {
      name: options.name || `Test Quiz ${timestamp}`,
      description: options.description || 'Test quiz for automated testing',
      appId: 'app_quiz_v1',
      appSettings: {
        questions,
        currentQuestionIndex: -1,
        quizStatus: 'WAITING',
      },
      isPublic: options.isPublic !== undefined ? options.isPublic : true,
    },
  });

  if (!response.ok()) {
    const body = await response.text();
    throw new Error(`Failed to create quiz room: ${response.status()} - ${body}`);
  }

  return (await response.json()).data;
}

/**
 * Create a quiz point prize (required for winner records)
 */
export async function createQuizPrize(
  request: APIRequestContext,
  token: string,
  roomId: string
) {
  const response = await request.post(
    `http://127.0.0.1:3000/api/v1/rooms/${roomId}/prizes`,
    {
      headers: {
        ...authHeader(token),
        'Content-Type': 'application/json',
      },
      data: {
        name: 'Quiz Point',
        description: 'Point awarded for winning a quiz round',
        quantity: 100,
      },
    }
  );

  if (!response.ok()) {
    throw new Error(`Failed to create quiz prize: ${response.status()}`);
  }

  return (await response.json()).data;
}

/**
 * Update quiz app settings
 */
export async function updateQuizSettings(
  request: APIRequestContext,
  token: string,
  roomId: string,
  appSettings: Record<string, unknown>
) {
  const response = await request.patch(
    `http://127.0.0.1:3000/api/v1/rooms/${roomId}`,
    {
      headers: {
        ...authHeader(token),
        'Content-Type': 'application/json',
      },
      data: { appSettings },
    }
  );

  if (!response.ok()) {
    throw new Error(`Failed to update quiz settings: ${response.status()}`);
  }

  return (await response.json()).data;
}

/**
 * Get room details
 */
export async function getRoom(
  request: APIRequestContext,
  token: string,
  roomId: string
) {
  const response = await request.get(
    `http://127.0.0.1:3000/api/v1/rooms/${roomId}`,
    {
      headers: authHeader(token),
    }
  );

  if (!response.ok()) {
    throw new Error(`Failed to get room: ${response.status()}`);
  }

  return (await response.json()).data;
}

/**
 * Get room winners
 */
export async function getWinners(
  request: APIRequestContext,
  token: string,
  roomId: string
) {
  const response = await request.get(
    `http://127.0.0.1:3000/api/v1/rooms/${roomId}/winners`,
    {
      headers: authHeader(token),
    }
  );

  if (!response.ok()) {
    throw new Error(`Failed to get winners: ${response.status()}`);
  }

  return (await response.json()).data;
}
