import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { platform } from '@/lib/platform';
import { useAuth } from '@/hooks/useAuth';

export function CreateRoomPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Default to 1 week from now
  const getDefaultDrawDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString().slice(0, 16); // Format for datetime-local input
  };

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isPublic: true,
    ticketCount: 100,
    drawDate: getDefaultDrawDate(),
  });

  if (!isAuthenticated) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">Please login to create a lottery</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Convert datetime-local format to ISO string
      const drawDateISO = new Date(formData.drawDate).toISOString();

      const { data } = await platform.rooms.create({
        name: formData.name,
        description: formData.description || undefined,
        appId: 'app_lottery_v1',
        isPublic: formData.isPublic,
        appSettings: {
          ticketCount: formData.ticketCount,
          drawDate: drawDateISO,
        },
      });

      if (data) {
        navigate(`/room/${data.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create room');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create Lottery</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Lottery Name *
          </label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2 border"
            required
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2 border"
          />
        </div>

        <div>
          <label htmlFor="ticketCount" className="block text-sm font-medium text-gray-700">
            Number of Tickets *
          </label>
          <input
            type="number"
            id="ticketCount"
            value={formData.ticketCount}
            onChange={(e) => setFormData({ ...formData, ticketCount: parseInt(e.target.value) || 1 })}
            min="1"
            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2 border"
            required
          />
        </div>

        <div>
          <label htmlFor="drawDate" className="block text-sm font-medium text-gray-700">
            Draw Date & Time *
          </label>
          <input
            type="datetime-local"
            id="drawDate"
            value={formData.drawDate}
            onChange={(e) => setFormData({ ...formData, drawDate: e.target.value })}
            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2 border"
            required
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isPublic"
            checked={formData.isPublic}
            onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <label htmlFor="isPublic" className="text-sm text-gray-700">
            Make this lottery public
          </label>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          {isLoading ? 'Creating...' : 'Create Lottery'}
        </button>
      </form>
    </div>
  );
}
