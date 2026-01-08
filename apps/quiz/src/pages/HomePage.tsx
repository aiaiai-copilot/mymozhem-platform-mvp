import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { platform } from '@/lib/platform';
import type { RoomWithRelations } from '@event-platform/sdk';

export function HomePage() {
  const [rooms, setRooms] = useState<RoomWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const { data } = await platform.rooms.list({ isPublic: true });
        // Filter to only show quiz rooms
        const quizRooms = (data || []).filter(room => room.appId === 'app_quiz_v1');
        setRooms(quizRooms);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load quizzes');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRooms();
  }, []);

  if (isLoading) {
    return <div className="text-center py-12 text-gray-500">Loading quizzes...</div>;
  }

  if (error) {
    return <div className="text-center py-12 text-red-500">{error}</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Public Quizzes</h1>
        <Link
          to="/create"
          className="bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700"
        >
          Create Quiz
        </Link>
      </div>

      {rooms.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No public quizzes available. Create one to get started!
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => (
            <QuizCard key={room.id} room={room} />
          ))}
        </div>
      )}
    </div>
  );
}

function QuizCard({ room }: { room: RoomWithRelations }) {
  const statusColor = {
    DRAFT: 'bg-yellow-100 text-yellow-800',
    ACTIVE: 'bg-green-100 text-green-800',
    COMPLETED: 'bg-gray-100 text-gray-800',
    CANCELLED: 'bg-red-100 text-red-800',
  }[room.status] || 'bg-gray-100 text-gray-800';

  const questionCount = (room.appSettings as { questions?: unknown[] })?.questions?.length || 0;

  return (
    <Link
      to={`/quiz/${room.id}`}
      className="block bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-lg">{room.name}</h3>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>
          {room.status}
        </span>
      </div>
      {room.description && (
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">{room.description}</p>
      )}
      <div className="flex items-center gap-4 text-sm text-gray-500">
        <span>{questionCount} questions</span>
        <span>{room._count?.participants || 0} participants</span>
      </div>
    </Link>
  );
}
