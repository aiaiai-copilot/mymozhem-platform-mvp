import { useState, useEffect, useCallback } from 'react';
import { platform } from '@/lib/platform';
import { socket, subscribeToRoom, unsubscribeFromRoom } from '@/lib/socket';
import type { RoomWithRelations, ParticipantWithUser, Prize, WinnerWithRelations } from '@event-platform/sdk';

interface RoomState {
  room: RoomWithRelations | null;
  participants: ParticipantWithUser[];
  prizes: Prize[];
  winners: WinnerWithRelations[];
  isLoading: boolean;
  error: string | null;
}

export function useRoom(roomId: string | undefined) {
  const [state, setState] = useState<RoomState>({
    room: null,
    participants: [],
    prizes: [],
    winners: [],
    isLoading: true,
    error: null,
  });

  // Fetch room data
  const fetchRoom = useCallback(async () => {
    if (!roomId) return;

    setState(s => ({ ...s, isLoading: true, error: null }));

    try {
      const [roomRes, participantsRes, prizesRes, winnersRes] = await Promise.all([
        platform.rooms.get(roomId),
        platform.participants.list(roomId),
        platform.prizes.list(roomId),
        platform.winners.list(roomId),
      ]);

      setState({
        room: roomRes.data ?? null,
        participants: participantsRes.data ?? [],
        prizes: prizesRes.data ?? [],
        winners: winnersRes.data ?? [],
        isLoading: false,
        error: null,
      });
    } catch (err) {
      setState(s => ({
        ...s,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load room',
      }));
    }
  }, [roomId]);

  // Subscribe to real-time events
  useEffect(() => {
    if (!roomId) return;

    fetchRoom();
    subscribeToRoom(roomId);

    // Real-time event handlers
    const handleParticipantJoined = (data: { participant: ParticipantWithUser }) => {
      setState(s => ({
        ...s,
        participants: [...s.participants, data.participant],
      }));
    };

    const handleParticipantLeft = (data: { participantId: string }) => {
      setState(s => ({
        ...s,
        participants: s.participants.filter(p => p.id !== data.participantId),
      }));
    };

    const handleWinnerSelected = (data: { winner: WinnerWithRelations }) => {
      setState(s => ({
        ...s,
        winners: [...s.winners, data.winner],
        prizes: s.prizes.map(p =>
          p.id === data.winner.prize.id
            ? { ...p, quantityRemaining: p.quantityRemaining - 1 }
            : p
        ),
      }));
    };

    const handlePrizeCreated = (data: { prize: Prize }) => {
      setState(s => ({
        ...s,
        prizes: [...s.prizes, data.prize],
      }));
    };

    socket.on('participant:joined', handleParticipantJoined);
    socket.on('participant:left', handleParticipantLeft);
    socket.on('winner:selected', handleWinnerSelected);
    socket.on('prize:created', handlePrizeCreated);

    return () => {
      unsubscribeFromRoom(roomId);
      socket.off('participant:joined', handleParticipantJoined);
      socket.off('participant:left', handleParticipantLeft);
      socket.off('winner:selected', handleWinnerSelected);
      socket.off('prize:created', handlePrizeCreated);
    };
  }, [roomId, fetchRoom]);

  return {
    ...state,
    refetch: fetchRoom,
  };
}
