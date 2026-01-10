/**
 * Test Configuration
 *
 * Centralized configuration for test URLs and endpoints
 */

// Platform backend URL
export const PLATFORM_URL = process.env.PLATFORM_URL || 'http://localhost:3000';

// Lottery app URL
export const LOTTERY_URL = process.env.LOTTERY_URL || 'http://localhost:5173';

// Quiz app URL
export const QUIZ_URL = process.env.QUIZ_URL || 'http://localhost:5174';

// Export for use in tests
export const TEST_CONFIG = {
  platformUrl: PLATFORM_URL,
  lotteryUrl: LOTTERY_URL,
  quizUrl: QUIZ_URL,
} as const;
