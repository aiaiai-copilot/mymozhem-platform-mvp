import type { ParticipantWithUser } from '@event-platform/sdk';

interface ParticipantListProps {
  participants: ParticipantWithUser[];
  winnersParticipantIds?: string[];
}

export function ParticipantList({ participants, winnersParticipantIds = [] }: ParticipantListProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <h3 className="font-semibold text-gray-900 mb-3">
        Participants ({participants.length})
      </h3>
      <ul className="space-y-2">
        {participants.map((participant) => {
          const isWinner = winnersParticipantIds.includes(participant.id);
          return (
            <li
              key={participant.id}
              className={`flex items-center gap-3 p-2 rounded ${
                isWinner ? 'bg-yellow-50' : ''
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium">
                {participant.user?.name?.[0] || '?'}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">
                  {participant.user?.name || 'Anonymous'}
                  {isWinner && <span className="ml-2 text-yellow-600">Winner!</span>}
                </div>
                <div className="text-xs text-gray-500">{participant.role}</div>
              </div>
            </li>
          );
        })}
        {participants.length === 0 && (
          <li className="text-gray-500 text-sm">No participants yet</li>
        )}
      </ul>
    </div>
  );
}
