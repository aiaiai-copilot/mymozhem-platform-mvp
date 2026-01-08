import { useState, useEffect, useCallback } from 'react';
import { platform } from '@/lib/platform';
import { socket, subscribeToRoom, unsubscribeFromRoom } from '@/lib/socket';
import type { RoomWithRelations, ParticipantWithUser, WinnerWithRelations } from '@event-platform/sdk';

// Quiz-specific types
export interface QuizQuestion {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  timeLimit?: number;
}

export interface QuizAppSettings {
  questions: QuizQuestion[];
  currentQuestionIndex: number;
  quizStatus: 'WAITING' | 'QUESTION_ACTIVE' | 'BETWEEN_ROUNDS' | 'FINISHED';
  questionShownAt?: string;
}

interface QuizState {
  room: RoomWithRelations | null;
  participants: ParticipantWithUser[];
  winners: WinnerWithRelations[];
  isLoading: boolean;
  error: string | null;
  // Quiz-specific state
  currentQuestion: QuizQuestion | null;
  questionIndex: number;
  totalQuestions: number;
  quizStatus: QuizAppSettings['quizStatus'];
  hasAnswered: boolean;
  myAnswer: number | null;
  roundWinner: { participantId: string; participantName: string } | null;
  leaderboard: Array<{ participantId: string; participantName: string; wins: number }>;
}

export function useQuiz(roomId: string | undefined) {
  const [state, setState] = useState<QuizState>({
    room: null,
    participants: [],
    winners: [],
    isLoading: true,
    error: null,
    currentQuestion: null,
    questionIndex: -1,
    totalQuestions: 0,
    quizStatus: 'WAITING',
    hasAnswered: false,
    myAnswer: null,
    roundWinner: null,
    leaderboard: [],
  });

  // Calculate leaderboard from winners
  const calculateLeaderboard = useCallback((winners: WinnerWithRelations[], participants: ParticipantWithUser[]) => {
    const winCounts = new Map<string, number>();

    winners.forEach(w => {
      const count = winCounts.get(w.participantId) || 0;
      winCounts.set(w.participantId, count + 1);
    });

    return participants
      .map(p => ({
        participantId: p.id,
        participantName: p.user?.name || 'Unknown',
        wins: winCounts.get(p.id) || 0,
      }))
      .sort((a, b) => b.wins - a.wins);
  }, []);

  // Fetch room data
  const fetchRoom = useCallback(async () => {
    if (!roomId) return;

    try {
      const [roomRes, participantsRes, winnersRes] = await Promise.all([
        platform.rooms.get(roomId),
        platform.participants.list(roomId),
        platform.winners.list(roomId),
      ]);

      const room = roomRes.data;
      const participants = participantsRes.data || [];
      const winners = winnersRes.data || [];

      if (room) {
        const appSettings = room.appSettings as QuizAppSettings | null;
        const questions = appSettings?.questions || [];
        const currentIndex = appSettings?.currentQuestionIndex ?? -1;

        setState(s => ({
          ...s,
          room,
          participants,
          winners,
          isLoading: false,
          error: null,
          currentQuestion: currentIndex >= 0 ? questions[currentIndex] : null,
          questionIndex: currentIndex,
          totalQuestions: questions.length,
          quizStatus: appSettings?.quizStatus || 'WAITING',
          leaderboard: calculateLeaderboard(winners, participants),
        }));
      }
    } catch (err) {
      setState(s => ({
        ...s,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load quiz',
      }));
    }
  }, [roomId, calculateLeaderboard]);

  // Set up WebSocket listeners
  useEffect(() => {
    if (!roomId) return;

    fetchRoom();
    subscribeToRoom(roomId);

    // Participant events
    const handleParticipantJoined = (data: { participant: ParticipantWithUser }) => {
      setState(s => ({
        ...s,
        participants: [...s.participants, data.participant],
        leaderboard: calculateLeaderboard(s.winners, [...s.participants, data.participant]),
      }));
    };

    const handleParticipantLeft = (data: { participantId: string }) => {
      setState(s => ({
        ...s,
        participants: s.participants.filter(p => p.id !== data.participantId),
      }));
    };

    // Quiz events
    const handleQuestionShown = (data: {
      question: { id: string; text: string; options: string[]; timeLimit?: number };
      questionIndex: number;
      totalQuestions: number;
    }) => {
      setState(s => ({
        ...s,
        currentQuestion: { ...data.question, correctIndex: -1 }, // Don't expose correct answer to clients
        questionIndex: data.questionIndex,
        totalQuestions: data.totalQuestions,
        quizStatus: 'QUESTION_ACTIVE',
        hasAnswered: false,
        myAnswer: null,
        roundWinner: null,
      }));
    };

    const handleAnswerSubmitted = (data: { participantId: string; participantName: string }) => {
      // Show that someone answered (could add visual feedback)
      console.log(`${data.participantName} answered!`);
    };

    const handleRoundWinner = (data: {
      winner: { participantId: string; participantName: string; questionId: string; responseTimeMs: number };
    }) => {
      setState(s => ({
        ...s,
        quizStatus: 'BETWEEN_ROUNDS',
        roundWinner: {
          participantId: data.winner.participantId,
          participantName: data.winner.participantName,
        },
      }));
    };

    const handleWinnerSelected = (data: { winner: WinnerWithRelations }) => {
      setState(s => {
        const newWinners = [...s.winners, data.winner];
        return {
          ...s,
          winners: newWinners,
          leaderboard: calculateLeaderboard(newWinners, s.participants),
        };
      });
    };

    const handleQuizStatusChanged = (data: { quizStatus: QuizAppSettings['quizStatus'] }) => {
      setState(s => ({
        ...s,
        quizStatus: data.quizStatus,
        // Reset round-specific state when going back to waiting
        ...(data.quizStatus === 'WAITING' ? { hasAnswered: false, myAnswer: null, roundWinner: null } : {}),
      }));
    };

    const handleQuizFinished = (data: {
      leaderboard: Array<{ participantId: string; participantName: string; wins: number }>;
    }) => {
      setState(s => ({
        ...s,
        quizStatus: 'FINISHED',
        leaderboard: data.leaderboard,
      }));
    };

    const handleRoomUpdated = (data: { room: RoomWithRelations }) => {
      const appSettings = data.room.appSettings as QuizAppSettings | null;
      setState(s => ({
        ...s,
        room: data.room,
        quizStatus: appSettings?.quizStatus || s.quizStatus,
      }));
    };

    const handleRoomStatusChanged = (data: { newStatus: string }) => {
      setState(s => ({
        ...s,
        room: s.room ? { ...s.room, status: data.newStatus as RoomWithRelations['status'] } : null,
      }));
    };

    // Register listeners
    socket.on('participant:joined', handleParticipantJoined);
    socket.on('participant:left', handleParticipantLeft);
    socket.on('quiz:question_shown', handleQuestionShown);
    socket.on('quiz:answer_submitted', handleAnswerSubmitted);
    socket.on('quiz:round_winner', handleRoundWinner);
    socket.on('winner:selected', handleWinnerSelected);
    socket.on('quiz:status_changed', handleQuizStatusChanged);
    socket.on('quiz:finished', handleQuizFinished);
    socket.on('room:updated', handleRoomUpdated);
    socket.on('room:status_changed', handleRoomStatusChanged);

    return () => {
      unsubscribeFromRoom(roomId);
      socket.off('participant:joined', handleParticipantJoined);
      socket.off('participant:left', handleParticipantLeft);
      socket.off('quiz:question_shown', handleQuestionShown);
      socket.off('quiz:answer_submitted', handleAnswerSubmitted);
      socket.off('quiz:round_winner', handleRoundWinner);
      socket.off('winner:selected', handleWinnerSelected);
      socket.off('quiz:status_changed', handleQuizStatusChanged);
      socket.off('quiz:finished', handleQuizFinished);
      socket.off('room:updated', handleRoomUpdated);
      socket.off('room:status_changed', handleRoomStatusChanged);
    };
  }, [roomId, fetchRoom, calculateLeaderboard]);

  // Submit answer
  const submitAnswer = useCallback((answerIndex: number) => {
    setState(s => ({
      ...s,
      hasAnswered: true,
      myAnswer: answerIndex,
    }));
  }, []);

  return {
    ...state,
    refetch: fetchRoom,
    submitAnswer,
  };
}
