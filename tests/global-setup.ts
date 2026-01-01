import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Global setup - runs once before all tests
 * Resets and seeds the database with test data
 */
async function globalSetup() {
  console.log('\n🔄 Running global setup: resetting database...\n');

  try {
    // Reset database and run seeds (use --force for non-interactive mode)
    await execAsync('cd platform && pnpm prisma migrate reset --force', {
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
    });

    console.log('✅ Database reset and seeded successfully\n');
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    throw error;
  }
}

export default globalSetup;
