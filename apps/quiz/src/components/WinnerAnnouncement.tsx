interface WinnerAnnouncementProps {
  winner: {
    participantId: string;
    participantName: string;
  };
  isCurrentUser: boolean;
}

export function WinnerAnnouncement({ winner, isCurrentUser }: WinnerAnnouncementProps) {
  return (
    <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg p-6 text-center border-2 border-yellow-200">
      <div className="text-4xl mb-2">
        {isCurrentUser ? '🎉' : '👏'}
      </div>
      <h3 className="text-xl font-bold text-yellow-800 mb-1">
        {isCurrentUser ? 'You Win This Round!' : 'Round Winner!'}
      </h3>
      <p className="text-lg text-yellow-700">
        {winner.participantName}
      </p>
      {isCurrentUser && (
        <p className="text-sm text-yellow-600 mt-2">
          You were the first to answer correctly!
        </p>
      )}
    </div>
  );
}

interface FinalResultsProps {
  leaderboard: Array<{
    participantId: string;
    participantName: string;
    wins: number;
  }>;
  currentUserId?: string;
}

export function FinalResults({ leaderboard, currentUserId }: FinalResultsProps) {
  const winner = leaderboard[0];
  const isCurrentUserWinner = winner?.participantId === currentUserId;

  return (
    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-6 text-center border-2 border-purple-200">
      <div className="text-5xl mb-3">🏆</div>
      <h2 className="text-2xl font-bold text-purple-800 mb-4">Quiz Complete!</h2>

      {winner && (
        <div className="mb-6">
          <p className="text-lg text-purple-700">Winner:</p>
          <p className="text-2xl font-bold text-purple-900">
            {winner.participantName}
            {isCurrentUserWinner && ' (You!)'}
          </p>
          <p className="text-purple-600">
            {winner.wins} {winner.wins === 1 ? 'win' : 'wins'}
          </p>
        </div>
      )}

      <div className="bg-white/50 rounded-lg p-4">
        <h3 className="font-semibold text-gray-700 mb-3">Final Standings</h3>
        <div className="space-y-2">
          {leaderboard.slice(0, 5).map((entry, index) => {
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
            const isCurrentUser = entry.participantId === currentUserId;

            return (
              <div
                key={entry.participantId}
                className={`flex items-center justify-between p-2 rounded ${
                  isCurrentUser ? 'bg-purple-100' : ''
                }`}
              >
                <span className={isCurrentUser ? 'font-semibold' : ''}>
                  {medal} {index + 1}. {entry.participantName}
                  {isCurrentUser && ' (you)'}
                </span>
                <span className="font-bold">{entry.wins}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
