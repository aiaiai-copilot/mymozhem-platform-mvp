import { Link } from 'react-router-dom';
import type { RoomWithRelations } from '@event-platform/sdk';

interface RoomCardProps {
  room: RoomWithRelations;
}

export function RoomCard({ room }: RoomCardProps) {
  const participantCount = room._count?.participants ?? room.participants?.length ?? 0;
  const prizeCount = room._count?.prizes ?? room.prizes?.length ?? 0;

  return (
    <Link
      to={`/room/${room.id}`}
      className="block bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6"
    >
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{room.name}</h3>
          {room.description && (
            <p className="text-gray-500 text-sm mt-1">{room.description}</p>
          )}
        </div>
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full ${
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
      <div className="mt-4 flex gap-4 text-sm text-gray-500">
        <span>{participantCount} participants</span>
        <span>{prizeCount} prizes</span>
      </div>
      <div className="mt-2 text-xs text-gray-400">
        Organized by {room.organizer?.name || 'Unknown'}
      </div>
    </Link>
  );
}
