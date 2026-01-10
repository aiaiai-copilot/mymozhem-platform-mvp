/**
 * Prisma Database Seed Script
 *
 * Populates the database with initial test data for development.
 *
 * Run: npx prisma db seed
 */

import { PrismaClient, RoomStatus, ParticipantRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...\n');

  // ============================================================================
  // USERS
  // ============================================================================
  console.log('Creating users...');

  const alice = await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    update: {},
    create: {
      email: 'alice@example.com',
      name: 'Alice Johnson',
      avatar: 'https://i.pravatar.cc/150?img=1',
      provider: 'google',
      providerId: 'google_alice_123',
      emailVerified: new Date(),
    },
  });

  const bob = await prisma.user.upsert({
    where: { email: 'bob@example.com' },
    update: {},
    create: {
      email: 'bob@example.com',
      name: 'Bob Smith',
      avatar: 'https://i.pravatar.cc/150?img=2',
      provider: 'google',
      providerId: 'google_bob_456',
      emailVerified: new Date(),
    },
  });

  const charlie = await prisma.user.upsert({
    where: { email: 'charlie@example.com' },
    update: {},
    create: {
      email: 'charlie@example.com',
      name: 'Charlie Davis',
      avatar: 'https://i.pravatar.cc/150?img=3',
      provider: 'google',
      providerId: 'google_charlie_789',
      emailVerified: new Date(),
    },
  });

  const diana = await prisma.user.upsert({
    where: { email: 'diana@example.com' },
    update: {},
    create: {
      email: 'diana@example.com',
      name: 'Diana Martinez',
      avatar: 'https://i.pravatar.cc/150?img=4',
      provider: 'google',
      providerId: 'google_diana_101',
      emailVerified: new Date(),
    },
  });

  console.log(`✓ Created ${4} users\n`);

  // ============================================================================
  // APPLICATIONS
  // ============================================================================
  console.log('Creating applications...');

  const lotteryApp = await prisma.app.upsert({
    where: { appId: 'app_lottery_v1' },
    update: {},
    create: {
      appId: 'app_lottery_v1',
      appSecret: 'sk_live_lottery_secret_abc123def456',
      isActive: true,
      manifestVersion: '1.0.0',
      manifest: {
        meta: {
          name: 'Holiday Lottery',
          version: '1.0.0',
          description: 'Application for conducting lotteries with random winner selection',
        },
        baseUrl: 'https://lottery.example.com',
        capabilities: ['winnerSelection'],
        permissions: [
          'users:read',
          'rooms:read',
          'rooms:write',
          'participants:read',
          'participants:write',
          'prizes:read',
          'prizes:write',
          'realtime:subscribe',
        ],
        settings: {
          type: 'object',
          properties: {
            ticketCount: {
              type: 'integer',
              minimum: 1,
              description: 'Number of tickets available',
            },
            drawDate: {
              type: 'string',
              format: 'date-time',
              description: 'Date and time of the draw',
            },
          },
          required: ['ticketCount', 'drawDate'],
        },
      },
    },
  });

  const quizApp = await prisma.app.upsert({
    where: { appId: 'app_quiz_v1' },
    update: {},
    create: {
      appId: 'app_quiz_v1',
      appSecret: 'sk_live_quiz_secret_xyz789ghi012',
      isActive: true,
      manifestVersion: '1.0.0',
      manifest: {
        meta: {
          name: 'Quiz "Who\'s First?"',
          version: '1.0.0',
          description: 'Real-time quiz application with speed-based winner selection',
        },
        baseUrl: 'https://quiz.example.com',
        capabilities: ['winnerSelection', 'notifications'],
        permissions: [
          'users:read',
          'rooms:read',
          'rooms:write',
          'participants:read',
          'participants:write',
          'prizes:read',
          'prizes:write',
          'realtime:subscribe',
          'realtime:publish',
        ],
        settings: {
          type: 'object',
          properties: {
            questions: {
              type: 'array',
              description: 'Array of quiz questions',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  text: { type: 'string' },
                  options: { type: 'array', items: { type: 'string' } },
                  correctIndex: { type: 'integer' },
                  timeLimit: { type: 'integer' },
                },
                required: ['id', 'text', 'options', 'correctIndex'],
              },
            },
            currentQuestionIndex: {
              type: 'integer',
              description: 'Index of current question (-1 = not started)',
            },
            quizStatus: {
              type: 'string',
              enum: ['WAITING', 'QUESTION_ACTIVE', 'BETWEEN_ROUNDS', 'FINISHED'],
              description: 'Current quiz state',
            },
          },
          required: ['questions', 'currentQuestionIndex', 'quizStatus'],
        },
      },
    },
  });

  console.log(`✓ Created ${2} applications\n`);

  // ============================================================================
  // ROOMS
  // ============================================================================
  console.log('Creating rooms...');

  const newYearLottery = await prisma.room.create({
    data: {
      name: 'New Year Lottery 2025',
      description: 'Win amazing prizes in our annual New Year lottery!',
      appId: lotteryApp.appId,
      appManifestVersion: lotteryApp.manifestVersion,
      appSettings: {
        ticketCount: 100,
        drawDate: '2025-12-31T23:00:00Z',
      },
      status: RoomStatus.ACTIVE,
      isPublic: true,
      createdBy: alice.id,
    },
  });

  const christmasQuiz = await prisma.room.create({
    data: {
      name: 'Christmas Trivia Quiz',
      description: 'Test your Christmas knowledge and win prizes!',
      appId: quizApp.appId,
      appManifestVersion: quizApp.manifestVersion,
      appSettings: {
        questions: [
          {
            id: 'q1',
            text: 'What is traditionally placed on top of a Christmas tree?',
            options: ['Star', 'Bell', 'Snowflake', 'Candy Cane'],
            correctIndex: 0,
          },
          {
            id: 'q2',
            text: 'How many reindeer does Santa have (including Rudolph)?',
            options: ['7', '8', '9', '10'],
            correctIndex: 2,
          },
          {
            id: 'q3',
            text: 'What country started the tradition of putting up a Christmas tree?',
            options: ['USA', 'England', 'Germany', 'France'],
            correctIndex: 2,
          },
        ],
        currentQuestionIndex: -1,
        quizStatus: 'WAITING',
      },
      status: RoomStatus.ACTIVE,
      isPublic: true,
      createdBy: bob.id,
    },
  });

  const draftLottery = await prisma.room.create({
    data: {
      name: 'Private Office Lottery (Draft)',
      description: 'Company lottery for employees only',
      appId: lotteryApp.appId,
      appManifestVersion: lotteryApp.manifestVersion,
      appSettings: {
        ticketCount: 50,
        drawDate: '2026-01-15T18:00:00Z',
      },
      status: RoomStatus.DRAFT,
      isPublic: false,
      createdBy: charlie.id,
    },
  });

  console.log(`✓ Created ${3} rooms\n`);

  // ============================================================================
  // PARTICIPANTS
  // ============================================================================
  console.log('Creating participants...');

  // New Year Lottery participants
  const aliceParticipant = await prisma.participant.create({
    data: {
      userId: alice.id,
      roomId: newYearLottery.id,
      role: ParticipantRole.ORGANIZER,
      metadata: {
        ticketNumber: 1,
      },
    },
  });

  const bobLotteryParticipant = await prisma.participant.create({
    data: {
      userId: bob.id,
      roomId: newYearLottery.id,
      role: ParticipantRole.PARTICIPANT,
      metadata: {
        ticketNumber: 42,
      },
    },
  });

  const charlieLotteryParticipant = await prisma.participant.create({
    data: {
      userId: charlie.id,
      roomId: newYearLottery.id,
      role: ParticipantRole.PARTICIPANT,
      metadata: {
        ticketNumber: 13,
      },
    },
  });

  const dianaLotteryParticipant = await prisma.participant.create({
    data: {
      userId: diana.id,
      roomId: newYearLottery.id,
      role: ParticipantRole.VIEWER,
      metadata: null,
    },
  });

  // Christmas Quiz participants
  await prisma.participant.create({
    data: {
      userId: bob.id,
      roomId: christmasQuiz.id,
      role: ParticipantRole.ORGANIZER,
      metadata: {
        score: 0,
      },
    },
  });

  await prisma.participant.create({
    data: {
      userId: alice.id,
      roomId: christmasQuiz.id,
      role: ParticipantRole.PARTICIPANT,
      metadata: {
        score: 0,
      },
    },
  });

  await prisma.participant.create({
    data: {
      userId: charlie.id,
      roomId: christmasQuiz.id,
      role: ParticipantRole.PARTICIPANT,
      metadata: {
        score: 0,
      },
    },
  });

  // Draft lottery organizer
  await prisma.participant.create({
    data: {
      userId: charlie.id,
      roomId: draftLottery.id,
      role: ParticipantRole.ORGANIZER,
      metadata: null,
    },
  });

  console.log(`✓ Created ${8} participants\n`);

  // ============================================================================
  // PRIZES
  // ============================================================================
  console.log('Creating prizes...');

  // New Year Lottery prizes
  const grandPrize = await prisma.prize.create({
    data: {
      roomId: newYearLottery.id,
      name: 'Grand Prize - iPhone 15 Pro',
      description: 'Latest iPhone 15 Pro 256GB in Space Black',
      imageUrl: 'https://picsum.photos/seed/iphone/400/300',
      quantity: 1,
      quantityRemaining: 1,
      metadata: {
        value: 999.99,
        sponsor: 'TechCorp Inc.',
        category: 'electronics',
      },
    },
  });

  const secondPrize = await prisma.prize.create({
    data: {
      roomId: newYearLottery.id,
      name: 'Second Prize - AirPods Pro',
      description: 'Apple AirPods Pro with noise cancellation',
      imageUrl: 'https://picsum.photos/seed/airpods/400/300',
      quantity: 2,
      quantityRemaining: 2,
      metadata: {
        value: 249.99,
        sponsor: 'TechCorp Inc.',
        category: 'electronics',
      },
    },
  });

  const consolationPrize = await prisma.prize.create({
    data: {
      roomId: newYearLottery.id,
      name: 'Gift Card - $50 Amazon',
      description: '$50 Amazon gift card',
      imageUrl: 'https://picsum.photos/seed/giftcard/400/300',
      quantity: 5,
      quantityRemaining: 5,
      metadata: {
        value: 50.0,
        sponsor: 'Platform',
        category: 'gift_card',
      },
    },
  });

  // Christmas Quiz prizes
  await prisma.prize.create({
    data: {
      roomId: christmasQuiz.id,
      name: 'Winner Prize - Gaming Mouse',
      description: 'Logitech G502 HERO Gaming Mouse',
      imageUrl: 'https://picsum.photos/seed/mouse/400/300',
      quantity: 1,
      quantityRemaining: 1,
      metadata: {
        value: 79.99,
        category: 'gaming',
      },
    },
  });

  console.log(`✓ Created ${4} prizes\n`);

  // ============================================================================
  // WINNERS
  // ============================================================================
  console.log('Creating winners...');

  // Simulate a winner selection for consolation prize
  await prisma.winner.create({
    data: {
      roomId: newYearLottery.id,
      participantId: bobLotteryParticipant.id,
      prizeId: consolationPrize.id,
      metadata: {
        drawNumber: 1,
        algorithm: 'random',
        timestamp: new Date().toISOString(),
        ticketDrawn: 42,
      },
    },
  });

  // Update prize quantity
  await prisma.prize.update({
    where: { id: consolationPrize.id },
    data: { quantityRemaining: 4 },
  });

  console.log(`✓ Created ${1} winner\n`);

  // ============================================================================
  // SESSIONS
  // ============================================================================
  console.log('Creating sessions...');

  const oneHourFromNow = new Date();
  oneHourFromNow.setHours(oneHourFromNow.getHours() + 1);

  await prisma.session.create({
    data: {
      userId: alice.id,
      refreshToken: 'test_refresh_token_alice_' + Date.now(),
      expiresAt: oneHourFromNow,
      deviceInfo: 'Chrome 120.0.0 on Windows 10',
      ipAddress: '192.168.1.100',
    },
  });

  await prisma.session.create({
    data: {
      userId: bob.id,
      refreshToken: 'test_refresh_token_bob_' + Date.now(),
      expiresAt: oneHourFromNow,
      deviceInfo: 'Firefox 121.0.0 on macOS',
      ipAddress: '192.168.1.101',
    },
  });

  console.log(`✓ Created ${2} sessions\n`);

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Database seeded successfully!\n');

  const stats = {
    users: await prisma.user.count(),
    apps: await prisma.app.count(),
    rooms: await prisma.room.count(),
    participants: await prisma.participant.count(),
    prizes: await prisma.prize.count(),
    winners: await prisma.winner.count(),
    sessions: await prisma.session.count(),
  };

  console.log('📊 Database Statistics:');
  console.log(`   Users:        ${stats.users}`);
  console.log(`   Apps:         ${stats.apps}`);
  console.log(`   Rooms:        ${stats.rooms}`);
  console.log(`   Participants: ${stats.participants}`);
  console.log(`   Prizes:       ${stats.prizes}`);
  console.log(`   Winners:      ${stats.winners}`);
  console.log(`   Sessions:     ${stats.sessions}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('🎯 Test Data Available:');
  console.log('   - Active lottery room: "New Year Lottery 2025"');
  console.log('   - Active quiz room: "Christmas Trivia Quiz"');
  console.log('   - Draft room: "Private Office Lottery (Draft)"');
  console.log('   - 4 test users (alice, bob, charlie, diana)');
  console.log('   - 2 registered apps (lottery, quiz)');
  console.log('   - Multiple prizes and 1 winner');
  console.log('\n💡 Next Steps:');
  console.log('   1. Run: npx prisma studio');
  console.log('   2. Browse and edit data visually');
  console.log('   3. Test API endpoints with seeded data\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
