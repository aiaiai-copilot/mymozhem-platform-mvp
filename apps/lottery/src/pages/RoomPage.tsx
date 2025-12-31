import { useParams, useNavigate } from 'react-router-dom';
import { useRoom } from '@/hooks/useRoom';
import { useAuth } from '@/hooks/useAuth';
import { ParticipantList } from '@/components/ParticipantList';
import { PrizeCard } from '@/components/PrizeCard';
import { DrawButton } from '@/components/DrawButton';
import { WinnerReveal } from '@/components/WinnerReveal';
import { platform } from '@/lib/platform';
import { useState } from 'react';

export function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { room, participants, prizes, winners, isLoading, error, refetch } = useRoom(roomId);
  const { user, isAuthenticated } = useAuth();
  const [joining, setJoining] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);

  if (isLoading) {
    return <div className="text-center py-12 text-gray-500">Loading room...</div>;
  }

  if (error || !room) {
    return <div className="text-center py-12 text-red-600">{error || 'Room not found'}</div>;
  }

  const isOrganizer = room.createdBy === user?.id;
  const isParticipant = participants.some((p) => p.userId === user?.id);
  const winnerParticipantIds = winners.map((w) => w.participantId);

  const handleJoin = async () => {
    if (!roomId) return;
    setJoining(true);
    try {
      await platform.participants.join(roomId);
      refetch();
    } catch (err) {
      console.error('Failed to join:', err);
    } finally {
      setJoining(false);
    }
  };

  const handleDelete = async () => {
    if (!roomId) return;

    if (!confirm('Are you sure you want to delete this lottery? This action cannot be undone.')) {
      return;
    }

    setDeleting(true);
    try {
      await platform.rooms.delete(roomId);
      navigate('/');
    } catch (err) {
      console.error('Failed to delete room:', err);
      alert('Failed to delete room. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const handleStatusChange = async (newStatus: 'DRAFT' | 'ACTIVE' | 'COMPLETED') => {
    if (!roomId) return;

    const confirmMessage =
      newStatus === 'ACTIVE'
        ? 'Start the lottery? Participants will be able to join and see prizes.'
        : newStatus === 'COMPLETED'
        ? 'Mark lottery as completed? No more winners can be drawn.'
        : 'Change status to DRAFT?';

    if (!confirm(confirmMessage)) {
      return;
    }

    setChangingStatus(true);
    try {
      await platform.rooms.update(roomId, { status: newStatus });
      refetch();
    } catch (err) {
      console.error('Failed to change status:', err);
      alert('Failed to change status. Please try again.');
    } finally {
      setChangingStatus(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Room Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{room.name}</h1>
            {room.description && (
              <p className="text-gray-500 mt-1">{room.description}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1 text-sm font-medium rounded-full ${
                room.status === 'ACTIVE'
                  ? 'bg-green-100 text-green-800'
                  : room.status === 'COMPLETED'
                  ? 'bg-gray-100 text-gray-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}
            >
              {room.status}
            </span>
            {/* Status change buttons for organizers */}
            {isOrganizer && room.status === 'DRAFT' && (
              <button
                onClick={() => handleStatusChange('ACTIVE')}
                disabled={changingStatus}
                className="px-4 py-1 text-sm text-green-600 border border-green-600 rounded-lg hover:bg-green-50 disabled:opacity-50"
              >
                {changingStatus ? 'Starting...' : 'Start Lottery'}
              </button>
            )}
            {isOrganizer && room.status === 'ACTIVE' && (
              <button
                onClick={() => handleStatusChange('COMPLETED')}
                disabled={changingStatus}
                className="px-4 py-1 text-sm text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 disabled:opacity-50"
              >
                {changingStatus ? 'Completing...' : 'Complete Lottery'}
              </button>
            )}
            {/* Delete button for organizers */}
            {isOrganizer && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-1 text-sm text-red-600 border border-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            )}
          </div>
        </div>

        {/* Join button for non-participants */}
        {isAuthenticated && !isParticipant && !isOrganizer && room.status === 'ACTIVE' && (
          <button
            onClick={handleJoin}
            disabled={joining}
            className="mt-4 bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {joining ? 'Joining...' : 'Join Lottery'}
          </button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Prizes */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Prizes</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {prizes.map((prize) => (
                <PrizeCard key={prize.id} prize={prize} />
              ))}
              {prizes.length === 0 && (
                <p className="text-gray-500 col-span-2">No prizes added yet</p>
              )}
            </div>
          </div>

          {/* Winners */}
          <WinnerReveal winners={winners} />

          {/* Draw button for organizers */}
          {isOrganizer && room.status === 'ACTIVE' && (
            <DrawButton
              roomId={room.id}
              participants={participants}
              prizes={prizes}
              onDraw={refetch}
            />
          )}
        </div>

        {/* Sidebar */}
        <div>
          <ParticipantList
            participants={participants}
            winnersParticipantIds={winnerParticipantIds}
          />
        </div>
      </div>
    </div>
  );
}
