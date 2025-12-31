import { useState } from 'react';
import { platform } from '@/lib/platform';
import type { ParticipantWithUser, Prize } from '@event-platform/sdk';

interface DrawButtonProps {
  roomId: string;
  participants: ParticipantWithUser[];
  prizes: Prize[];
  onDraw?: () => void;
}

export function DrawButton({ roomId, participants, prizes, onDraw }: DrawButtonProps) {
  const [isDrawing, setIsDrawing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter eligible participants (only PARTICIPANT role, not already winners)
  const eligibleParticipants = participants.filter(
    (p) => p.role === 'PARTICIPANT'
  );

  // Filter available prizes
  const availablePrizes = prizes.filter((p) => p.quantityRemaining > 0);

  const canDraw = eligibleParticipants.length > 0 && availablePrizes.length > 0;

  const handleDraw = async () => {
    if (!canDraw) return;

    setIsDrawing(true);
    setError(null);

    try {
      // Random selection
      const randomIndex = Math.floor(Math.random() * eligibleParticipants.length);
      const winner = eligibleParticipants[randomIndex];
      const prize = availablePrizes[0]; // First available prize

      if (!winner || !prize) {
        throw new Error('No eligible participants or prizes');
      }

      // Register winner via platform API
      await platform.winners.select(roomId, {
        participantId: winner.id,
        prizeId: prize.id,
        metadata: {
          algorithm: 'random',
          drawnAt: new Date().toISOString(),
        },
      });

      onDraw?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to draw winner');
    } finally {
      setIsDrawing(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={handleDraw}
        disabled={!canDraw || isDrawing}
        className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition-colors ${
          canDraw && !isDrawing
            ? 'bg-indigo-600 hover:bg-indigo-700'
            : 'bg-gray-400 cursor-not-allowed'
        }`}
      >
        {isDrawing ? (
          'Drawing...'
        ) : !canDraw ? (
          eligibleParticipants.length === 0
            ? 'No eligible participants'
            : 'No prizes available'
        ) : (
          `Draw Winner (${eligibleParticipants.length} eligible)`
        )}
      </button>
      {error && <p className="text-red-600 text-sm text-center">{error}</p>}
    </div>
  );
}
