import type { Prize } from '@event-platform/sdk';

interface PrizeCardProps {
  prize: Prize;
}

export function PrizeCard({ prize }: PrizeCardProps) {
  const isExhausted = prize.quantityRemaining === 0;

  return (
    <div
      className={`bg-white rounded-lg shadow-sm p-4 ${
        isExhausted ? 'opacity-50' : ''
      }`}
    >
      {prize.imageUrl && (
        <img
          src={prize.imageUrl}
          alt={prize.name}
          className="w-full h-32 object-cover rounded-lg mb-3"
        />
      )}
      <h4 className="font-semibold text-gray-900">{prize.name}</h4>
      {prize.description && (
        <p className="text-sm text-gray-500 mt-1">{prize.description}</p>
      )}
      <div className="mt-2 text-sm">
        <span
          className={`font-medium ${
            isExhausted ? 'text-gray-400' : 'text-green-600'
          }`}
        >
          {prize.quantityRemaining}
        </span>
        <span className="text-gray-400"> / {prize.quantity} remaining</span>
      </div>
    </div>
  );
}
