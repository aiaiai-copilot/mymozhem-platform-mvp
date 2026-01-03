/**
 * WebSocket Integration Test
 *
 * Tests Socket.io real-time event functionality
 */

import { io } from 'socket.io-client';

const PLATFORM_URL = 'http://localhost:3000';
const TEST_USER_EMAIL = 'alice@example.com';
const TEST_USER_PASSWORD = 'password123';

let authToken = null;
let socket = null;
let testResults = {
  passed: [],
  failed: [],
};

// Helper: Log test result
function logTest(name, passed, details = '') {
  if (passed) {
    testResults.passed.push(name);
    console.log(`✅ ${name}${details ? `: ${details}` : ''}`);
  } else {
    testResults.failed.push(name);
    console.log(`❌ ${name}${details ? `: ${details}` : ''}`);
  }
}

// Helper: Login and get JWT token
async function login() {
  console.log('\n🔐 Authenticating...');
  const response = await fetch(`${PLATFORM_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
    }),
  });

  const data = await response.json();
  if (data.data?.accessToken) {
    authToken = data.data.accessToken;
    logTest('Login successful', true, `Token: ${authToken.substring(0, 20)}...`);
    return true;
  }

  logTest('Login successful', false, 'No token received');
  return false;
}

// Helper: Get an existing test room
async function getTestRoom() {
  console.log('\n🏠 Getting test room...');
  const response = await fetch(`${PLATFORM_URL}/api/v1/rooms?page=1&limit=10`);

  if (!response.ok) {
    logTest('Room found', false, `HTTP ${response.status}`);
    return null;
  }

  const data = await response.json();
  console.log('API Response:', data.data?.length || 0, 'rooms');

  if (data.data && data.data.length > 0) {
    const room = data.data[0];
    logTest('Room found', true, `Room ID: ${room.id}, Name: ${room.name}`);
    return room.id;
  }

  logTest('Room found', false, 'No rooms available');
  return null;
}

// Test 1: WebSocket Connection with Authentication
async function testConnection() {
  console.log('\n📡 Test 1: WebSocket Connection & Authentication');

  return new Promise((resolve) => {
    socket = io(PLATFORM_URL, {
      auth: { token: authToken },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      logTest('WebSocket connection established', true, `Socket ID: ${socket.id}`);
      resolve(true);
    });

    socket.on('connect_error', (error) => {
      logTest('WebSocket connection established', false, error.message);
      resolve(false);
    });

    setTimeout(() => {
      if (!socket.connected) {
        logTest('WebSocket connection established', false, 'Timeout');
        resolve(false);
      }
    }, 5000);
  });
}

// Test 2: Room Subscription
async function testRoomSubscription(roomId) {
  console.log('\n🔔 Test 2: Room Subscription');

  return new Promise((resolve) => {
    let subscriptionConfirmed = false;

    socket.on('room:subscribed', (data) => {
      if (data.roomId === roomId) {
        subscriptionConfirmed = true;
        logTest('Room subscription confirmed', true, `Subscribed to room: ${roomId}`);
      }
    });

    socket.emit('room:subscribe', { roomId }, (response) => {
      if (response.success) {
        logTest('Room subscription request accepted', true);
        setTimeout(() => {
          if (subscriptionConfirmed) {
            resolve(true);
          } else {
            logTest('Room subscription confirmed', false, 'No confirmation event received');
            resolve(false);
          }
        }, 1000);
      } else {
        logTest('Room subscription request accepted', false, response.error?.message);
        resolve(false);
      }
    });

    setTimeout(() => {
      if (!subscriptionConfirmed) {
        logTest('Room subscription', false, 'Timeout waiting for subscription');
        resolve(false);
      }
    }, 5000);
  });
}

// Test 3: Participant Joined Event
async function testParticipantJoinedEvent(roomId) {
  console.log('\n👥 Test 3: Participant Joined Event');

  return new Promise(async (resolve) => {
    let eventReceived = false;

    socket.on('participant:joined', (data) => {
      if (data.roomId === roomId) {
        eventReceived = true;
        logTest('Participant joined event received', true, `Participant: ${data.participant?.user?.name || 'Unknown'}`);
        resolve(true);
      }
    });

    // Join the room via REST API (should trigger WebSocket event)
    const response = await fetch(`${PLATFORM_URL}/api/v1/rooms/${roomId}/participants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
    });

    if (response.status === 409) {
      logTest('Participant already in room', true, 'Using existing participation');
      resolve(true);
      return;
    }

    if (!response.ok) {
      logTest('Join room API call', false, `HTTP ${response.status}`);
      resolve(false);
      return;
    }

    logTest('Join room API call', true);

    setTimeout(() => {
      if (!eventReceived) {
        logTest('Participant joined event received', false, 'Event not received within timeout');
        resolve(false);
      }
    }, 3000);
  });
}

// Test 4: Prize Created Event
async function testPrizeCreatedEvent(roomId) {
  console.log('\n🎁 Test 4: Prize Created Event');

  return new Promise(async (resolve) => {
    let eventReceived = false;

    socket.on('prize:created', (data) => {
      if (data.roomId === roomId) {
        eventReceived = true;
        logTest('Prize created event received', true, `Prize: ${data.prize?.name || 'Unknown'}`);
        resolve(true);
      }
    });

    // Create a prize via REST API (should trigger WebSocket event)
    const response = await fetch(`${PLATFORM_URL}/api/v1/rooms/${roomId}/prizes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        name: 'WebSocket Test Prize',
        description: 'Testing real-time prize creation',
        quantity: 1,
      }),
    });

    if (!response.ok) {
      logTest('Create prize API call', false, `HTTP ${response.status}`);
      resolve(false);
      return;
    }

    logTest('Create prize API call', true);

    setTimeout(() => {
      if (!eventReceived) {
        logTest('Prize created event received', false, 'Event not received within timeout');
        resolve(false);
      }
    }, 3000);
  });
}

// Test 5: Room Unsubscription
async function testRoomUnsubscription(roomId) {
  console.log('\n🔕 Test 5: Room Unsubscription');

  return new Promise((resolve) => {
    let unsubscriptionConfirmed = false;

    socket.on('room:unsubscribed', (data) => {
      if (data.roomId === roomId) {
        unsubscriptionConfirmed = true;
        logTest('Room unsubscription confirmed', true);
      }
    });

    socket.emit('room:unsubscribe', { roomId });

    setTimeout(() => {
      if (unsubscriptionConfirmed) {
        resolve(true);
      } else {
        logTest('Room unsubscription confirmed', false, 'No confirmation event received');
        resolve(false);
      }
    }, 2000);
  });
}

// Main test runner
async function runTests() {
  console.log('🧪 WebSocket Integration Tests\n');
  console.log('Platform:', PLATFORM_URL);
  console.log('Test user:', TEST_USER_EMAIL);

  try {
    // Step 1: Login
    const loginSuccess = await login();
    if (!loginSuccess) {
      console.error('\n❌ Authentication failed. Cannot proceed with tests.');
      process.exit(1);
    }

    // Step 2: Get test room
    const roomId = await getTestRoom();
    if (!roomId) {
      console.error('\n❌ No test room available. Cannot proceed with tests.');
      process.exit(1);
    }

    // Step 3: Test WebSocket connection
    const connectionSuccess = await testConnection();
    if (!connectionSuccess) {
      console.error('\n❌ WebSocket connection failed. Cannot proceed with tests.');
      process.exit(1);
    }

    // Step 4: Test room subscription
    await testRoomSubscription(roomId);

    // Step 5: Test participant joined event
    await testParticipantJoinedEvent(roomId);

    // Step 6: Test prize created event
    await testPrizeCreatedEvent(roomId);

    // Step 7: Test room unsubscription
    await testRoomUnsubscription(roomId);

    // Cleanup
    socket.disconnect();

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Test Summary');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${testResults.passed.length}`);
    console.log(`❌ Failed: ${testResults.failed.length}`);
    console.log('='.repeat(60));

    if (testResults.passed.length > 0) {
      console.log('\n✅ Passed tests:');
      testResults.passed.forEach(test => console.log(`   - ${test}`));
    }

    if (testResults.failed.length > 0) {
      console.log('\n❌ Failed tests:');
      testResults.failed.forEach(test => console.log(`   - ${test}`));
    }

    console.log('\n');
    process.exit(testResults.failed.length > 0 ? 1 : 0);

  } catch (error) {
    console.error('\n💥 Test suite error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
runTests();
