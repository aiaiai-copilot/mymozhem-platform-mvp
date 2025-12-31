import { useState, useEffect } from 'react';
import { platform } from '@/lib/platform';
import { RoomCard } from '@/components/RoomCard';
import type { RoomWithRelations } from '@event-platform/sdk';

export function HomePage() {
  const [rooms, setRooms] = useState<RoomWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRooms() {
      try {
        const { data } = await platform.rooms.list({ isPublic: true });
        // Filter for lottery app rooms
        const lotteryRooms = (data ?? []).filter(
          (room) => room.appId === 'app_lottery_v1'
        );
        setRooms(lotteryRooms);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load rooms');
      } finally {
        setIsLoading(false);
      }
    }

    fetchRooms();
  }, []);

  if (isLoading) {
    return (
      <div className="text-center py-12 text-gray-500">Loading rooms...</div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-600">{error}</div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Public Lotteries</h1>

      {rooms.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No public lotteries available. Create one to get started!
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => (
            <RoomCard key={room.id} room={room} />
          ))}
        </div>
      )}
    </div>
  );
}
