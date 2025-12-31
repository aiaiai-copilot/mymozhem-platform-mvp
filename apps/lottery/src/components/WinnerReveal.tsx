import type { WinnerWithRelations } from '@event-platform/sdk';

interface WinnerRevealProps {
  winners: WinnerWithRelations[];
}

export function WinnerReveal({ winners }: WinnerRevealProps) {
  if (winners.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-500">
        No winners yet. Draw to select winners!
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg p-6">
      <h3 className="font-bold text-lg text-amber-800 mb-4 text-center">
        Winners
      </h3>
      <div className="space-y-3">
        {winners.map((winner) => (
          <div
            key={winner.id}
            className="bg-white rounded-lg p-4 shadow-sm flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 text-xl">
              {winner.participant?.user?.name?.[0] || '?'}
            </div>
            <div className="flex-1">
              <div className="font-semibold text-gray-900">
                {winner.participant?.user?.name || 'Anonymous'}
              </div>
              <div className="text-sm text-amber-600">
                Won: {winner.prize?.name}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
