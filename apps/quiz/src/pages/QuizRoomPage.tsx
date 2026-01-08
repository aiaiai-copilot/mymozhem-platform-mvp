import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useQuiz, QuizAppSettings } from '@/hooks/useQuiz';
import { platform } from '@/lib/platform';
import { socket } from '@/lib/socket';
import { QuestionCard } from '@/components/QuestionCard';
import { Leaderboard } from '@/components/Leaderboard';
import { QuizControls } from '@/components/QuizControls';
import { WinnerAnnouncement, FinalResults } from '@/components/WinnerAnnouncement';

export function QuizRoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    room,
    participants,
    isLoading,
    error,
    currentQuestion,
    questionIndex,
    totalQuestions,
    quizStatus,
    hasAnswered,
    myAnswer,
    roundWinner,
    leaderboard,
    submitAnswer,
    refetch,
  } = useQuiz(roomId);

  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  // Find current user's participant record
  const myParticipant = participants.find(p => p.userId === user?.id);
  const isOrganizer = myParticipant?.role === 'ORGANIZER';
  const isParticipant = !!myParticipant;

  // Join room
  const handleJoin = useCallback(async () => {
    if (!roomId) return;
    setActionLoading(true);
    setActionError('');
    try {
      await platform.participants.join(roomId);
      await refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to join');
    } finally {
      setActionLoading(false);
    }
  }, [roomId, refetch]);

  // Start quiz (organizer only)
  const handleStartQuiz = useCallback(async () => {
    if (!roomId || !room) return;
    setActionLoading(true);
    setActionError('');
    try {
      const appSettings = room.appSettings as QuizAppSettings;
      const questions = appSettings.questions || [];

      // Update room to start quiz
      await platform.rooms.update(roomId, {
        appSettings: {
          ...appSettings,
          currentQuestionIndex: 0,
          quizStatus: 'QUESTION_ACTIVE',
          questionShownAt: new Date().toISOString(),
        },
      });

      // Broadcast question to all participants
      socket.emit('quiz:show_question', {
        roomId,
        question: {
          id: questions[0].id,
          text: questions[0].text,
          options: questions[0].options,
          timeLimit: questions[0].timeLimit,
        },
        questionIndex: 0,
        totalQuestions: questions.length,
      });

      await refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to start quiz');
    } finally {
      setActionLoading(false);
    }
  }, [roomId, room, refetch]);

  // Next question (organizer only)
  const handleNextQuestion = useCallback(async () => {
    if (!roomId || !room) return;
    setActionLoading(true);
    setActionError('');
    try {
      const appSettings = room.appSettings as QuizAppSettings;
      const questions = appSettings.questions || [];
      const nextIndex = (appSettings.currentQuestionIndex || 0) + 1;

      if (nextIndex >= questions.length) {
        // Quiz finished
        await handleEndQuiz();
        return;
      }

      // Update room with next question
      await platform.rooms.update(roomId, {
        appSettings: {
          ...appSettings,
          currentQuestionIndex: nextIndex,
          quizStatus: 'QUESTION_ACTIVE',
          questionShownAt: new Date().toISOString(),
        },
      });

      // Broadcast question
      socket.emit('quiz:show_question', {
        roomId,
        question: {
          id: questions[nextIndex].id,
          text: questions[nextIndex].text,
          options: questions[nextIndex].options,
          timeLimit: questions[nextIndex].timeLimit,
        },
        questionIndex: nextIndex,
        totalQuestions: questions.length,
      });

      await refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to show next question');
    } finally {
      setActionLoading(false);
    }
  }, [roomId, room, refetch]);

  // End quiz (organizer only)
  const handleEndQuiz = useCallback(async () => {
    if (!roomId || !room) return;
    setActionLoading(true);
    setActionError('');
    try {
      const appSettings = room.appSettings as QuizAppSettings;

      // Update room status
      await platform.rooms.update(roomId, {
        appSettings: {
          ...appSettings,
          quizStatus: 'FINISHED',
        },
      });
      await platform.rooms.update(roomId, { status: 'COMPLETED' });

      // Broadcast finish
      socket.emit('quiz:finished', {
        roomId,
        leaderboard,
      });

      await refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to end quiz');
    } finally {
      setActionLoading(false);
    }
  }, [roomId, room, leaderboard, refetch]);

  // Submit answer
  const handleAnswer = useCallback(async (answerIndex: number) => {
    if (!roomId || !room || !myParticipant || !currentQuestion || hasAnswered) return;

    const timestamp = Date.now();
    submitAnswer(answerIndex);

    // Emit answer to server
    socket.emit('quiz:answer', {
      roomId,
      questionId: currentQuestion.id,
      answerIndex,
      timestamp,
      participantId: myParticipant.id,
      participantName: user?.name || user?.email || 'Unknown',
    });

    // Check if answer is correct (for organizer to process)
    const appSettings = room.appSettings as QuizAppSettings;
    const questionData = appSettings.questions?.find(q => q.id === currentQuestion.id);

    if (questionData && answerIndex === questionData.correctIndex && isOrganizer) {
      // This participant got it right - they win! (normally server would handle this)
      // For now, organizer broadcasts the winner
    }
  }, [roomId, room, myParticipant, currentQuestion, hasAnswered, submitAnswer, user, isOrganizer]);

  // Activate room (change from DRAFT to ACTIVE)
  const handleActivate = useCallback(async () => {
    if (!roomId) return;
    setActionLoading(true);
    try {
      await platform.rooms.update(roomId, { status: 'ACTIVE' });
      await refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to activate');
    } finally {
      setActionLoading(false);
    }
  }, [roomId, refetch]);

  // Delete room
  const handleDelete = useCallback(async () => {
    if (!roomId || !confirm('Are you sure you want to delete this quiz?')) return;
    setActionLoading(true);
    try {
      await platform.rooms.delete(roomId);
      navigate('/');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setActionLoading(false);
    }
  }, [roomId, navigate]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading quiz...</div>
      </div>
    );
  }

  // Error state
  if (error || !room) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">{error || 'Quiz not found'}</div>
        <button
          onClick={() => navigate('/')}
          className="text-purple-600 hover:text-purple-700"
        >
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main content */}
      <div className="lg:col-span-2 space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold">{room.name}</h1>
              {room.description && (
                <p className="text-gray-600 mt-1">{room.description}</p>
              )}
            </div>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                room.status === 'ACTIVE'
                  ? 'bg-green-100 text-green-800'
                  : room.status === 'COMPLETED'
                  ? 'bg-gray-100 text-gray-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}
            >
              {room.status}
            </span>
          </div>

          {/* Action error */}
          {actionError && (
            <div className="mt-4 bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {actionError}
            </div>
          )}

          {/* Room actions */}
          <div className="mt-4 flex flex-wrap gap-2">
            {/* Join button */}
            {!isParticipant && room.status === 'ACTIVE' && (
              <button
                onClick={handleJoin}
                disabled={actionLoading}
                className="bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {actionLoading ? 'Joining...' : 'Join Quiz'}
              </button>
            )}

            {/* Organizer: Activate room */}
            {isOrganizer && room.status === 'DRAFT' && (
              <button
                onClick={handleActivate}
                disabled={actionLoading}
                className="bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {actionLoading ? 'Activating...' : 'Activate Room'}
              </button>
            )}

            {/* Organizer: Delete */}
            {isOrganizer && room.status === 'DRAFT' && (
              <button
                onClick={handleDelete}
                disabled={actionLoading}
                className="bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Delete
              </button>
            )}
          </div>
        </div>

        {/* Quiz content based on status */}
        {quizStatus === 'WAITING' && room.status === 'ACTIVE' && (
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <div className="text-4xl mb-4">🎯</div>
            <h2 className="text-xl font-semibold mb-2">Waiting for Quiz to Start</h2>
            <p className="text-gray-600">
              {isOrganizer
                ? 'Click "Start Quiz" when all participants have joined.'
                : 'The organizer will start the quiz soon.'}
            </p>
            <p className="text-sm text-gray-500 mt-4">
              {participants.length} participant{participants.length !== 1 ? 's' : ''} ready
            </p>
          </div>
        )}

        {quizStatus === 'QUESTION_ACTIVE' && currentQuestion && (
          <QuestionCard
            question={currentQuestion}
            questionIndex={questionIndex}
            totalQuestions={totalQuestions}
            hasAnswered={hasAnswered}
            myAnswer={myAnswer}
            onAnswer={handleAnswer}
            disabled={!isParticipant || isOrganizer}
          />
        )}

        {quizStatus === 'BETWEEN_ROUNDS' && roundWinner && (
          <WinnerAnnouncement
            winner={roundWinner}
            isCurrentUser={roundWinner.participantId === myParticipant?.id}
          />
        )}

        {quizStatus === 'FINISHED' && (
          <FinalResults leaderboard={leaderboard} currentUserId={myParticipant?.id} />
        )}

        {room.status === 'DRAFT' && (
          <div className="bg-yellow-50 rounded-lg p-6 text-center">
            <div className="text-4xl mb-4">📝</div>
            <h2 className="text-xl font-semibold text-yellow-800 mb-2">Draft Mode</h2>
            <p className="text-yellow-700">
              {isOrganizer
                ? 'Activate the room to allow participants to join.'
                : 'This quiz is not yet active.'}
            </p>
          </div>
        )}
      </div>

      {/* Sidebar */}
      <div className="lg:col-span-1 space-y-4">
        {/* Quiz controls (organizer only) */}
        {isOrganizer && room.status === 'ACTIVE' && (
          <QuizControls
            quizStatus={quizStatus}
            questionIndex={questionIndex}
            totalQuestions={totalQuestions}
            onStartQuiz={handleStartQuiz}
            onNextQuestion={handleNextQuestion}
            onEndQuiz={handleEndQuiz}
            isLoading={actionLoading}
          />
        )}

        {/* Leaderboard */}
        <Leaderboard
          entries={leaderboard}
          currentUserId={myParticipant?.id}
          highlightWinner={roundWinner?.participantId}
        />

        {/* Participants count */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h3 className="font-semibold text-gray-700 mb-2">Participants</h3>
          <p className="text-2xl font-bold text-purple-600">{participants.length}</p>
        </div>
      </div>
    </div>
  );
}
