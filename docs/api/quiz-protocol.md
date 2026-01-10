# Quiz WebSocket Protocol

Real-time protocol for the Quiz "Who's First?" application.

## Overview

The Quiz app uses WebSocket events for:
- Broadcasting questions to all participants simultaneously
- Receiving answers with precise timestamps
- Determining winners based on fastest correct answer
- Real-time leaderboard updates

**Game Mechanic:** Speed-based - first correct answer wins each round.

---

## Quiz Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        QUIZ LIFECYCLE                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. DRAFT                                                        │
│     └── Organizer creates quiz, adds questions                   │
│                                                                  │
│  2. ACTIVE (Room Status)                                         │
│     └── Organizer activates room, participants can join          │
│                                                                  │
│  3. WAITING (Quiz Status)                                        │
│     └── Quiz started, waiting for first question                 │
│                                                                  │
│  4. QUESTION_ACTIVE ◄───────────────────────┐                   │
│     └── Question displayed, accepting answers │                   │
│                                               │                   │
│  5. BETWEEN_ROUNDS ─────────────────────────┘                   │
│     └── Winner announced, preparing next question                │
│                                                                  │
│  6. FINISHED                                                     │
│     └── All questions answered, final leaderboard                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Client Events (Client → Server)

### quiz:start

Start the quiz session. Sent by organizer.

```javascript
socket.emit('quiz:start', { roomId: 'room_xyz789' });
```

**Payload:**
```json
{
  "roomId": "room_xyz789"
}
```

**Required Role:** Organizer

### quiz:show_question

Display a question to all participants. Sent by organizer.

```javascript
socket.emit('quiz:show_question', { roomId: 'room_xyz789', questionIndex: 0 });
```

**Payload:**
```json
{
  "roomId": "room_xyz789",
  "questionIndex": 0
}
```

**Required Role:** Organizer

### quiz:answer

Submit an answer. Sent by participants.

```javascript
socket.emit('quiz:answer', {
  roomId: 'room_xyz789',
  questionId: 'q_abc123',
  answerIndex: 2,
  timestamp: Date.now()
});
```

**Payload:**
```json
{
  "roomId": "room_xyz789",
  "questionId": "q_abc123",
  "answerIndex": 2,
  "timestamp": 1704628800000
}
```

**Required Role:** Participant

**Notes:**
- `timestamp` should use `Date.now()` for accurate response time calculation
- Only first correct answer wins - subsequent correct answers are ignored
- Organizers cannot submit answers

### quiz:end

End the quiz and show final results. Sent by organizer.

```javascript
socket.emit('quiz:end', { roomId: 'room_xyz789' });
```

**Payload:**
```json
{
  "roomId": "room_xyz789"
}
```

**Required Role:** Organizer

---

## Server Events (Server → Clients)

### quiz:question_shown

Broadcast when organizer displays a question.

```javascript
socket.on('quiz:question_shown', (data) => {
  console.log('Question:', data.question.text);
  console.log('Options:', data.question.options);
});
```

**Payload:**
```json
{
  "roomId": "room_xyz789",
  "question": {
    "id": "q_abc123",
    "text": "What is the capital of France?",
    "options": ["London", "Berlin", "Paris", "Madrid"],
    "timeLimit": 30
  },
  "questionIndex": 0,
  "totalQuestions": 10,
  "timestamp": "2025-01-15T10:00:00Z"
}
```

**Field Details:**

| Field | Type | Description |
|-------|------|-------------|
| `question.id` | string | Unique question identifier |
| `question.text` | string | The question text |
| `question.options` | string[] | Array of 4 answer options |
| `question.timeLimit` | number? | Optional time limit in seconds |
| `questionIndex` | number | 0-based index of current question |
| `totalQuestions` | number | Total number of questions in quiz |

**Note:** The correct answer index is NOT included to prevent cheating.

### quiz:answer_submitted

Broadcast when any participant submits an answer.

```javascript
socket.on('quiz:answer_submitted', (data) => {
  console.log(`${data.participantName} answered!`);
});
```

**Payload:**
```json
{
  "roomId": "room_xyz789",
  "participantId": "part_123abc",
  "participantName": "John Doe",
  "questionId": "q_abc123",
  "timestamp": "2025-01-15T10:00:05Z"
}
```

**Notes:**
- Does NOT reveal if answer was correct
- Use for visual feedback (e.g., showing who has answered)
- Helps create excitement/tension while waiting for winner

### quiz:round_winner

Broadcast when first correct answer is received.

```javascript
socket.on('quiz:round_winner', (data) => {
  console.log(`Winner: ${data.winner.participantName}`);
  console.log(`Response time: ${data.winner.responseTimeMs}ms`);
});
```

**Payload:**
```json
{
  "roomId": "room_xyz789",
  "winner": {
    "participantId": "part_123abc",
    "participantName": "John Doe",
    "questionId": "q_abc123",
    "responseTimeMs": 3245
  },
  "timestamp": "2025-01-15T10:00:05Z"
}
```

**Field Details:**

| Field | Type | Description |
|-------|------|-------------|
| `winner.participantId` | string | Winner's participant ID |
| `winner.participantName` | string | Winner's display name |
| `winner.questionId` | string | Question that was won |
| `winner.responseTimeMs` | number | Time from question shown to correct answer (ms) |

### quiz:status_changed

Broadcast when quiz transitions between states.

```javascript
socket.on('quiz:status_changed', (data) => {
  console.log('Quiz status:', data.quizStatus);
});
```

**Payload:**
```json
{
  "roomId": "room_xyz789",
  "quizStatus": "QUESTION_ACTIVE",
  "timestamp": "2025-01-15T10:00:00Z"
}
```

**Status Values:**

| Status | Description |
|--------|-------------|
| `WAITING` | Quiz started, waiting for first question |
| `QUESTION_ACTIVE` | Question displayed, accepting answers |
| `BETWEEN_ROUNDS` | Winner announced, preparing next |
| `FINISHED` | Quiz complete |

### quiz:finished

Broadcast when quiz ends with final leaderboard.

```javascript
socket.on('quiz:finished', (data) => {
  console.log('Final leaderboard:', data.leaderboard);
});
```

**Payload:**
```json
{
  "roomId": "room_xyz789",
  "leaderboard": [
    {
      "participantId": "part_123abc",
      "participantName": "John Doe",
      "wins": 5
    },
    {
      "participantId": "part_456def",
      "participantName": "Jane Smith",
      "wins": 3
    }
  ],
  "timestamp": "2025-01-15T10:15:00Z"
}
```

**Notes:**
- Leaderboard is sorted by wins (descending)
- Only participants with at least 1 win are included

---

## appSettings Schema

Quiz configuration stored in `room.appSettings`:

```typescript
interface QuizAppSettings {
  questions: QuizQuestion[];
  currentQuestionIndex: number;
  quizStatus: 'WAITING' | 'QUESTION_ACTIVE' | 'BETWEEN_ROUNDS' | 'FINISHED';
  questionShownAt?: string;
}

interface QuizQuestion {
  id: string;
  text: string;
  options: string[];      // Exactly 4 options
  correctIndex: number;   // 0-3
  timeLimit?: number;     // Optional, in seconds
}
```

**Example:**
```json
{
  "questions": [
    {
      "id": "q_abc123",
      "text": "What is 2 + 2?",
      "options": ["3", "4", "5", "6"],
      "correctIndex": 1,
      "timeLimit": 30
    },
    {
      "id": "q_def456",
      "text": "What is the capital of France?",
      "options": ["London", "Berlin", "Paris", "Madrid"],
      "correctIndex": 2
    }
  ],
  "currentQuestionIndex": -1,
  "quizStatus": "WAITING"
}
```

---

## Winner Record Metadata

When a participant wins a round, a `Winner` record is created with metadata:

```json
{
  "questionId": "q_abc123",
  "responseTimeMs": 3245,
  "answerIndex": 2,
  "submittedAt": "2025-01-15T10:00:05.245Z",
  "type": "quiz_round_win"
}
```

**Note:** Quiz rooms auto-create a "Quiz Point" prize. Each round win creates a Winner record linked to this prize for leaderboard tracking.

---

## Implementation Example

### React Hook (Participant View)

```typescript
import { useEffect, useState, useCallback } from 'react';
import { socket, subscribeToRoom, emitQuizAnswer } from '../lib/socket';

interface QuizState {
  status: string;
  currentQuestion: Question | null;
  leaderboard: LeaderboardEntry[];
  roundWinner: Winner | null;
}

export function useQuiz(roomId: string) {
  const [state, setState] = useState<QuizState>({
    status: 'WAITING',
    currentQuestion: null,
    leaderboard: [],
    roundWinner: null,
  });

  useEffect(() => {
    subscribeToRoom(roomId);

    // Listen for quiz events
    socket.on('quiz:question_shown', (data) => {
      setState(prev => ({
        ...prev,
        currentQuestion: data.question,
        roundWinner: null,
      }));
    });

    socket.on('quiz:round_winner', (data) => {
      setState(prev => ({
        ...prev,
        roundWinner: data.winner,
      }));
    });

    socket.on('quiz:status_changed', (data) => {
      setState(prev => ({
        ...prev,
        status: data.quizStatus,
      }));
    });

    socket.on('quiz:finished', (data) => {
      setState(prev => ({
        ...prev,
        status: 'FINISHED',
        leaderboard: data.leaderboard,
      }));
    });

    return () => {
      socket.off('quiz:question_shown');
      socket.off('quiz:round_winner');
      socket.off('quiz:status_changed');
      socket.off('quiz:finished');
    };
  }, [roomId]);

  const submitAnswer = useCallback((questionId: string, answerIndex: number) => {
    emitQuizAnswer(roomId, questionId, answerIndex);
  }, [roomId]);

  return { ...state, submitAnswer };
}
```

### Organizer Controls

```typescript
import { emitStartQuiz, emitShowQuestion, emitEndQuiz } from '../lib/socket';

function OrganizerControls({ roomId, questions, currentIndex }) {
  const startQuiz = () => emitStartQuiz(roomId);
  const showNextQuestion = () => emitShowQuestion(roomId, currentIndex + 1);
  const endQuiz = () => emitEndQuiz(roomId);

  return (
    <div>
      <button onClick={startQuiz}>Start Quiz</button>
      <button onClick={showNextQuestion}>Next Question</button>
      <button onClick={endQuiz}>End Quiz</button>
    </div>
  );
}
```

---

## Timing Considerations

### Response Time Calculation

```
responseTimeMs = client_timestamp - question_shown_timestamp
```

- Server stores `shownAt` when broadcasting question
- Client sends `Date.now()` with answer
- Difference gives response time in milliseconds

### WebSocket Latency

For fairness across different network conditions:
1. All participants receive question simultaneously via broadcast
2. Answers are timestamped on client side
3. Server validates timestamp is after question shown

### Race Conditions

The server handles concurrent answers:
1. First correct answer sets winner (in-memory flag)
2. Subsequent correct answers are ignored
3. Winner determination is atomic

---

## Error Handling

### Invalid Answer

Answer rejected if:
- Question not currently active
- User not a participant
- Answer already has winner
- Invalid answer index

### Permission Errors

| Action | Required Role |
|--------|---------------|
| Start quiz | Organizer |
| Show question | Organizer |
| Submit answer | Participant |
| End quiz | Organizer |

---

## Best Practices

### For Organizers

1. **Prepare questions in advance** - Add all questions before activating room
2. **Wait for participants** - Ensure enough people joined before starting
3. **Pace the quiz** - Give time between questions for celebration/discussion
4. **Use time limits** - Optional but adds pressure/excitement

### For Participants

1. **Stable connection** - WebSocket connection needed throughout
2. **Quick answers** - First correct wins, speed matters
3. **Stay focused** - Questions appear suddenly when active

### For Developers

1. **Handle all states** - UI should respond to all status transitions
2. **Show loading states** - Between question shown and winner announced
3. **Cache question** - Don't refetch from API during active quiz
4. **Test WebSocket** - Ensure reliable connection before quiz starts
