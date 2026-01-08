interface LeaderboardEntry {
  participantId: string;
  participantName: string;
  wins: number;
}

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  currentUserId?: string;
  highlightWinner?: string;
}

export function Leaderboard({ entries, currentUserId, highlightWinner }: LeaderboardProps) {
  if (entries.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4">
        <h3 className="font-semibold text-gray-700 mb-3">Leaderboard</h3>
        <p className="text-gray-500 text-sm">No participants yet</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <h3 className="font-semibold text-gray-700 mb-3">Leaderboard</h3>
      <div className="space-y-2">
        {entries.map((entry, index) => {
          const isCurrentUser = entry.participantId === currentUserId;
          const isRoundWinner = entry.participantId === highlightWinner;

          return (
            <div
              key={entry.participantId}
              className={`flex items-center justify-between p-2 rounded-lg ${
                isRoundWinner
                  ? 'bg-yellow-100 animate-pulse'
                  : isCurrentUser
                  ? 'bg-purple-50'
                  : 'bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    index === 0
                      ? 'bg-yellow-400 text-yellow-900'
                      : index === 1
                      ? 'bg-gray-300 text-gray-700'
                      : index === 2
                      ? 'bg-amber-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {index + 1}
                </span>
                <span className={`text-sm ${isCurrentUser ? 'font-semibold' : ''}`}>
                  {entry.participantName}
                  {isCurrentUser && ' (you)'}
                </span>
              </div>
              <span className="font-bold text-purple-600">{entry.wins}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
